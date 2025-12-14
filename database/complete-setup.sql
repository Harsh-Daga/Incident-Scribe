-- ============================================================================
-- INCIDENT SCRIBE - Complete Database Setup
-- ============================================================================
-- 
-- This is the ONLY file you need to run for a fresh Supabase setup.
-- Run this entire file in the Supabase SQL Editor.
--
-- AFTER running this script:
-- 1. Create users via Supabase Dashboard (Authentication → Users → Add User)
-- 2. Then run the user setup queries at the bottom
--
-- ============================================================================

-- ============================================================================
-- PART 1: BASE SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  webhook_key VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,  -- This will match auth.users.id
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  is_platform_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  service VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  title TEXT NOT NULL,
  description TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(external_id, organization_id)
);

-- AI Analysis results
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kestra_execution_id VARCHAR(255),
  analysis TEXT,
  root_cause TEXT,
  remediation TEXT,
  documentation TEXT,
  postmortem TEXT,
  runbook TEXT,
  confidence_level VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invite codes for organization signup
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(64) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration (for secrets like Kestra/Gemini keys)
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_organization ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_incident ON ai_analyses(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_organization ON ai_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_org ON invite_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_audit_organization ON audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(created_at DESC);

-- ============================================================================
-- PART 3: TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: SECURITY DEFINER FUNCTIONS (bypass RLS for policy checks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;

-- Atomic invite code usage function (prevents race conditions)
CREATE OR REPLACE FUNCTION public.use_invite_code(invite_code TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id UUID;
  v_max_uses INTEGER;
  v_current_uses INTEGER;
BEGIN
  -- Lock the row and get current state
  SELECT id, max_uses, current_uses INTO v_invite_id, v_max_uses, v_current_uses
  FROM invite_codes
  WHERE code = invite_code AND active = true
  FOR UPDATE;

  IF v_invite_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if max uses would be exceeded
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
    RETURN false;
  END IF;

  -- Atomically increment and potentially deactivate
  UPDATE invite_codes
  SET 
    current_uses = current_uses + 1,
    active = CASE 
      WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN false 
      ELSE active 
    END
  WHERE id = v_invite_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_invite_code(TEXT) TO anon;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS users_self ON users;
DROP POLICY IF EXISTS users_same_org ON users;
DROP POLICY IF EXISTS users_platform_admin ON users;
DROP POLICY IF EXISTS organizations_own_org ON organizations;
DROP POLICY IF EXISTS organizations_platform_admin ON organizations;
DROP POLICY IF EXISTS incidents_org_users ON incidents;
DROP POLICY IF EXISTS incidents_platform_admin ON incidents;
DROP POLICY IF EXISTS ai_analyses_org_users ON ai_analyses;
DROP POLICY IF EXISTS ai_analyses_platform_admin ON ai_analyses;
DROP POLICY IF EXISTS invite_codes_org_admin ON invite_codes;
DROP POLICY IF EXISTS invite_codes_platform_admin ON invite_codes;
DROP POLICY IF EXISTS invite_codes_signup_validation ON invite_codes;
DROP POLICY IF EXISTS system_config_platform_admin ON system_config;
DROP POLICY IF EXISTS system_config_read_authenticated ON system_config;

-- Users policies
CREATE POLICY "users_self" ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_same_org" ON users FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id = public.get_user_organization_id()
  );

CREATE POLICY "users_platform_admin" ON users FOR ALL
  USING (public.is_platform_admin() = true);

-- Organizations policies
CREATE POLICY "organizations_platform_admin" ON organizations FOR ALL
  USING (public.is_platform_admin() = true);

CREATE POLICY "organizations_own_org" ON organizations FOR SELECT
  USING (id = public.get_user_organization_id());

-- Incidents policies
CREATE POLICY "incidents_platform_admin" ON incidents FOR ALL
  USING (public.is_platform_admin() = true);

CREATE POLICY "incidents_org_users" ON incidents FOR ALL
  USING (
    organization_id IS NOT NULL 
    AND organization_id = public.get_user_organization_id()
  );

-- AI Analyses policies
CREATE POLICY "ai_analyses_platform_admin" ON ai_analyses FOR ALL
  USING (public.is_platform_admin() = true);

CREATE POLICY "ai_analyses_org_users" ON ai_analyses FOR ALL
  USING (
    organization_id IS NOT NULL 
    AND organization_id = public.get_user_organization_id()
  );

-- Invite codes policies
CREATE POLICY "invite_codes_platform_admin" ON invite_codes FOR SELECT
  USING (public.is_platform_admin() = true);

CREATE POLICY "invite_codes_org_admin" ON invite_codes FOR ALL
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "invite_codes_signup_validation" ON invite_codes FOR SELECT
  USING (active = true);

-- System config policies
CREATE POLICY "system_config_platform_admin" ON system_config FOR ALL
  USING (public.is_platform_admin() = true);

CREATE POLICY "system_config_read_authenticated" ON system_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Audit log policies
DROP POLICY IF EXISTS audit_log_org_users ON audit_log;
DROP POLICY IF EXISTS audit_log_platform_admin ON audit_log;

CREATE POLICY "audit_log_platform_admin" ON audit_log FOR ALL
  USING (public.is_platform_admin() = true);

CREATE POLICY "audit_log_org_users" ON audit_log FOR SELECT
  USING (organization_id = public.get_user_organization_id());

-- ============================================================================
-- PART 6: INITIAL SYSTEM CONFIGURATION
-- ============================================================================

INSERT INTO system_config (key, value, description, is_secret) VALUES
  ('KESTRA_URL', 'http://localhost:8080', 'Kestra server URL', false),
  ('KESTRA_USERNAME', '', 'Kestra username (leave empty if no auth)', true),
  ('KESTRA_PASSWORD', '', 'Kestra password (leave empty if no auth)', true),
  ('GEMINI_API_KEY', '', 'Google Gemini API key for AI analysis', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 7: DEMO ORGANIZATION
-- ============================================================================

INSERT INTO organizations (id, name, slug, webhook_key, settings)
VALUES (
  gen_random_uuid(),
  'Demo Company',
  'demo-company',
  encode(gen_random_bytes(32), 'hex'),
  '{"alert_channels": ["email", "slack"]}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 8: SAMPLE INCIDENTS (for demo)
-- ============================================================================

-- Note: UNIQUE(external_id, organization_id) is already defined in table creation (line 61)

-- Insert sample incidents for Demo Company
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-company';
  
  IF v_org_id IS NOT NULL THEN
    INSERT INTO incidents (external_id, source, timestamp, service, severity, status, title, description, logs, metrics, context, organization_id)
    VALUES 
      ('INC-001', 'datadog', NOW() - INTERVAL '2 hours', 'payment-api', 'HIGH', 'open',
       'High Error Rate in Payment Processing', 
       'Error rate exceeded 45% threshold for payment-api service',
       '["ERROR: Database connection timeout after 30s", "ERROR: Connection refused to payment-db-primary:5432", "WARN: Circuit breaker opened for database connections"]'::jsonb,
       '{"error_rate": 0.45, "latency_p95_ms": 2500, "requests_per_sec": 120}'::jsonb,
       '{"host": "prod-api-3", "region": "us-east-1", "version": "v2.3.1"}'::jsonb,
       v_org_id),
       
      ('INC-002', 'pagerduty', NOW() - INTERVAL '4 hours', 'auth-service', 'CRITICAL', 'investigating',
       'Authentication Service Completely Down', 
       'All authentication requests failing with 503 errors',
       '["CRITICAL: Redis cluster unreachable", "ERROR: Session validation failed", "ERROR: Fallback to database failed"]'::jsonb,
       '{"error_rate": 1.0, "latency_p95_ms": 30000, "requests_per_sec": 500}'::jsonb,
       '{"host": "auth-cluster-1", "region": "us-east-1", "version": "v1.8.0"}'::jsonb,
       v_org_id),
       
      ('INC-003', 'cloudwatch', NOW() - INTERVAL '6 hours', 'inventory-service', 'MEDIUM', 'resolved',
       'Elevated Latency in Inventory Lookups', 
       'P95 latency increased to 800ms, above 500ms threshold',
       '["WARN: Slow query detected - inventory lookup took 1.2s", "INFO: Query plan using sequential scan"]'::jsonb,
       '{"error_rate": 0.02, "latency_p95_ms": 800, "requests_per_sec": 200}'::jsonb,
       '{"host": "inv-service-2", "region": "us-west-2", "version": "v3.1.0"}'::jsonb,
       v_org_id),
       
      ('INC-004', 'prometheus', NOW() - INTERVAL '12 hours', 'notification-service', 'LOW', 'resolved',
       'Email Queue Backlog Building Up', 
       'Email notification queue depth exceeded 1000 messages',
       '["INFO: Queue depth at 1200 messages", "WARN: Email send rate below target"]'::jsonb,
       '{"error_rate": 0.001, "latency_p95_ms": 150, "queue_depth": 1200}'::jsonb,
       '{"host": "notify-worker-1", "region": "eu-west-1", "version": "v2.0.5"}'::jsonb,
       v_org_id),
       
      ('INC-005', 'datadog', NOW() - INTERVAL '1 hour', 'api-gateway', 'HIGH', 'open',
       'Rate Limiting Triggered on API Gateway', 
       'Multiple endpoints hitting rate limits, affecting user experience',
       '["WARN: Rate limit exceeded for /api/v1/products endpoint", "ERROR: 429 Too Many Requests returned to 150 clients"]'::jsonb,
       '{"error_rate": 0.15, "latency_p95_ms": 50, "requests_per_sec": 5000}'::jsonb,
       '{"host": "gateway-lb-1", "region": "us-east-1", "version": "v4.2.0"}'::jsonb,
       v_org_id)
    ON CONFLICT (external_id, organization_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Update system_config with your actual values:
--    UPDATE system_config SET value = 'your-value' WHERE key = 'GEMINI_API_KEY';
--    UPDATE system_config SET value = 'http://your-kestra:8080' WHERE key = 'KESTRA_URL';
--
-- 2. Create users via Supabase Dashboard (Authentication → Users → Add User)
--
-- 3. After creating users in Dashboard, run queries like:
--    INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
--    SELECT id, email, 'User Name', NULL, 'admin', true
--    FROM auth.users WHERE email = 'admin@yourcompany.com';
--
-- 4. Get your webhook key for data ingestion:
--    SELECT webhook_key FROM organizations WHERE slug = 'demo-company';

