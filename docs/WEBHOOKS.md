# Webhook Integration Guide

Connect your monitoring tools to IncidentScribe AI for automatic incident ingestion.

## Overview

IncidentScribe accepts webhooks from various monitoring platforms and normalizes them into a consistent incident format.

**Endpoint:**
```
POST https://your-domain.com/api/webhooks/ingest?source=<source>&key=<webhook_key>
```

## Getting Your Webhook Key

Each organization has a unique webhook key for security.

### Via Dashboard

1. Login as an organization admin
2. Go to **ORG SETTINGS** (top right)
3. Copy the webhook key

### Via SQL

```sql
SELECT webhook_key FROM organizations WHERE slug = 'your-org-slug';
```

## Supported Sources

### Datadog

**Source:** `datadog`

**Datadog Webhook Setup:**
1. Go to Datadog → Integrations → Webhooks
2. Create new webhook with URL:
   ```
   https://your-domain.com/api/webhooks/ingest?source=datadog&key=YOUR_WEBHOOK_KEY
   ```
3. Set payload:
   ```json
   {
     "id": "$ALERT_ID",
     "title": "$ALERT_TITLE",
     "body": "$TEXT_ONLY_MSG",
     "priority": "$PRIORITY",
     "tags": "$TAGS",
     "date": "$DATE"
   }
   ```

**Field Mapping:**
| Datadog Field | IncidentScribe Field |
|---------------|---------------------|
| title | title |
| body | description |
| priority (high/normal/low) | severity (HIGH/MEDIUM/LOW) |
| tags | context.tags, service |

**Example Payload:**
```json
{
  "id": "12345",
  "title": "High CPU on api-server",
  "body": "CPU usage exceeded 90% threshold",
  "priority": "high",
  "tags": ["service:payment-api", "env:production", "region:us-east-1"],
  "date": 1704067200
}
```

### PagerDuty

**Source:** `pagerduty`

**PagerDuty Webhook Setup:**
1. Go to PagerDuty → Integrations → Generic Webhooks
2. Add webhook URL:
   ```
   https://your-domain.com/api/webhooks/ingest?source=pagerduty&key=YOUR_WEBHOOK_KEY
   ```

**Field Mapping:**
| PagerDuty Field | IncidentScribe Field |
|-----------------|---------------------|
| incident.title | title |
| incident.urgency | severity |
| incident.service.name | service |
| incident.created_at | timestamp |

**Example Payload:**
```json
{
  "messages": [{
    "id": "incident-123",
    "event": "incident.trigger",
    "incident": {
      "title": "Database Connection Timeout",
      "urgency": "high",
      "status": "triggered",
      "service": {
        "name": "postgres-primary"
      },
      "created_at": "2025-01-01T10:30:00Z"
    }
  }]
}
```

### AWS CloudWatch

**Source:** `cloudwatch`

**CloudWatch Alarm Setup:**
1. Create SNS Topic
2. Subscribe HTTPS endpoint:
   ```
   https://your-domain.com/api/webhooks/ingest?source=cloudwatch&key=YOUR_WEBHOOK_KEY
   ```
3. Configure CloudWatch Alarm to publish to SNS

**Field Mapping:**
| CloudWatch Field | IncidentScribe Field |
|------------------|---------------------|
| detail.alarmName | title |
| detail.state.value | severity |
| detail.configuration.description | description |
| source | service |

**Example Payload:**
```json
{
  "source": "aws.cloudwatch",
  "detail-type": "CloudWatch Alarm State Change",
  "detail": {
    "alarmName": "HighCPUAlarm",
    "state": {
      "value": "ALARM",
      "reason": "Threshold Crossed"
    },
    "configuration": {
      "description": "CPU utilization exceeded 80%"
    }
  }
}
```

### Prometheus Alertmanager

**Source:** `prometheus`

**Alertmanager Webhook Setup:**

Add to `alertmanager.yml`:
```yaml
receivers:
  - name: 'incidentscribe'
    webhook_configs:
      - url: 'https://your-domain.com/api/webhooks/ingest?source=prometheus&key=YOUR_WEBHOOK_KEY'
        send_resolved: true
```

**Field Mapping:**
| Prometheus Field | IncidentScribe Field |
|------------------|---------------------|
| alerts[0].labels.alertname | title |
| alerts[0].labels.severity | severity |
| alerts[0].labels.service | service |
| alerts[0].annotations.description | description |

**Example Payload:**
```json
{
  "status": "firing",
  "alerts": [{
    "status": "firing",
    "labels": {
      "alertname": "HighErrorRate",
      "severity": "critical",
      "service": "api-gateway"
    },
    "annotations": {
      "description": "Error rate above 5%",
      "summary": "High error rate detected"
    },
    "startsAt": "2025-01-01T10:00:00Z"
  }]
}
```

### Generic Webhook

**Source:** `generic`

For custom integrations or unsupported platforms.

**Required Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Incident title |
| service | string | No | Affected service |
| severity | string | No | LOW, MEDIUM, HIGH, CRITICAL |
| description | string | No | Detailed description |
| logs | string[] | No | Log messages |
| metrics | object | No | Metrics data |
| context | object | No | Additional context |

**Example Payload:**
```json
{
  "title": "Service Degradation Detected",
  "service": "checkout-api",
  "severity": "HIGH",
  "description": "Response times increased by 300%",
  "logs": [
    "WARN: Connection pool exhausted",
    "ERROR: Request timeout after 30s",
    "ERROR: Database query took 15s"
  ],
  "metrics": {
    "error_rate": 0.15,
    "latency_p95_ms": 3000,
    "requests_per_sec": 500
  },
  "context": {
    "host": "checkout-api-prod-3",
    "region": "us-east-1",
    "version": "v2.5.1",
    "deployment": "blue"
  }
}
```

## Testing Webhooks

### Using cURL

```bash
# Generic webhook
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=generic&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Incident",
    "service": "test-service",
    "severity": "LOW",
    "logs": ["Test log message"]
  }'

# Datadog-style
curl -X POST "http://localhost:3000/api/webhooks/ingest?source=datadog&key=YOUR_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "title": "Test Alert from Datadog",
    "priority": "high",
    "tags": ["service:api", "env:test"]
  }'
```

### Expected Response

**Success:**
```json
{
  "success": true,
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "externalId": "INC-006",
  "kestraTriggered": true,
  "message": "Incident created successfully"
}
```

**Duplicate (Idempotent):**
```json
{
  "success": true,
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "externalId": "INC-006",
  "kestraTriggered": false,
  "message": "Incident already exists"
}
```

## Security

### Webhook Key Validation

Every request must include a valid webhook key:
- Keys are 64-character hex strings
- Each organization has a unique key
- Invalid keys return 401 Unauthorized

### Rate Limiting

- 60 requests per minute per webhook key
- Exceeding returns 429 Too Many Requests

### Idempotency

- Duplicate incidents (same external_id + organization) are rejected
- Safe to retry webhook deliveries

## Automatic Kestra Triggering

When a HIGH or CRITICAL severity incident is received:
1. Incident is saved to database
2. Kestra workflow is automatically triggered
3. AI analysis runs in background
4. Results are saved to `ai_analyses` table

Lower severity incidents are saved but don't auto-trigger analysis.

## Troubleshooting

### 401 Unauthorized

- Check webhook key is correct
- Verify organization exists

### 400 Bad Request

- Ensure JSON is valid
- Check required fields are present

### 503 Service Unavailable

- Kestra may be unreachable
- Incident is still saved, but workflow won't trigger

### Incident Not Appearing

1. Check webhook key matches your organization
2. Verify you're logged in as a user in that organization
3. Check browser console for errors

