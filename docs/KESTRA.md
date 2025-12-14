# Kestra Workflow Guide

IncidentScribe uses Kestra for workflow orchestration and AI agent coordination.

## Overview

The `incident-handler` workflow processes incidents through multiple AI agents:

```
Webhook Trigger
      │
      ▼
┌─────────────┐
│  Aggregate  │  Fetch logs, metrics, history
│    Data     │
└─────────────┘
      │
      ▼
┌─────────────┐
│  AI Agent   │  Analyze root cause
│  Analysis   │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Decision   │  Route by severity
│   Branch    │
└─────────────┘
      │
      ├── LOW ────────▶ Auto-remediate
      │
      ├── MEDIUM ─────▶ Require approval
      │
      └── HIGH/CRIT ──▶ Escalate
                │
                ▼
          ┌─────────────┐
          │  AI Agent   │  Generate fixes
          │ Remediation │
          └─────────────┘
                │
                ▼
          ┌─────────────┐
          │  AI Agent   │  Create postmortem
          │Documentation│
          └─────────────┘
                │
                ▼
          ┌─────────────┐
          │   Save to   │  Persist results
          │  Supabase   │
          └─────────────┘
```

## Setup

### 1. Start Kestra

```bash
docker compose up -d
```

Access UI at http://localhost:8080

### 2. Create Namespace

1. Go to **Namespaces** → **Create**
2. ID: `incident.response`
3. Save

### 3. Import Workflow

1. Go to **Flows** → **Create**
2. Copy contents of `kestra/flows/incident-handler.yml`
3. Paste and save

### 4. Configure KV Store

1. Go to **Namespaces** → `incident.response` → **KV Store**
2. Add: `GEMINI_API_KEY` = your Gemini API key

## Workflow Details

### Trigger

The workflow is triggered via webhook:

```yaml
triggers:
  - id: webhook
    type: io.kestra.plugin.core.trigger.Webhook
    key: incident-webhook-key
```

**Trigger URL:**
```
POST http://localhost:8080/api/v1/executions/webhook/incident.response/incident-handler/incident-webhook-key
```

### Input

```yaml
inputs:
  - id: incident_data
    type: JSON
    required: true
```

Expected structure:
```json
{
  "id": "INC-001",
  "service": "payment-api",
  "severity": "HIGH",
  "title": "High Error Rate",
  "logs": ["ERROR: Connection timeout"],
  "metrics": {"error_rate": 0.45},
  "context": {"host": "prod-api-1"},
  "organization_id": "uuid"
}
```

### Tasks

#### 1. Data Aggregation

```yaml
- id: aggregate_data_sources
  type: io.kestra.plugin.scripts.python.Script
```

Fetches additional context:
- Historical incidents
- Service metadata
- Related alerts

#### 2. AI Analysis Agent

```yaml
- id: ai_agent_analyze
  type: io.kestra.plugin.core.http.Request
```

Calls Gemini API to:
- Identify root cause
- Assess impact
- Cluster error patterns
- Rate confidence

#### 3. Severity Decision

```yaml
- id: ai_agent_decision_branch
  type: io.kestra.plugin.core.flow.Switch
```

Routes based on severity:
- `LOW` → `auto_remediate_low`
- `MEDIUM` → `require_approval_medium`
- `HIGH` → `escalate_high`
- `CRITICAL` → `escalate_critical`

#### 4. Remediation Agent

```yaml
- id: ai_agent_remediation
  type: io.kestra.plugin.core.http.Request
```

Generates:
- Step-by-step fix instructions
- Safe commands to execute
- Rollback procedures

#### 5. Documentation Agent

```yaml
- id: ai_agent_documentation
  type: io.kestra.plugin.core.http.Request
```

Creates:
- Executive summary
- Timeline of events
- Root cause analysis
- Preventive measures
- Action items

#### 6. Save Results

```yaml
- id: save_to_supabase
  type: io.kestra.plugin.core.http.Request
```

Persists AI results to `ai_analyses` table.

## KV Store Variables

| Key | Description |
|-----|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |

## Monitoring Executions

### Via UI

1. Go to http://localhost:8080
2. Click **Executions** in sidebar
3. View execution details, logs, outputs

### Via API

```bash
# Get execution status
curl http://localhost:8080/api/v1/main/executions/{execution_id} \
  -u admin@kestra.io:kestra
```

## Customization

### Adding New AI Agents

Add a new task after the decision branch:

```yaml
- id: ai_agent_custom
  type: io.kestra.plugin.core.http.Request
  method: POST
  uri: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{ kv('GEMINI_API_KEY') }}"
  contentType: application/json
  body: |
    {
      "contents": [{
        "parts": [{
          "text": "Your custom prompt here..."
        }]
      }]
    }
```

### Modifying Severity Routing

Edit the `Switch` task:

```yaml
- id: ai_agent_decision_branch
  type: io.kestra.plugin.core.flow.Switch
  value: "{{ inputs.incident_data.severity }}"
  cases:
    LOW:
      - id: handle_low
        type: io.kestra.plugin.core.log.Log
        message: "Custom LOW handler"
    # Add more cases...
```

### Adding Notifications

Add Slack notification after analysis:

```yaml
- id: notify_slack
  type: io.kestra.plugin.core.http.Request
  method: POST
  uri: "{{ kv('SLACK_WEBHOOK_URL') }}"
  contentType: application/json
  body: |
    {
      "text": "Incident {{ inputs.incident_data.id }} analyzed",
      "attachments": [{
        "color": "danger",
        "title": "{{ inputs.incident_data.title }}",
        "text": "AI analysis complete. Check dashboard for details."
      }]
    }
```

## Troubleshooting

### Workflow Not Triggering

1. Check workflow is saved in correct namespace
2. Verify webhook key matches
3. Check Kestra logs: `docker compose logs kestra`

### AI Tasks Failing

1. Verify `GEMINI_API_KEY` in KV Store
2. Check API quota on Google Cloud Console
3. Review task logs in execution details

### Results Not Saving to Supabase

1. Verify Supabase URL and service role key
2. Check RLS policies allow service role access
3. Review `save_to_supabase` task output

### Execution Timeout

Default timeout is 60 minutes. Increase if needed:

```yaml
tasks:
  - id: long_running_task
    timeout: PT2H  # 2 hours
```

## Production Deployment

### Expose Kestra Publicly

For Vercel to reach Kestra, expose it via:

**ngrok:**
```bash
ngrok http 8080
```

**Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:8080
```

Update `system_config`:
```sql
UPDATE system_config 
SET value = 'https://your-tunnel.ngrok-free.app' 
WHERE key = 'KESTRA_URL';
```

### Kestra Cloud

For production, consider [Kestra Cloud](https://kestra.io/cloud) for managed hosting.

### Security Hardening

1. Change default credentials
2. Enable HTTPS
3. Configure authentication
4. Restrict network access

