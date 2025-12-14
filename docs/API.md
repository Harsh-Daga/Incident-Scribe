# API Reference

Complete API documentation for IncidentScribe AI.

## Authentication

All protected endpoints require a valid Supabase session cookie. The session is automatically handled by the Supabase client.

## Endpoints

### Incidents

#### List Incidents

```
GET /api/incidents
```

Returns all incidents for the authenticated user's organization.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (open, investigating, resolved, closed) |
| severity | string | Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) |
| service | string | Filter by service name |

**Response:**
```json
[
  {
    "id": "INC-001",
    "organization_id": "uuid",
    "timestamp": "2025-01-01T00:00:00Z",
    "service": "payment-api",
    "severity": "HIGH",
    "status": "open",
    "title": "High Error Rate",
    "logs": ["ERROR: Connection timeout"],
    "metrics": {"error_rate": 0.45},
    "context": {"host": "prod-api-1"}
  }
]
```

#### Get Incident

```
GET /api/incidents/:id
```

Returns a single incident with AI analysis if available.

**Response:**
```json
{
  "id": "INC-001",
  "internal_id": "uuid",
  "organization_id": "uuid",
  "timestamp": "2025-01-01T00:00:00Z",
  "service": "payment-api",
  "severity": "HIGH",
  "status": "open",
  "title": "High Error Rate",
  "description": "Error rate exceeded threshold",
  "logs": ["ERROR: Connection timeout"],
  "metrics": {"error_rate": 0.45},
  "context": {"host": "prod-api-1"},
  "ai_analysis": {
    "analysis": "Root cause analysis...",
    "remediation": "Steps to fix...",
    "documentation": "Post-mortem...",
    "confidence_level": "HIGH",
    "kestra_execution_id": "exec-123"
  }
}
```

### AI Analysis

#### Stream AI Analysis

```
POST /api/analyze
```

Streams AI analysis in real-time using Vercel AI SDK.

**Request Body:**
```json
{
  "incident": {
    "id": "INC-001",
    "service": "payment-api",
    "severity": "HIGH",
    "title": "High Error Rate",
    "logs": ["ERROR: Connection timeout"],
    "metrics": {"error_rate": 0.45},
    "context": {"host": "prod-api-1"}
  }
}
```

**Response:** Text stream (chunked transfer encoding)

#### Save AI Analysis

```
POST /api/analysis/save
```

Saves AI analysis results to the database.

**Request Body:**
```json
{
  "incidentId": "uuid",
  "executionId": "kestra-exec-id",
  "analysis": "Root cause analysis text...",
  "remediation": "Remediation steps...",
  "documentation": "Post-mortem documentation..."
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": "uuid",
    "incident_id": "uuid",
    "analysis": "...",
    "remediation": "...",
    "documentation": "..."
  }
}
```

### Kestra Integration

#### Trigger Workflow

```
POST /api/kestra/trigger
```

Triggers the Kestra incident-handler workflow.

**Request Body:**
```json
{
  "incident_data": {
    "id": "INC-001",
    "service": "payment-api",
    "severity": "HIGH",
    "status": "open",
    "title": "High Error Rate",
    "logs": ["ERROR: Connection timeout"],
    "metrics": {"error_rate": 0.45},
    "context": {"host": "prod-api-1"}
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "2itfnpkFHgdEY0SZ03QE8r",
  "status": "RUNNING",
  "message": "Kestra workflow triggered successfully"
}
```

#### Get Execution Status

```
GET /api/kestra/execution/:id
```

Returns the status and results of a Kestra execution.

**Response:**
```json
{
  "executionId": "2itfnpkFHgdEY0SZ03QE8r",
  "status": "SUCCESS",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-01T00:00:30Z",
  "duration": 30.5,
  "aiResults": {
    "analysis": "Root cause analysis...",
    "remediation": "Steps to fix...",
    "documentation": "Post-mortem..."
  },
  "url": "http://localhost:8080/ui/main/executions/..."
}
```

### Webhooks

#### Ingest Incident

```
POST /api/webhooks/ingest?source=<source>&key=<webhook_key>
```

Ingests incidents from monitoring tools.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| source | string | Yes | Source type (datadog, pagerduty, cloudwatch, prometheus, generic) |
| key | string | Yes | Organization webhook key |

**Request Body (Generic):**
```json
{
  "title": "Service Down",
  "service": "api-gateway",
  "severity": "HIGH",
  "description": "Service not responding",
  "logs": ["ERROR: Connection refused"],
  "metrics": {"error_rate": 1.0},
  "context": {"host": "gateway-1"}
}
```

**Request Body (Datadog):**
```json
{
  "id": "alert-123",
  "title": "High CPU Usage",
  "body": "CPU usage above 90%",
  "priority": "high",
  "tags": ["service:api", "env:prod"],
  "date": 1704067200
}
```

**Request Body (PagerDuty):**
```json
{
  "messages": [{
    "id": "incident-456",
    "event": "incident.trigger",
    "incident": {
      "title": "Database Down",
      "urgency": "high",
      "service": {"name": "postgres"},
      "created_at": "2025-01-01T00:00:00Z"
    }
  }]
}
```

**Response:**
```json
{
  "success": true,
  "incidentId": "uuid",
  "externalId": "INC-006",
  "kestraTriggered": true,
  "message": "Incident created successfully"
}
```

### Organizations

#### Create Invite Code

```
POST /api/organizations/invite
```

Creates an invite code for new users. Requires org admin role.

**Request Body:**
```json
{
  "role": "member",
  "maxUses": 5,
  "expiresInDays": 7
}
```

**Response:**
```json
{
  "code": "ABC123XY",
  "role": "member",
  "maxUses": 5,
  "expiresAt": "2025-01-08T00:00:00Z"
}
```

#### List Organizations (Admin)

```
GET /api/admin/organizations
```

Lists all organizations. Requires platform admin role.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Demo Company",
    "slug": "demo-company",
    "userCount": 3,
    "incidentCount": 5
  }
]
```

#### Create Organization (Admin)

```
POST /api/admin/organizations
```

Creates a new organization. Requires platform admin role.

**Request Body:**
```json
{
  "name": "New Company",
  "slug": "new-company",
  "adminEmail": "admin@newcompany.com"
}
```

### Authentication

#### Signup with Invite Code

```
POST /api/auth/signup
```

Creates a new user account with an invite code.

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "inviteCode": "ABC123XY"
}
```

#### Validate Invite Code

```
POST /api/auth/validate-invite
```

Validates an invite code without using it.

**Request Body:**
```json
{
  "code": "ABC123XY"
}
```

**Response:**
```json
{
  "valid": true,
  "organizationName": "Demo Company",
  "role": "member"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details (dev only)"
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Kestra unreachable |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /api/analyze | 20 requests/minute per org |
| /api/webhooks/ingest | 60 requests/minute per key |
| /api/kestra/trigger | 10 requests/minute per org |

