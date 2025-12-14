# IncidentScribe AI

AI-powered incident management system with **autonomous multi-agent analysis**, **automated remediation**, and **intelligent workflow orchestration** powered by Kestra, Supabase, and Google Gemini.

Built for the **AI Agents Assemble Hackathon** 🏆

![Dashboard](https://img.shields.io/badge/Frontend-Next.js%2015-black)
![Kestra](https://img.shields.io/badge/Orchestration-Kestra-purple)
![Supabase](https://img.shields.io/badge/Database-Supabase-green)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5-blue)

## 🎯 What It Does

IncidentScribe AI transforms incident management from reactive firefighting to proactive, AI-assisted resolution:

1. **Ingest** - Receives incidents from monitoring tools (Datadog, PagerDuty, CloudWatch, etc.)
2. **Analyze** - AI agents analyze logs, metrics, and context to identify root cause
3. **Remediate** - Generates actionable remediation steps with safe commands
4. **Document** - Creates comprehensive post-mortem documentation automatically
5. **Learn** - Stores analysis for future reference and pattern recognition

## ✨ Key Features

### 🔐 Multi-Tenant Authentication
- **Supabase Auth** with JWT tokens
- **Organization Isolation** - Users only see their organization's data
- **Row Level Security (RLS)** - Database-enforced data isolation
- **Role-Based Access** - Platform Admin → Org Admin → Member → Viewer
- **Invite Code System** - Secure user onboarding

### 🤖 AI-Powered Analysis
- **Multi-Agent Kestra Workflow** - Specialized agents for analysis, remediation, documentation
- **Google Gemini 2.5 Flash** - Fast, accurate incident analysis
- **Real-Time Streaming** - Live AI analysis via Vercel AI SDK
- **Markdown Rendering** - Beautiful, structured analysis output
- **Persistent Results** - AI analysis saved to database

### 🔄 Kestra Workflow Orchestration
- **Severity-Based Routing** - LOW→auto-fix, MEDIUM→approval, HIGH→escalate
- **Multi-Source Data Aggregation** - Logs, metrics, historical incidents
- **Webhook Trigger** - Auto-triggers on high/critical incidents
- **KV Store Secrets** - Secure credential management

### 📡 Webhook Ingestion
- **Multiple Sources** - Datadog, PagerDuty, CloudWatch, Prometheus, Generic
- **Organization Isolation** - Webhook key per organization
- **Idempotency** - Prevents duplicate incidents
- **Auto-Trigger Kestra** - HIGH/CRITICAL incidents trigger AI analysis

### 💻 CLI Tool
- **8 Commands** - analyze, batch-analyze, runbook, correlate, trigger, export, auto-fix, replay
- **Guardrails** - Allowlisted commands, dry-run mode
- **Rich Output** - Colorful terminal output with progress indicators

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (for Kestra)
- Supabase account (free tier works)
- Gemini API key (free tier available)

### 1. Clone Repository

```bash
git clone https://github.com/Harsh-Daga/Incident-Scribe.git
cd incident-scribe
```

### 2. Setup Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `database/complete-setup.sql`
3. Update system config with your values:

```sql
UPDATE system_config SET value = 'YOUR_GEMINI_API_KEY' WHERE key = 'GEMINI_API_KEY';
UPDATE system_config SET value = 'http://localhost:8080' WHERE key = 'KESTRA_URL';
UPDATE system_config SET value = 'admin@kestra.io' WHERE key = 'KESTRA_USERNAME';
UPDATE system_config SET value = 'kestra' WHERE key = 'KESTRA_PASSWORD';
```

4. Create users via **Authentication → Users → Add User**:
   - `admin@incidentscribe.com` (Platform Admin)
   - `admin@democompany.com` (Org Admin)

5. Link users to the system:

```sql
-- Platform Admin
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT id, email, 'Platform Admin', NULL, 'admin', true
FROM auth.users WHERE email = 'admin@incidentscribe.com';

-- Org Admin (get org ID first)
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT u.id, u.email, 'Demo Admin', o.id, 'admin', false
FROM auth.users u, organizations o 
WHERE u.email = 'admin@democompany.com' AND o.slug = 'demo-company';
```

### 3. Configure Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Start Kestra

```bash
cd ..
docker compose up -d
```

Access Kestra at http://localhost:8080

Configure Kestra:
1. Go to **Namespaces → Create** → `incident.response`
2. Go to **Flows → Create** → Paste content from `kestra/flows/incident-handler.yml`
3. Go to **KV Store** → Add `GEMINI_API_KEY` with your API key

### 5. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and login!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      INCIDENT SCRIBE                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Monitoring  │────▶│   Webhook    │────▶│   Supabase   │
  │    Tools     │     │   Ingestion  │     │   Database   │
  │              │     │              │     │              │
  │ • Datadog    │     │ • Normalize  │     │ • incidents  │
  │ • PagerDuty  │     │ • Validate   │     │ • users      │
  │ • CloudWatch │     │ • Dedupe     │     │ • orgs       │
  │ • Prometheus │     │              │     │ • ai_analyses│
  └──────────────┘     └──────────────┘     └──────────────┘
                              │                     │
                              ▼                     ▼
                       ┌──────────────┐     ┌──────────────┐
                       │    Kestra    │◀────│   Next.js    │
                       │   Workflow   │     │   Frontend   │
                       │              │     │              │
                       │ • AI Agents  │     │ • Dashboard  │
                       │ • Analysis   │     │ • Auth (RLS) │
                       │ • Decision   │     │ • Streaming  │
                       │ • Remediate  │     │ • Markdown   │
                       └──────────────┘     └──────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Gemini AI   │
                       │              │
                       │ • Analysis   │
                       │ • Remediation│
                       │ • Postmortem │
                       └──────────────┘
```

## 📂 Project Structure

```
incident-scribe/
├── frontend/                 # Next.js 15 application
│   ├── app/                  # App router pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── incident/[id]/    # Incident detail page
│   │   ├── login/            # Auth pages
│   │   └── api/              # API routes
│   ├── components/           # React components
│   └── lib/                  # Utilities & clients
├── kestra/
│   └── flows/                # Kestra workflow definitions
├── cli/                      # CLI tool
├── database/                 # SQL setup scripts
└── docker-compose.yml        # Kestra Docker setup
```

## 🔌 API Endpoints

### Webhook Ingestion

```bash
# Datadog
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=datadog&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "High CPU", "priority": "high", "tags": ["service:api"]}'

# PagerDuty
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=pagerduty&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"incident": {"title": "Service Down", "urgency": "high"}}]}'

# Generic
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=generic&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Database Slow", "service": "postgres", "severity": "HIGH"}'
```

Get your webhook key:
```sql
SELECT webhook_key FROM organizations WHERE slug = 'demo-company';
```

### Protected Routes (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | List incidents |
| GET | `/api/incidents/:id` | Get incident details |
| POST | `/api/analyze` | Stream AI analysis |
| POST | `/api/kestra/trigger` | Trigger Kestra workflow |
| POST | `/api/analysis/save` | Save AI analysis |

## 💻 CLI Usage

```bash
cd cli && npm install

# Analyze single incident
node index.js analyze INC-001

# Batch analyze multiple
node index.js batch-analyze INC-001 INC-002 INC-003

# Generate runbook
node index.js runbook INC-001

# Find related incidents
node index.js correlate INC-001

# Trigger Kestra workflow
node index.js trigger INC-001

# Export incident data
node index.js export INC-001 --format json
```

## 🔒 Security

### Role Hierarchy
- **Platform Admin** - Create organizations, system-wide access
- **Org Admin** - Manage users, generate invite codes, see webhook key
- **Member** - Full incident management
- **Viewer** - Read-only access

### Row Level Security
All tables have RLS policies ensuring:
- Users only see their organization's data
- Platform admins have cross-org access
- Webhook ingestion uses organization-specific keys

## 🌐 Environment Variables

### Frontend (`.env.local`)
```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### System Config (stored in Supabase)
These are stored in the `system_config` table:
- `KESTRA_URL` - Kestra server URL
- `KESTRA_USERNAME` - Kestra auth username
- `KESTRA_PASSWORD` - Kestra auth password
- `GEMINI_API_KEY` - Google Gemini API key

### Kestra KV Store
Configure in Kestra UI → Namespace → `incident.response` → KV Store:
- `GEMINI_API_KEY` - For AI analysis in workflows

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + RLS |
| Orchestration | Kestra |
| AI | Google Gemini 2.5 Flash |
| Streaming | Vercel AI SDK |
| CLI | Node.js, Commander.js |

## 🏆 Hackathon

Built for the **AI Agents Assemble Hackathon** using:
- **Kestra** - Workflow orchestration & AI agents
- **Vercel** - Frontend deployment & AI SDK
- **Cline** - AI-assisted development

## 📄 License

MIT License

---

**Built with ❤️ by [Harsh Daga](https://github.com/Harsh-Daga)**
