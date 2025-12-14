import { createAdminClient } from './supabase-admin';
import { generateInviteCode, generateWebhookKey, generateSlug } from './organizations';

/**
 * Execute raw SQL using Supabase's RPC
 * Note: This requires the sql function to be created in Supabase
 */
export async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  try {
    // Try using RPC if available
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, we'll handle tables individually
      console.log('RPC not available, will create tables via direct API');
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if a table exists in the database
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Check if setup has been completed
 */
export async function checkSetupStatus(): Promise<{
  schemaExists: boolean;
  platformAdminExists: boolean;
  sampleOrgExists: boolean;
  sampleIncidentsExist: boolean;
}> {
  const supabase = createAdminClient();
  
  // Check if incidents table exists
  const schemaExists = await checkTableExists('incidents');
  
  // Check if platform admin exists
  const { data: platformAdmin } = await supabase
    .from('users')
    .select('id')
    .eq('is_platform_admin', true)
    .limit(1);
  
  // Check if sample org exists
  const { data: sampleOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'demo-company')
    .limit(1);
  
  // Check if sample incidents exist
  const { count: incidentCount } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true });
  
  return {
    schemaExists,
    platformAdminExists: (platformAdmin?.length || 0) > 0,
    sampleOrgExists: (sampleOrg?.length || 0) > 0,
    sampleIncidentsExist: (incidentCount || 0) > 0
  };
}

/**
 * Check if platform admin exists
 * Note: Platform admin must be created via Supabase Dashboard or SQL script
 */
export async function checkPlatformAdminExists(): Promise<{ exists: boolean; userId?: string }> {
  const supabase = createAdminClient();
  
  const { data: existingAdmin } = await supabase
    .from('users')
    .select('id')
    .eq('is_platform_admin', true)
    .limit(1);
  
  if (existingAdmin && existingAdmin.length > 0) {
    return { exists: true, userId: existingAdmin[0].id };
  }
  
  return { exists: false };
}

/**
 * Create or get organization
 * Note: Organization admin users must be created via Supabase Dashboard or SQL script
 */
export async function createOrGetOrganization(
  name: string = 'Demo Company',
  slug: string = 'demo-company'
): Promise<{
  success: boolean;
  organizationId?: string;
  webhookKey?: string;
  error?: string;
}> {
  const supabase = createAdminClient();
  
  // Check if org already exists
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id, webhook_key')
    .eq('slug', slug)
    .single();
  
  if (existingOrg) {
    return {
      success: true,
      organizationId: existingOrg.id,
      webhookKey: existingOrg.webhook_key
    };
  }
  
  const webhookKey = generateWebhookKey();
  
  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      webhook_key: webhookKey,
      settings: { alert_channels: ['email', 'slack'] }
    })
    .select()
    .single();
  
  if (orgError || !org) {
    return { success: false, error: orgError?.message || 'Failed to create organization' };
  }
  
  return {
    success: true,
    organizationId: org.id,
    webhookKey
  };
}

/**
 * Check if users exist for an organization
 * Note: Users must be created via Supabase Dashboard or SQL script
 */
export async function checkUsersExist(organizationId: string): Promise<{
  exists: boolean;
  count: number;
}> {
  const supabase = createAdminClient();
  
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  return {
    exists: (count || 0) > 0,
    count: count || 0
  };
}

/**
 * Create sample incidents for the demo organization
 */
export async function createSampleIncidents(organizationId: string): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const supabase = createAdminClient();
  
  // Check if incidents already exist for this org
  const { count: existingCount } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if (existingCount && existingCount > 0) {
    return { success: true, count: existingCount };
  }
  
  const sampleIncidents = [
    {
      external_id: 'INC-001',
      source: 'datadog',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      service: 'payment-api',
      severity: 'HIGH',
      status: 'open',
      title: 'High Error Rate in Payment Processing',
      description: 'Error rate exceeded 45% threshold for payment-api service',
      logs: [
        'ERROR: Database connection timeout after 30s',
        'ERROR: Connection refused to payment-db-primary:5432',
        'WARN: Circuit breaker opened for database connections',
        'ERROR: Transaction failed - unable to complete payment',
        'ERROR: All retries exhausted, returning 503 to clients'
      ],
      metrics: { error_rate: 0.45, latency_p95_ms: 2500, requests_per_sec: 120 },
      context: { host: 'prod-api-3', region: 'us-east-1', version: 'v2.3.1', deployment: 'blue' },
      organization_id: organizationId
    },
    {
      external_id: 'INC-002',
      source: 'pagerduty',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      service: 'auth-service',
      severity: 'CRITICAL',
      status: 'investigating',
      title: 'Authentication Service Completely Down',
      description: 'All authentication requests failing with 503 errors',
      logs: [
        'CRITICAL: Redis cluster unreachable',
        'ERROR: Session validation failed - cache unavailable',
        'ERROR: Fallback to database failed - connection pool exhausted',
        'ALERT: 100% of auth requests failing'
      ],
      metrics: { error_rate: 1.0, latency_p95_ms: 30000, requests_per_sec: 500 },
      context: { host: 'auth-cluster-1', region: 'us-east-1', version: 'v1.8.0', deployment: 'green' },
      organization_id: organizationId
    },
    {
      external_id: 'INC-003',
      source: 'cloudwatch',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      service: 'inventory-service',
      severity: 'MEDIUM',
      status: 'resolved',
      title: 'Elevated Latency in Inventory Lookups',
      description: 'P95 latency increased to 800ms, above 500ms threshold',
      logs: [
        'WARN: Slow query detected - inventory lookup took 1.2s',
        'INFO: Query plan using sequential scan instead of index',
        'WARN: Connection pool reaching 80% capacity'
      ],
      metrics: { error_rate: 0.02, latency_p95_ms: 800, requests_per_sec: 200 },
      context: { host: 'inv-service-2', region: 'us-west-2', version: 'v3.1.0', deployment: 'canary' },
      organization_id: organizationId
    },
    {
      external_id: 'INC-004',
      source: 'prometheus',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      service: 'notification-service',
      severity: 'LOW',
      status: 'resolved',
      title: 'Email Queue Backlog Building Up',
      description: 'Email notification queue depth exceeded 1000 messages',
      logs: [
        'INFO: Queue depth at 1200 messages',
        'WARN: Email send rate below target',
        'INFO: SMTP connection pool scaled up'
      ],
      metrics: { error_rate: 0.001, latency_p95_ms: 150, queue_depth: 1200 },
      context: { host: 'notify-worker-1', region: 'eu-west-1', version: 'v2.0.5', deployment: 'blue' },
      organization_id: organizationId
    },
    {
      external_id: 'INC-005',
      source: 'datadog',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      service: 'api-gateway',
      severity: 'HIGH',
      status: 'open',
      title: 'Rate Limiting Triggered on API Gateway',
      description: 'Multiple endpoints hitting rate limits, affecting user experience',
      logs: [
        'WARN: Rate limit exceeded for /api/v1/products endpoint',
        'ERROR: 429 Too Many Requests returned to 150 clients',
        'WARN: Suspected DDoS or bot traffic detected',
        'INFO: WAF rules triggered for suspicious patterns'
      ],
      metrics: { error_rate: 0.15, latency_p95_ms: 50, requests_per_sec: 5000, rate_limited: 750 },
      context: { host: 'gateway-lb-1', region: 'us-east-1', version: 'v4.2.0', deployment: 'stable' },
      organization_id: organizationId
    }
  ];
  
  const { error } = await supabase.from('incidents').insert(sampleIncidents);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, count: sampleIncidents.length };
}

/**
 * Run all setup steps
 * Note: Users must be created separately via Supabase Dashboard or SQL script
 */
export async function runCompleteSetup(): Promise<{
  success: boolean;
  steps: Array<{ step: string; success: boolean; details?: any; error?: string }>;
}> {
  const steps: Array<{ step: string; success: boolean; details?: any; error?: string }> = [];
  
  // Step 1: Check schema
  const schemaExists = await checkTableExists('incidents');
  steps.push({
    step: 'Check Database Schema',
    success: schemaExists,
    details: { schemaExists },
    error: schemaExists ? undefined : 'Schema not found - please run migrations in Supabase SQL Editor first'
  });
  
  if (!schemaExists) {
    return { success: false, steps };
  }
  
  // Step 2: Check platform admin exists
  const platformAdminCheck = await checkPlatformAdminExists();
  steps.push({
    step: 'Check Platform Admin',
    success: platformAdminCheck.exists,
    details: platformAdminCheck.exists ? { userId: platformAdminCheck.userId } : undefined,
    error: platformAdminCheck.exists ? undefined : 'Platform admin not found - please run the SQL setup script first'
  });
  
  // Step 3: Create or get sample organization
  const orgResult = await createOrGetOrganization();
  steps.push({
    step: 'Create/Get Organization',
    success: orgResult.success,
    details: orgResult.success ? {
      organizationId: orgResult.organizationId,
      webhookKey: orgResult.webhookKey
    } : undefined,
    error: orgResult.error
  });
  
  if (!orgResult.success || !orgResult.organizationId) {
    return { success: false, steps };
  }
  
  // Step 4: Check users exist
  const usersCheck = await checkUsersExist(orgResult.organizationId);
  steps.push({
    step: 'Check Organization Users',
    success: usersCheck.exists,
    details: { userCount: usersCheck.count },
    error: usersCheck.exists ? undefined : 'No users found - please run the SQL setup script to create users'
  });
  
  // Step 5: Create sample incidents
  const incidentsResult = await createSampleIncidents(orgResult.organizationId);
  steps.push({
    step: 'Create Sample Incidents',
    success: incidentsResult.success,
    details: { count: incidentsResult.count },
    error: incidentsResult.error
  });
  
  // All steps except user checks need to succeed
  const criticalSteps = steps.filter(s => 
    s.step === 'Check Database Schema' || 
    s.step === 'Create/Get Organization' ||
    s.step === 'Create Sample Incidents'
  );
  const allSuccess = criticalSteps.every(s => s.success);
  
  return { success: allSuccess, steps };
}

