# Setup Guide

Complete guide to setting up IncidentScribe AI from scratch.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Docker** - [Download](https://docker.com/) (for Kestra)
- **Supabase Account** - [Sign up](https://supabase.com/) (free tier works)
- **Gemini API Key** - [Get key](https://makersuite.google.com/app/apikey) (free tier available)

## Step 1: Clone Repository

```bash
git clone https://github.com/Harsh-Daga/Incident-Scribe.git
cd incident-scribe
```

## Step 2: Setup Supabase

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (~2 minutes)
3. Note down your project URL and keys from **Settings → API**

### 2.2 Run Database Setup

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the entire contents of `database/complete-setup.sql`
3. Click **Run** to execute

This creates:
- All required tables (organizations, users, incidents, ai_analyses, etc.)
- Row Level Security policies
- Helper functions for RLS
- Demo organization with sample incidents

### 2.3 Configure System Settings

Run in SQL Editor:

```sql
-- Set your Gemini API key
UPDATE system_config SET value = 'YOUR_GEMINI_API_KEY' WHERE key = 'GEMINI_API_KEY';

-- Set Kestra URL (use ngrok URL for production)
UPDATE system_config SET value = 'http://localhost:8080' WHERE key = 'KESTRA_URL';

-- Optional: Kestra authentication
UPDATE system_config SET value = 'admin@kestra.io' WHERE key = 'KESTRA_USERNAME';
UPDATE system_config SET value = 'kestra' WHERE key = 'KESTRA_PASSWORD';
```

### 2.4 Create Users

1. Go to **Authentication → Users → Add User**
2. Create users with email/password:
   - `admin@incidentscribe.com` (Platform Admin)
   - `admin@democompany.com` (Org Admin)

3. Link users to the system (SQL Editor):

```sql
-- Platform Admin (no organization)
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT id, email, 'Platform Admin', NULL, 'admin', true
FROM auth.users WHERE email = 'admin@incidentscribe.com';

-- Org Admin (linked to Demo Company)
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT u.id, u.email, 'Demo Admin', o.id, 'admin', false
FROM auth.users u, organizations o 
WHERE u.email = 'admin@democompany.com' AND o.slug = 'demo-company';
```

## Step 3: Setup Kestra

### 3.1 Start Kestra

```bash
cd incident-scribe
docker compose up -d
```

Wait ~30 seconds for Kestra to start, then access http://localhost:8080

### 3.2 Configure Namespace

1. Go to **Namespaces** → **Create**
2. Enter `incident.response` as the namespace ID
3. Save

### 3.3 Create Workflow

1. Go to **Flows** → **Create**
2. Copy the entire contents of `kestra/flows/incident-handler.yml`
3. Paste and save

### 3.4 Configure KV Store

1. Go to **Namespaces** → `incident.response` → **KV Store**
2. Add key: `GEMINI_API_KEY` with your Gemini API key value

## Step 4: Setup Frontend

### 4.1 Install Dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4.3 Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Verify Setup

### 5.1 Login

1. Go to http://localhost:3000/login
2. Login with `admin@democompany.com` and your password
3. You should see the dashboard with sample incidents

### 5.2 Test AI Analysis

1. Click on any incident
2. Click **Run AI Analysis**
3. Wait for Kestra workflow to complete
4. View the AI-generated analysis, remediation, and documentation

### 5.3 Test Webhook

Get your webhook key:

```sql
SELECT webhook_key FROM organizations WHERE slug = 'demo-company';
```

Send a test incident:

```bash
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=generic&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Incident",
    "service": "test-service",
    "severity": "MEDIUM",
    "logs": ["Test log message"]
  }'
```

## Troubleshooting

### "Database error querying schema"

Run the RLS fix:

```sql
-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM public.users WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, anon;
```

### Kestra workflow not triggering

1. Check Kestra is running: http://localhost:8080
2. Verify workflow is created in `incident.response` namespace
3. Check KV Store has `GEMINI_API_KEY`

### AI Analysis not working

1. Verify Gemini API key in `system_config` table
2. Check browser console for errors
3. Ensure you're logged in

## Next Steps

- [Architecture Guide](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Webhook Integration](./WEBHOOKS.md)

