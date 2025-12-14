# IncidentScribe AI

AI-powered incident management system with **autonomous multi-agent analysis**, **automated remediation**, and **intelligent workflow orchestration** powered by Kestra and Google Gemini.

## ✨ Key Features

### 🎨 Frontend Features
- **Beautiful Modern UI** - Gradient-based design with animations, hover effects, and professional polish
- **🆕 Real-Time Search** - Search across incident ID, title, service, and logs instantly
- **🆕 AI-Powered Insights** - Automatic impact assessment and smart recommendations
- **🆕 Related Incidents** - Intelligent correlation algorithm to find similar incidents
- **🆕 Live AI Analysis Display** - Real-time polling shows Kestra execution status and AI results
- **🆕 Actionable Remediation** - Execute remediation commands directly from UI with safety guardrails
- **Enhanced Quick Actions** - Gradient buttons for AI analysis, workflow trigger, export, and share
- **Auto-Refresh** - Live data updates every 30 seconds
- **Advanced Filters** - Filter by severity with real-time result counts

### 🤖 AI & Automation
- **8 Autonomous CLI Commands** - analyze, batch-analyze, auto-fix, correlate, replay, runbook, trigger, export
- **Multi-Agent AI Workflow** - 3 specialized agents (Analysis, Remediation, Documentation)
- **Real-Time Streaming** - Live AI analysis with Vercel AI SDK
- **Smart Recommendations** - AI detects high error rates, latency issues, and patterns
- **Automated Actions** - Parse AI recommendations and provide execute buttons with risk assessment
- **Auto-trigger HIGH severity incidents** - Kestra workflows trigger automatically for critical incidents

### 🔒 Production Features
- **Production Resilience** - Retry logic, circuit breaker, exponential backoff, rate limiting
- **Error Boundaries** - Graceful error handling with recovery actions
- **Rate Limiting** - API protection (10 req/min per IP)
- **Kestra Integration** - Autonomous decision-making (LOW→auto-fix, MEDIUM→approval, HIGH→escalate)
- **Webhook Ingestion** - Auto-create incidents from Datadog, PagerDuty, CloudWatch, Prometheus
- **Slack Notifications** - Rich formatted messages for incident created/resolved/escalated events
- **Action Allowlisting** - Only safe commands can be executed (kubectl, redis-cli, etc.)
- **Audit Logging** - All remediation actions are logged with timestamp, user, and result

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Clone and configure
git clone <repo-url>
cd incident-scribe
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### 2. Start Kestra
```bash
docker compose up -d
# Upload workflow at http://localhost:8080
```

### 3. Run CLI
```bash
cd cli && npm install
node index.js analyze INC-001
node index.js batch-analyze INC-001 INC-002 INC-003
```

### 4. Run Frontend
```bash
cd frontend && npm install
npm run dev
# Open http://localhost:3000
```

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INCIDENT SCRIBE SYSTEM                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Vercel UI   │────────▶│   Kestra     │────────▶│   Gemini     │
│  (Frontend)  │         │ (Orchestrate)│         │  (AI Agent)  │
│              │         │              │         │              │
│ - List view  │         │ - Multi-agent│         │ - Summarize  │
│ - Detail +   │         │ - Decisions  │         │ - Analyze    │
│   streaming  │         │ - Actions    │         │ - Postmortem │
│ - Trigger    │         │ - Correlation│         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│  Cline CLI   │         │  Mock Data   │
│  (Local)     │         │  (JSON)      │
│              │         │              │
│ - analyze    │         │ - 5 incidents│
│ - batch      │         │ - Logs       │
│ - auto-fix   │         │ - Metrics    │
│ - correlate  │         │              │
│ - trigger    │         │              │
└──────────────┘         └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- Docker and Docker Compose (for Kestra)
- Supabase account ([Sign up free](https://supabase.com))
- Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup

1. **Set up Supabase Database**
   - Create a new project at https://supabase.com/dashboard
   - Go to SQL Editor and run the schema from `database/init.sql`
   - Get your connection details from Project Settings → API:
     - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
     - Anon/Public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - GEMINI_API_KEY
   # - KESTRA_USERNAME (for Kestra API access)
   # - KESTRA_PASSWORD (for Kestra API access)
   ```

3. **Start Kestra**
   ```bash
   docker compose up -d
   # Kestra will be available at http://localhost:8080
   ```

4. **Configure Kestra**
   - Open http://localhost:8080
   - Go to KV Store → Add key: `GEMINI_API_KEY` with your API key value
   - Go to Flows → Create → Paste content from `kestra/flows/incident-handler.yml`
   - Save (namespace: `incident.response`, flow ID: `incident-handler`)

5. **Install and run Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend will be available at http://localhost:3000
   ```

## 🎯 Using the Application

### Via Webhook (Production Use)

Send incidents from your monitoring tools:

```bash
# From Datadog
curl -X POST http://localhost:3000/api/webhooks/ingest?source=datadog \
  -H "Content-Type: application/json" \
  -d '{"id": "123", "title": "High CPU", "body": "CPU usage > 90%", "date": 1234567890, "priority": "normal", "tags": ["service:api"]}'

# From PagerDuty
curl -X POST http://localhost:3000/api/webhooks/ingest?source=pagerduty \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"id": "456", "event": "incident.trigger", "incident": {"title": "Service Down", "urgency": "high", "service": {"name": "payment-api"}, "created_at": "2025-01-01T00:00:00Z"}}]}'

# Generic webhook
curl -X POST http://localhost:3000/api/webhooks/ingest?source=generic \
  -H "Content-Type: application/json" \
  -d '{"title": "Database Slow", "service": "postgres", "severity": "HIGH", "logs": ["Query timeout"], "metrics": {"latency": 5000}}'
```

### Via UI

1. **Browse incidents** - Open http://localhost:3000
2. **Search & filter** - Use search bar and severity filters
3. **View details** - Click any incident
4. **Trigger AI analysis** - Click "Run AI Analysis"
5. **View results** - AI analysis, remediation, and documentation appear automatically

## 📦 Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Import your GitHub repository
   - Set environment variables in Vercel Dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY`
     - `KESTRA_URL` (your deployed Kestra instance)
     - `KESTRA_USERNAME`
     - `KESTRA_PASSWORD`

3. **Configure Webhooks**
   - Point your monitoring tools to: `https://your-app.vercel.app/api/webhooks/ingest?source=<datadog|pagerduty|cloudwatch|generic>`

## 📖 Usage

### CLI Usage

```bash
# Analyze an incident
cd cli
node index.js analyze INC-001

# Batch analyze multiple incidents
node index.js batch-analyze INC-001 INC-002 INC-003

# Generate runbook
node index.js runbook INC-001

# Find related incidents
node index.js correlate INC-001

# Trigger Kestra workflow
node index.js trigger INC-001

# Export incident data
node index.js export INC-001 --format markdown
```

### Frontend Usage

1. Open http://localhost:3000
2. Browse incidents on the home page
3. Click an incident to view details
4. Click "Trigger Kestra Workflow" to start AI analysis
5. Watch real-time execution status and AI results appear
6. Review actionable remediation recommendations
7. Click "Execute" buttons to run safe remediation commands

### Webhook Integration

Auto-create incidents from monitoring tools:

```bash
# Datadog webhook
curl -X POST http://localhost:3000/api/webhooks/incident \
  -H "Content-Type: application/json" \
  -H "x-webhook-source: datadog" \
  -d '{
    "title": "High Error Rate",
    "tags": ["service:payment-api", "region:us-east-1"],
    "priority": "high",
    "message": "Error rate exceeded 30%"
  }'

# PagerDuty webhook
curl -X POST http://localhost:3000/api/webhooks/incident \
  -H "Content-Type: application/json" \
  -H "x-webhook-source: pagerduty" \
  -d '{
    "incident": {
      "title": "Database Connection Timeout",
      "urgency": "high",
      "service": {"name": "payment-api"}
    }
  }'

# Generic webhook
curl -X POST http://localhost:3000/api/webhooks/incident \
  -H "Content-Type: application/json" \
  -d '{
    "service": "payment-api",
    "title": "Service Degradation",
    "severity": "high",
    "logs": ["Connection timeout", "Retry exhausted"],
    "metrics": {"error_rate": 0.45}
  }'
```

### Slack Integration

Configure Slack webhook in `.env.local`:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Notifications are sent automatically for:
- New incidents created
- Incidents resolved
- High-severity incidents escalated
- AI analysis completed
- Remediation actions executed

### Kestra Workflow

The Kestra workflow demonstrates:
- **Multi-source data aggregation**: Logs, metrics, historical incidents
- **AI Agent decision-making**: Autonomous routing based on severity
- **Multi-agent collaboration**: Analysis, Remediation, Documentation agents
- **Decision branching**: LOW (auto-remediate), MEDIUM (approval), HIGH (escalate)

## 🧪 Testing

### Test Kestra Workflow

```bash
# Using curl
curl -X POST http://localhost:8080/api/v1/executions/incident.response.incident-handler/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "incident_data": {
        "id": "INC-001",
        "service": "payment-api",
        "severity": "HIGH",
        "title": "Database Connection Timeout",
        "logs": ["ERROR: Database timeout"],
        "metrics": {"error_rate": 0.45}
      }
    }
  }'
```

### Test CLI Commands

```bash
cd cli
node index.js analyze INC-001
node index.js batch-analyze INC-001 INC-002
node index.js correlate INC-001
```

## 📁 Project Structure

```
incident-scribe/
├── cli/                    # CLI tool with autonomous workflows
│   ├── index.js           # Main CLI entry point
│   └── package.json       # CLI dependencies
├── frontend/              # Next.js frontend application
│   ├── app/               # Next.js app router
│   │   ├── page.tsx      # Incident list page
│   │   ├── incident/[id]/ # Incident detail page
│   │   └── api/          # API routes
│   ├── components/        # React components
│   └── lib/              # Utilities and API clients
├── kestra/               # Kestra workflow definitions
│   ├── flows/           # Workflow YAML files
│   └── scripts/         # Python helper scripts
├── data/                # Mock incident data
│   └── mock-incidents.json
└── docs/                # Generated documentation
```

## 🎨 Key Differentiators

1. **Multi-Agent Collaboration**: Separate AI agents for different tasks
2. **Real-Time Streaming**: Live AI analysis with streaming responses
3. **Incident Correlation**: Pattern recognition across incidents
4. **Autonomous Remediation**: Safe auto-fix with approval gates
5. **Visual Analytics**: Interactive dashboards and charts
6. **Seamless Integration**: CLI ↔ Kestra ↔ Frontend all connected

## 🔒 Safety & Guardrails

- **Dry-run mode** by default for all destructive operations
- **Allowlisted commands** only (restart, scale, rollback, health-check)
- **Approval gates** for medium/high risk actions
- **Comprehensive logging** of all actions
- **Risk assessment** before execution

## 📚 Documentation

- [Usage Guide](./USAGE.md) - Comprehensive guide with real-world examples
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Technical details of all features
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Fix common issues

## 🤝 Contributing

This project follows open-source best practices:
- Clean PR workflow with feature branches
- CodeRabbit AI code reviews
- Comprehensive documentation
- CI/CD with linting and testing

## 🙏 Acknowledgments

Built for the AI Agents Assemble Hackathon using:
- **Cline** - Autonomous coding workflows
- **Kestra** - Workflow orchestration
- **Vercel** - Frontend deployment
- **Google Gemini** - AI analysis and generation

---

**Built with ❤️ for the AI Agents Assemble Hackathon**
