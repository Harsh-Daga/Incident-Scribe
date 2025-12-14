# 🚨 IncidentScribe AI

**AI-Powered Incident Management with Autonomous Multi-Agent Analysis**

Transform incident management from reactive firefighting to proactive, AI-assisted resolution with real-time streaming analysis, automated remediation, and intelligent documentation.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Kestra](https://img.shields.io/badge/Kestra-Latest-8B5CF6?style=flat-square)](https://kestra.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [API](#api-reference) • [Documentation](#documentation)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**IncidentScribe AI** is a production-ready, enterprise-grade incident management platform that leverages multi-agent AI orchestration to automatically analyze, remediate, and document production incidents.

### The Problem

Traditional incident management is:
- ⏰ **Reactive** - Teams scramble to diagnose issues during outages
- 📊 **Manual** - Engineers waste hours sifting through logs and metrics
- 📝 **Undocumented** - Knowledge is lost after incidents are resolved
- 🔄 **Repetitive** - Same issues recur without proper root cause analysis

### The Solution

IncidentScribe AI provides:
- 🤖 **Autonomous Analysis** - AI agents automatically diagnose root causes
- ⚡ **Real-Time Insights** - Streaming analysis powered by Google Gemini
- 📋 **Automatic Documentation** - Post-mortems generated instantly
- 🧠 **Learning System** - Historical context for pattern recognition
- 🔐 **Enterprise Security** - Multi-tenant with row-level security

---

## ✨ Features

### 🔐 Enterprise Authentication & Multi-Tenancy

- **Supabase Auth Integration**
  - JWT-based authentication with httpOnly cookies
  - Email/password authentication (OAuth providers ready)
  - Automatic session refresh and management
  - Password reset and email verification

- **Organization Isolation**
  - Database-enforced data isolation via Row Level Security (RLS)
  - Users automatically scoped to their organization
  - No cross-organization data leakage
  - Webhook authentication per organization

- **Role-Based Access Control (RBAC)**
  ```
  Platform Admin → Full system access, create organizations
  Org Admin      → Manage users, view webhook keys, generate invite codes
  Member         → Full incident management and analysis
  Viewer         → Read-only access to incidents
  ```

- **Invite Code System**
  - Secure user onboarding with time-limited codes
  - Pre-defined role assignment
  - Track code usage and expiration

### 🤖 AI-Powered Multi-Agent Analysis

- **Google Gemini 2.5 Flash Integration**
  - Fast, accurate incident analysis
  - Context-aware remediation suggestions
  - Root cause identification
  - Impact assessment

- **Real-Time Streaming Analysis**
  - Live AI responses via Vercel AI SDK
  - Progressive markdown rendering
  - Syntax-highlighted code blocks
  - Structured JSON output

- **Multi-Agent Kestra Workflow**
  ```
  Analyzer Agent     → Diagnoses root cause from logs/metrics
  Remediation Agent  → Generates safe, actionable fix commands
  Documentation Agent → Creates comprehensive post-mortems
  Correlation Agent  → Finds related historical incidents
  ```

- **Persistent Knowledge Base**
  - All analyses saved to database
  - Searchable incident history
  - Pattern recognition over time
  - Continuous learning from past incidents

### 🔄 Intelligent Workflow Orchestration

- **Kestra-Powered Automation**
  - Webhook triggers for automatic analysis
  - Severity-based routing logic
  - Multi-source data aggregation
  - Parallel execution of analysis tasks

- **Decision Engine**
  ```
  LOW severity      → Auto-fix suggestions, optional approval
  MEDIUM severity   → Manual review required before remediation
  HIGH severity     → Immediate escalation + AI analysis
  CRITICAL severity → All hands on deck + executive notification
  ```

- **Secure Credential Management**
  - Kestra KV Store for secrets
  - Environment-based configuration
  - No hardcoded credentials
  - Rotation-ready architecture

### 📡 Universal Webhook Ingestion

- **Multi-Source Support**
  - **Datadog** - Full alert payload normalization
  - **PagerDuty** - Incident webhook parsing
  - **AWS CloudWatch** - Alarm event handling
  - **Prometheus** - AlertManager integration
  - **Generic** - Custom JSON payloads

- **Smart Processing**
  - Idempotency via external IDs
  - Duplicate detection
  - Payload normalization
  - Auto-tagging by severity

### 💻 Command-Line Interface

**8 Powerful Commands:**

```bash
analyze         → Single incident AI analysis
batch-analyze   → Analyze multiple incidents concurrently
runbook         → Generate operational runbooks
correlate       → Find related incidents
trigger         → Manually trigger Kestra workflows
export          → Export incident data (JSON/CSV/Markdown)
auto-fix        → Apply safe remediation commands
replay          → Re-run analysis with updated context
```

**Safety Features:**
- Command allowlisting
- Dry-run mode for testing
- Confirmation prompts for destructive actions
- Audit logging

### 🎨 Mission Control UI

- **Dark Terminal Aesthetic**
  - Brutalist design principles
  - Glassmorphism effects
  - Neon accent colors (cyan, magenta, amber)
  - JetBrains Mono + DM Sans typography

- **Real-Time Dashboard**
  - Live incident feed
  - Severity distribution charts
  - Status breakdowns
  - Service health metrics

- **Interactive Incident Details**
  - Expandable log viewer
  - Metrics visualization with Recharts
  - Timeline of events
  - Related incidents graph

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                       INCIDENTSCRIBE AI                               │
│                  Multi-Tenant Incident Management                     │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐                      ┌─────────────────┐
│  Monitoring     │                      │   Next.js 16    │
│  Platforms      │                      │   Frontend      │
│                 │                      │                 │
│ • Datadog       │                      │ • React 19      │
│ • PagerDuty     │                      │ • Tailwind CSS  │
│ • CloudWatch    │                      │ • Lucide Icons  │
│ • Prometheus    │                      │ • Recharts      │
│ • Custom Tools  │                      │ • TypeScript 5  │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │ Webhooks                               │ Auth
         ▼                                        ▼
┌─────────────────────────────────────────────────────────┐
│              Webhook Ingestion Layer                    │
│  • Payload Normalization  • Deduplication               │
│  • Organization Routing   • Severity Classification     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────┐
│                   Supabase Backend                         │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │ Supabase Auth│  │  Row Level   │    │
│  │   Database   │  │   (JWT)      │  │   Security   │    │
│  │              │  │              │  │   (RLS)      │    │
│  │ • incidents  │  │ • OAuth 2.0  │  │ • Per-org    │    │
│  │ • ai_analyses│  │ • Sessions   │  │ • Automatic  │    │
│  │ • users      │  │ • Refresh    │  │ • Enforced   │    │
│  │ • orgs       │  │ • Middleware │  │ • Audited    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────┬────────────────┬────────────────────────────── ┘
            │                │
            │                └──────────────┐
            ▼                               ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Kestra Workflows   │          │   Vercel AI SDK     │
│                     │          │                     │
│ • incident-handler  │          │ • Stream responses  │
│ • auto-remediation  │          │ • Markdown render   │
│ • post-mortem-gen   │          │ • Real-time output  │
│ • correlation       │          │ • Error handling    │
└──────────┬──────────┘          └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Google Gemini 2.5  │
│       Flash         │
│                     │
│ • Root Cause        │
│ • Remediation       │
│ • Impact Analysis   │
│ • Documentation     │
└─────────────────────┘
```

### Data Flow

**1. Incident Ingestion**
- External monitoring tool sends webhook
- Organization identified by webhook key
- Payload normalized to standard format
- Saved to Supabase with org context

**2. AI Analysis Trigger**
- HIGH/CRITICAL incidents auto-trigger Kestra
- User can manually trigger for any incident
- Kestra fetches incident + historical context
- Multi-agent workflow executes in parallel

**3. Analysis Execution**
- Analyzer agent diagnoses root cause
- Remediation agent suggests fixes
- Documentation agent generates post-mortem
- Correlation agent finds related incidents

**4. Result Storage**
- Analysis saved to `ai_analyses` table
- Linked to original incident
- RLS ensures organization isolation
- Searchable for future reference

**5. User Interface**
- Real-time streaming to frontend
- Progressive markdown rendering
- Copy commands, save results
- Trigger follow-up actions

### Security Layers

```
┌───────────────────────────────────────────────────────────┐
│ Layer 1: Next.js Middleware                               │
│ • Validates Supabase Auth JWT tokens                      │
│ • Blocks unauthenticated requests                         │
│ • Refreshes expired sessions automatically                │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│ Layer 2: API Route Authorization                          │
│ • Fetches user organization from auth.uid()               │
│ • Validates RBAC permissions                              │
│ • Organization determined by DATABASE, not user input     │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│ Layer 3: PostgreSQL Row Level Security (RLS)              │
│ • Database-enforced isolation per organization            │
│ • Users CANNOT access other orgs' data                    │
│ • RLS policies apply to ALL queries automatically         │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.0 or higher ([Download](https://nodejs.org/))
- **Docker** & Docker Compose ([Download](https://www.docker.com/))
- **Supabase Account** ([Sign up free](https://supabase.com))
- **Google Gemini API Key** ([Get free key](https://ai.google.dev/))

### Installation

**1. Clone Repository**

```bash
git clone https://github.com/Harsh-Daga/Incident-Scribe.git
cd incident-scribe
```

**2. Setup Supabase Database**

Create a new project at [supabase.com](https://supabase.com), then run the setup script in Supabase SQL Editor:

```sql
-- Go to: Your Project → SQL Editor → New Query
-- Copy and paste contents from: database/complete-setup.sql
-- Click "Run"
```

Configure system settings:

```sql
UPDATE system_config SET value = 'YOUR_GEMINI_API_KEY'
WHERE key = 'GEMINI_API_KEY';

UPDATE system_config SET value = 'http://localhost:8080'
WHERE key = 'KESTRA_URL';

UPDATE system_config SET value = 'admin@kestra.io'
WHERE key = 'KESTRA_USERNAME';

UPDATE system_config SET value = 'kestra'
WHERE key = 'KESTRA_PASSWORD';
```

Create authentication users (Supabase Dashboard → Authentication → Users → Add User):
- Email: `admin@incidentscribe.com`, Password: `Admin123!` (Platform Admin)
- Email: `admin@democompany.com`, Password: `Admin123!` (Org Admin)
- Email: `member@democompany.com`, Password: `Member123!` (Member)
- Email: `viewer@democompany.com`, Password: `Viewer123!` (Viewer)

Link users to database:

```sql
-- Platform Admin
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT id, email, 'Platform Admin', NULL, 'admin', true
FROM auth.users WHERE email = 'admin@incidentscribe.com';

-- Organization Users
INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT u.id, u.email, 'Demo Admin', o.id, 'admin', false
FROM auth.users u, organizations o
WHERE u.email = 'admin@democompany.com' AND o.slug = 'demo-company';

INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT u.id, u.email, 'Demo Member', o.id, 'member', false
FROM auth.users u, organizations o
WHERE u.email = 'member@democompany.com' AND o.slug = 'demo-company';

INSERT INTO public.users (id, email, name, organization_id, role, is_platform_admin)
SELECT u.id, u.email, 'Demo Viewer', o.id, 'viewer', false
FROM auth.users u, organizations o
WHERE u.email = 'viewer@democompany.com' AND o.slug = 'demo-company';
```

**3. Configure Frontend**

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Get these from: Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**4. Start Kestra**

```bash
cd ..
docker compose up -d
```

Wait for Kestra to start (30-60 seconds), then:

1. Access Kestra UI: [http://localhost:8080](http://localhost:8080)
2. Create namespace: Namespaces → Create → Name: `incident.response`
3. Upload workflow: Flows → Create → Paste content from `kestra/flows/incident-handler.yml`
4. Configure secrets: Namespaces → `incident.response` → KV Store → Add `GEMINI_API_KEY`

**5. Run Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**6. Test Webhook (Optional)**

Get your webhook key:

```sql
SELECT webhook_key FROM organizations WHERE slug = 'demo-company';
```

Send a test incident:

```bash
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=generic&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High CPU Usage on API Server",
    "service": "api-gateway",
    "severity": "HIGH",
    "logs": ["CPU at 95%", "Response time degraded"],
    "metrics": {"cpu_percent": 95, "response_time_ms": 1200}
  }'
```

---

## 🧪 Demo

### Demo Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Org Admin** | `admin@democompany.com` | `Admin123!` | Manage users, view webhook key |
| **Member** | `member@democompany.com` | `Member123!` | Manage incidents, run AI analysis |
| **Viewer** | `viewer@democompany.com` | `Viewer123!` | Read-only access |

### Try These Features

1. **Login as Admin** → View dashboard, manage team members
2. **Trigger AI Analysis** → Click "Run AI Analysis" on any incident
3. **Test Webhooks** → Send incident via curl command above
4. **Generate Invite Code** → Settings → Invite Users
5. **Compare Roles** → Login as different users to see RBAC in action

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | Next.js 16 | React framework with App Router |
| | React 19 | UI library with server components |
| | TypeScript 5 | Type safety and developer experience |
| | Tailwind CSS 4 | Utility-first styling |
| | Lucide React | Icon library |
| | Recharts | Data visualization |
| **Backend** | Supabase | PostgreSQL database + Auth |
| | Supabase Auth | JWT authentication |
| | Row Level Security | Database-enforced multi-tenancy |
| | PostgreSQL | Relational database |
| **Orchestration** | Kestra | Workflow orchestration |
| | Docker | Containerization |
| **AI** | Google Gemini 2.5 | Large language model |
| | Vercel AI SDK | Streaming AI responses |
| **Developer Tools** | ESLint | Code linting |
| | Commander.js | CLI framework |
| | Chalk & Ora | Terminal UI |

---

## 📡 API Reference

### Webhook Ingestion

**Endpoint:** `POST /api/webhooks/ingest`

**Query Parameters:**
- `source` - Platform: `datadog`, `pagerduty`, `cloudwatch`, `prometheus`, `generic`
- `key` - Organization webhook key (required)

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Key` - Alternative to `?key=` parameter

**Example - Datadog:**

```bash
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=datadog&key=demo-webhook-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High Memory Usage",
    "body": "Memory usage exceeded 90%",
    "priority": "high",
    "tags": ["service:postgres", "env:production"],
    "alert_type": "metric alert"
  }'
```

**Example - PagerDuty:**

```bash
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=pagerduty&key=demo-webhook-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "incident": {
        "incident_number": 123,
        "title": "Database Connection Pool Exhausted",
        "status": "triggered",
        "urgency": "high",
        "service": { "name": "database-service" }
      }
    }]
  }'
```

**Example - Generic:**

```bash
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=generic&key=demo-webhook-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Disk Space Low",
    "service": "storage",
    "severity": "MEDIUM",
    "logs": ["Disk usage at 85%", "Warning threshold exceeded"],
    "metrics": {"disk_usage_percent": 85}
  }'
```

**Response:**

```json
{
  "success": true,
  "incident_id": "INC-2024-001",
  "organization": "00000000-0000-0000-0000-000000000001",
  "kestra_triggered": true
}
```

### Protected Routes

All routes require authentication via Supabase Auth session.

**`GET /api/incidents`**

List incidents for authenticated user's organization.

**Query Parameters:**
- `status` - Filter: `open`, `investigating`, `resolved`, `closed`
- `severity` - Filter: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `service` - Filter by service name

**Example:**

```bash
curl "http://localhost:3000/api/incidents?status=open&severity=HIGH" \
  -H "Cookie: sb-xxx-auth-token=..."
```

**`POST /api/analyze`**

Stream AI analysis for an incident.

**Body:**

```json
{
  "incidentId": "INC-2024-001",
  "includeHistorical": true
}
```

**Response:** Server-Sent Events (SSE) stream

**`POST /api/kestra/trigger`**

Manually trigger Kestra workflow.

**Body:**

```json
{
  "incidentId": "INC-2024-001"
}
```

---

## 💻 CLI Usage

### Installation

```bash
cd cli
npm install
```

### Configuration

Create `.env` file:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KESTRA_URL=http://localhost:8080
KESTRA_USERNAME=admin@kestra.io
KESTRA_PASSWORD=kestra
```

### Commands

**1. Analyze Single Incident**

```bash
node index.js analyze INC-2024-001
```

Output: Root cause analysis, impact assessment, remediation steps, related incidents

**2. Batch Analyze Multiple Incidents**

```bash
node index.js batch-analyze INC-001 INC-002 INC-003
```

**3. Generate Operational Runbook**

```bash
node index.js runbook INC-2024-001 --output runbook.md
```

**4. Find Correlated Incidents**

```bash
node index.js correlate INC-2024-001
```

Finds similar incidents based on service name, error patterns, timeframe proximity

**5. Trigger Kestra Workflow**

```bash
node index.js trigger INC-2024-001
```

**6. Export Incident Data**

```bash
# JSON format
node index.js export INC-2024-001 --format json

# CSV format
node index.js export INC-2024-001 --format csv

# Markdown format
node index.js export INC-2024-001 --format markdown
```

**7. Auto-Fix (with Guardrails)**

```bash
# Dry-run mode
node index.js auto-fix INC-2024-001 --dry-run

# Execute fixes
node index.js auto-fix INC-2024-001
```

Only executes allowlisted safe commands.

**8. Replay Analysis**

```bash
node index.js replay INC-2024-001
```

Re-runs analysis with current context (useful if new data available).

---

## 🔒 Security

### What Users CANNOT Do

- ❌ Select or switch organizations (determined by account)
- ❌ Access other organizations' incidents
- ❌ Bypass authentication
- ❌ Manipulate organization ID in requests
- ❌ View webhook keys without proper role
- ❌ Create users without invite codes (unless admin)

### What We Protect Against

- **SQL Injection** - Parameterized queries via Supabase client
- **XSS Attacks** - httpOnly cookies, CSP headers, React auto-escaping
- **CSRF** - SameSite cookies, origin validation
- **Data Leakage** - RLS enforced at database level
- **Privilege Escalation** - RBAC checked in API routes + RLS
- **Webhook Spoofing** - Unique keys per organization

### Best Practices

1. **Rotate webhook keys regularly** via organization settings
2. **Enable MFA** for admin users in Supabase Auth settings
3. **Use strong passwords** - enforced by Supabase password policies
4. **Audit access logs** - available in `audit_log` table
5. **Limit invite code validity** - set short expiration times
6. **Review user roles** - periodically audit RBAC assignments

For detailed security information, see [SECURITY.md](docs/SECURITY.md)

---

## 🌍 Deployment

### Vercel (Recommended for Frontend)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Harsh-Daga/Incident-Scribe)

1. Import repository to Vercel
2. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy - Vercel auto-detects Next.js

### Kestra

**Self-Hosted:**

```bash
docker compose up -d
```

**Kestra Cloud:**

1. Sign up at [kestra.io](https://kestra.io)
2. Upload workflow files from `kestra/flows/`
3. Configure KV Store with secrets
4. Update `system_config` with Kestra Cloud URL

### Supabase

Your Supabase project is already cloud-hosted. For production:

1. Upgrade plan if needed (free tier is generous)
2. Enable email confirmations (Auth → Settings)
3. Configure custom SMTP (Auth → Settings → SMTP)
4. Set up backups (Database → Backups)
5. Enable database logs (Logs & Insights)

For detailed deployment guide, see [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📚 Documentation

- **[Architecture Deep Dive](docs/ARCHITECTURE.md)** - System design and data flows
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Security Guide](docs/SECURITY.md)** - Security model and best practices
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute
- **[CLI Guide](docs/CLI.md)** - Command-line tool usage
- **[Kestra Workflows](docs/KESTRA.md)** - Workflow orchestration
- **[Webhook Integration](docs/WEBHOOKS.md)** - Webhook setup

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Quick Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Incident-Scribe.git
cd incident-scribe

# Install dependencies
cd frontend && npm install

# Start development server
npm run dev

# In another terminal, start Kestra
docker compose up -d
```

### Code Standards

- **TypeScript** - All new code must be TypeScript
- **ESLint** - Run `npm run lint` before committing
- **Formatting** - Use Prettier (configured in project)
- **Tests** - Add tests for new features (coming soon)
- **Documentation** - Update README and docs for user-facing changes

---

## 🏆 Hackathon

Built for the **AI Agents Assemble Hackathon** by Kestra.

### Technologies Used

- ✅ **Kestra** - Multi-agent workflow orchestration
- ✅ **Vercel AI SDK** - Real-time AI streaming
- ✅ **Cline** - AI-assisted development

### What Makes This Unique

1. **Production-Ready** - Not a prototype, fully functional system
2. **Enterprise Security** - Multi-tenancy with RLS, RBAC, audit logging
3. **Multi-Agent AI** - Specialized agents for different analysis tasks
4. **Real-World Integration** - Works with actual monitoring platforms
5. **Beautiful UX** - Mission Control design system with glassmorphism
6. **Comprehensive** - Frontend, backend, CLI, workflows, documentation

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Harsh Daga

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📧 Contact & Support

- **Author**: Harsh Daga
- **GitHub**: [@Harsh-Daga](https://github.com/Harsh-Daga)
- **Project**: [Incident-Scribe](https://github.com/Harsh-Daga/Incident-Scribe)
- **Issues**: [Report a Bug](https://github.com/Harsh-Daga/Incident-Scribe/issues)
- **Discussions**: [Join Discussions](https://github.com/Harsh-Daga/Incident-Scribe/discussions)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! It helps others discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=Harsh-Daga/Incident-Scribe&type=Date)](https://star-history.com/#Harsh-Daga/Incident-Scribe&Date)

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/Harsh-Daga">Harsh Daga</a></strong>
</p>

<p align="center">
  <a href="https://github.com/Harsh-Daga/Incident-Scribe/issues">Report Bug</a> •
  <a href="https://github.com/Harsh-Daga/Incident-Scribe/issues">Request Feature</a> •
  <a href="docs/">Documentation</a>
</p>
