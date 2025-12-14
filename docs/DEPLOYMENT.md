# Deployment Guide

Deploy IncidentScribe AI to production using Vercel and Supabase.

## Prerequisites

- GitHub account with repository pushed
- Vercel account (free tier works)
- Supabase project configured
- Gemini API key

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vercel    │◀──▶│  Supabase   │◀──▶│   Kestra    │
│  (Frontend) │    │  (Database) │    │  (Workflow) │
│             │    │             │    │             │
│  Next.js    │    │  PostgreSQL │    │  ngrok or   │
│  API Routes │    │  Auth + RLS │    │  Cloud      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼
                   ┌─────────────┐
                   │  Gemini AI  │
                   │   (Cloud)   │
                   └─────────────┘
```

## Step 1: Prepare Supabase

### 1.1 Run Production Setup

In Supabase SQL Editor, run `database/complete-setup.sql`.

### 1.2 Update System Config

```sql
-- Your production Gemini API key
UPDATE system_config 
SET value = 'YOUR_GEMINI_API_KEY' 
WHERE key = 'GEMINI_API_KEY';

-- Kestra URL (ngrok or cloud)
UPDATE system_config 
SET value = 'https://your-kestra.ngrok-free.app' 
WHERE key = 'KESTRA_URL';

-- Kestra credentials
UPDATE system_config 
SET value = 'admin@kestra.io' 
WHERE key = 'KESTRA_USERNAME';

UPDATE system_config 
SET value = 'your-secure-password' 
WHERE key = 'KESTRA_PASSWORD';
```

### 1.3 Create Production Users

Via Supabase Dashboard → Authentication → Users:
1. Create platform admin
2. Create organization admins

Then link them:

```sql
-- Link platform admin
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT id, email, 'Platform Admin', NULL, 'admin', true
FROM auth.users WHERE email = 'admin@yourcompany.com';
```

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your GitHub repository
4. Select the `frontend` directory as the root

### 2.2 Configure Environment Variables

In Vercel project settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |

### 2.3 Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Build the Next.js app
3. Deploy to edge network

Your app will be available at `https://your-project.vercel.app`

## Step 3: Setup Kestra for Production

### Option A: ngrok (Quick Setup)

Best for demos and testing.

```bash
# On your local machine with Kestra running
ngrok http 8080
```

Note the URL (e.g., `https://abc123.ngrok-free.app`)

Update Supabase:
```sql
UPDATE system_config 
SET value = 'https://abc123.ngrok-free.app' 
WHERE key = 'KESTRA_URL';
```

**Limitations:**
- URL changes on ngrok restart
- Requires local machine running
- Free tier has connection limits

### Option B: Cloud VM

Deploy Kestra on a cloud VM for production.

**AWS EC2:**
```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-instance

# Install Docker
sudo apt update && sudo apt install docker.io docker-compose -y

# Clone and start
git clone https://github.com/Harsh-Daga/Incident-Scribe.git
cd incident-scribe
docker compose up -d
```

Configure security group to allow port 8080.

**DigitalOcean:**
```bash
# Create droplet with Docker
# SSH in and run same commands as above
```

### Option C: Kestra Cloud

For fully managed Kestra:
1. Sign up at [kestra.io/cloud](https://kestra.io/cloud)
2. Create namespace `incident.response`
3. Import workflow
4. Configure KV Store
5. Use provided URL in system_config

## Step 4: Configure Webhooks

### Update Webhook URLs

Your webhook endpoint is now:
```
https://your-project.vercel.app/api/webhooks/ingest?source=<source>&key=<key>
```

Update your monitoring tools:

**Datadog:**
```
https://your-project.vercel.app/api/webhooks/ingest?source=datadog&key=YOUR_KEY
```

**PagerDuty:**
```
https://your-project.vercel.app/api/webhooks/ingest?source=pagerduty&key=YOUR_KEY
```

### Test Webhook

```bash
curl -X POST "https://your-project.vercel.app/api/webhooks/ingest?source=generic&key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "service": "test", "severity": "LOW"}'
```

## Step 5: Verify Deployment

### Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Login works with created users
- [ ] Incidents appear in dashboard
- [ ] AI analysis works (Gemini)
- [ ] Kestra workflow triggers (if configured)
- [ ] Webhook ingestion works

### Test Commands

```bash
# Test frontend
curl https://your-project.vercel.app/api/incidents

# Test webhook
curl -X POST "https://your-project.vercel.app/api/webhooks/ingest?source=generic&key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Production Test", "service": "test", "severity": "LOW"}'
```

## Custom Domain

### Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `incidents.yourcompany.com`)
3. Configure DNS as instructed

### Update Supabase Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Add `https://incidents.yourcompany.com/**` to redirect URLs

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics for:
- Page views
- Web Vitals
- Error tracking

### Supabase Logs

Check Supabase Dashboard → Logs for:
- Database queries
- Auth events
- API requests

### Error Alerts

Set up alerts in:
- Vercel for deployment failures
- Supabase for database issues
- Your monitoring tool for incidents

## Security Checklist

- [ ] Use strong passwords for all accounts
- [ ] Rotate Gemini API key periodically
- [ ] Review Supabase RLS policies
- [ ] Enable Vercel password protection (optional)
- [ ] Use HTTPS for Kestra (ngrok provides this)
- [ ] Restrict Kestra access to Vercel IPs only

## Troubleshooting

### API Routes Return 500

1. Check Vercel function logs
2. Verify environment variables are set
3. Ensure Supabase service role key is correct

### Kestra Workflow Not Triggering

1. Verify Kestra URL in system_config
2. Check ngrok is running (if using)
3. Verify Kestra credentials
4. Check Kestra logs for errors

### Authentication Errors

1. Verify Supabase URL and keys
2. Check redirect URLs in Supabase
3. Clear browser cookies and retry

### Webhook Failures

1. Check webhook key is valid
2. Verify organization exists
3. Check Vercel function logs

## Scaling

### Vercel

Vercel automatically scales:
- Edge network for static assets
- Serverless functions for API

For high traffic:
- Consider Vercel Pro for higher limits
- Enable caching headers

### Supabase

For high database load:
- Upgrade to Pro plan
- Enable connection pooling
- Add read replicas

### Kestra

For workflow scaling:
- Use Kestra Cloud for auto-scaling
- Or deploy Kestra cluster on Kubernetes

