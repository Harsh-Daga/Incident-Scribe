# Architecture Guide

## System Overview

IncidentScribe AI is a multi-tenant incident management system that combines real-time monitoring integration with AI-powered analysis.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INCIDENT SCRIBE SYSTEM                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Monitoring │───▶│   Webhook   │───▶│  Supabase   │◀───│   Next.js   │
│    Tools    │    │  Ingestion  │    │  Database   │    │  Frontend   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │   Kestra    │◀───│  AI Agents  │───▶│  Gemini AI  │
                   │  Workflow   │    │             │    │             │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

## Components

### 1. Frontend (Next.js 15)

**Location:** `frontend/`

The frontend is a Next.js 15 application using the App Router pattern.

**Key Features:**
- Server-side rendering for performance
- Supabase Auth integration with RLS
- Real-time AI streaming via Vercel AI SDK
- Markdown rendering for AI output

**Structure:**
```
frontend/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/
│   │   └── page.tsx          # Incident list
│   ├── incident/[id]/
│   │   └── page.tsx          # Incident detail + AI
│   └── api/                  # API routes
├── components/               # React components
├── lib/                      # Utilities
└── middleware.ts             # Auth middleware
```

### 2. Database (Supabase)

**Location:** `database/complete-setup.sql`

PostgreSQL database with Row Level Security for multi-tenancy.

**Tables:**
| Table | Purpose |
|-------|---------|
| `organizations` | Tenant organizations |
| `users` | User profiles linked to auth.users |
| `incidents` | Incident records |
| `ai_analyses` | Stored AI analysis results |
| `invite_codes` | User onboarding codes |
| `system_config` | Application configuration |
| `audit_log` | Action audit trail |

**Row Level Security:**
- All tables have RLS enabled
- Users can only access their organization's data
- Platform admins have cross-organization access
- Helper functions (`is_platform_admin()`, `get_user_organization_id()`) bypass RLS for policy checks

### 3. Workflow Engine (Kestra)

**Location:** `kestra/flows/incident-handler.yml`

Kestra orchestrates the AI analysis pipeline with multiple specialized agents.

**Workflow Stages:**
1. **Receive Incident** - Webhook trigger with incident data
2. **Aggregate Data** - Fetch logs, metrics, historical incidents
3. **AI Analysis** - Gemini analyzes root cause and impact
4. **Decision Branch** - Route based on severity
5. **AI Remediation** - Generate fix recommendations
6. **AI Documentation** - Create post-mortem
7. **Save Results** - Persist to Supabase

**Severity Routing:**
- **LOW** → Auto-remediate (safe commands)
- **MEDIUM** → Require approval
- **HIGH/CRITICAL** → Escalate immediately

### 4. AI Integration

**AI Provider:** Google Gemini 2.5 Flash

**Two Integration Points:**

1. **Direct Streaming** (`/api/analyze`)
   - Uses Vercel AI SDK
   - Real-time streaming response
   - For quick analysis in UI

2. **Kestra Workflow**
   - HTTP requests to Gemini API
   - Multi-agent pipeline
   - Persistent results

**AI Agents:**
| Agent | Purpose |
|-------|---------|
| Analysis | Root cause identification |
| Remediation | Fix recommendations |
| Documentation | Post-mortem generation |
| Decision | Severity-based routing |

### 5. Webhook Ingestion

**Endpoint:** `POST /api/webhooks/ingest`

Normalizes incidents from various monitoring tools:

| Source | Supported Fields |
|--------|-----------------|
| Datadog | title, priority, tags, body |
| PagerDuty | incident.title, urgency, service.name |
| CloudWatch | detail.alarmName, detail.state |
| Prometheus | alerts[].labels, annotations |
| Generic | title, service, severity, logs |

**Security:**
- Organization-specific webhook keys
- Idempotency via external_id
- Rate limiting (60 req/min)

## Data Flow

### Incident Creation Flow

```
1. Monitoring Tool detects issue
         │
         ▼
2. Sends webhook to /api/webhooks/ingest
         │
         ▼
3. Webhook handler:
   - Validates webhook key
   - Normalizes payload
   - Checks idempotency
   - Saves to Supabase
         │
         ▼
4. If HIGH/CRITICAL:
   - Triggers Kestra workflow
         │
         ▼
5. Kestra workflow:
   - Runs AI analysis
   - Saves results to ai_analyses
```

### User Authentication Flow

```
1. User visits /login
         │
         ▼
2. Supabase Auth handles login
         │
         ▼
3. Middleware checks auth cookie
         │
         ▼
4. API routes use createClient() 
   with user session
         │
         ▼
5. RLS policies filter data 
   by organization
```

## Security Model

### Authentication

- Supabase Auth with email/password
- JWT tokens in HTTP-only cookies
- Session refresh via middleware

### Authorization

**Role Hierarchy:**
```
platform_admin
    │
    └── Can create organizations
    └── Cross-org access
    
admin (org level)
    │
    └── Manage org users
    └── Generate invite codes
    └── View webhook key
    
member
    │
    └── Full incident access
    └── Trigger workflows
    
viewer
    │
    └── Read-only access
```

### Data Isolation

- RLS enforces org boundaries
- Users never see other orgs' data
- Webhook keys are org-specific
- Admin client used only for webhooks

## Deployment Architecture

### Local Development

```
┌──────────────┐    ┌──────────────┐
│  Next.js     │    │   Kestra     │
│  localhost:  │    │  localhost:  │
│    3000      │    │    8080      │
└──────────────┘    └──────────────┘
        │                  │
        └────────┬─────────┘
                 ▼
          ┌──────────────┐
          │   Supabase   │
          │    Cloud     │
          └──────────────┘
```

### Production (Vercel)

```
┌──────────────┐    ┌──────────────┐
│   Vercel     │    │   Kestra     │
│  (Frontend)  │    │  (ngrok or   │
│              │    │   cloud)     │
└──────────────┘    └──────────────┘
        │                  │
        └────────┬─────────┘
                 ▼
          ┌──────────────┐
          │   Supabase   │
          │    Cloud     │
          └──────────────┘
```

## Performance Considerations

### Database
- Indexes on frequently queried columns
- RLS functions use `SECURITY DEFINER` for efficiency
- Connection pooling via Supabase

### API Routes
- 60-second timeout for AI operations
- Rate limiting on analysis endpoints
- Streaming responses for AI

### Frontend
- Server components where possible
- Client components only for interactivity
- Portal-based dropdowns for z-index

