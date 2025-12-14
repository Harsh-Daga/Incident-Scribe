# CLI Tool Guide

The IncidentScribe CLI provides command-line access to incident analysis and management.

## Installation

```bash
cd cli
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your-gemini-api-key
```

The CLI uses `dotenv` to load environment variables from the parent directory.

## Commands

### analyze

Analyze a single incident with AI.

```bash
node index.js analyze <incident-id>
```

**Example:**
```bash
node index.js analyze INC-001
```

**Output:**
```
╔════════════════════════════════════════╗
║       INCIDENT ANALYSIS REPORT         ║
╚════════════════════════════════════════╝

📋 INCIDENT: INC-001
🔧 SERVICE: payment-api
⚠️  SEVERITY: HIGH

🔍 ERROR CLUSTERS:
  1. Database connection timeout (30s) followed by connection refused
     Count: 3, Severity: HIGH

🎯 ROOT CAUSE:
  The primary root cause is the database being unable to accept 
  new connections, likely due to being overloaded or unresponsive.
  Confidence: HIGH

📊 IMPACT ANALYSIS:
  Users: Approximately 45% of all payment requests are failing
  Business: Direct revenue loss due to failed transactions
  Technical: Circuit breaker opened, propagating failures

💡 PROPOSED FIXES:
  1. Investigate database health issues (CPU, memory, connections)
     Priority: P0, Effort: LOW, Risk: LOW
  2. Restart payment-api instances to clear connection pools
     Priority: P1, Effort: LOW, Risk: LOW

🛠️  SAFE REMEDIATION COMMANDS:
  ✓ health-check database-cluster --service payment-api
  ✓ restart service payment-api --host prod-api-3

⚠️  COMMANDS REQUIRING APPROVAL:
  ! restart database-instance --id payment-db-primary --force

🛡️  PREVENTIVE MEASURES:
  1. Implement comprehensive database monitoring
  2. Review connection pool configuration
  3. Test database failover mechanisms

✅ Analysis saved to: data/analysis-INC-001.json
```

### batch-analyze

Analyze multiple incidents at once.

```bash
node index.js batch-analyze <id1> <id2> <id3> ...
```

**Example:**
```bash
node index.js batch-analyze INC-001 INC-002 INC-003
```

**Output:**
- Individual analysis for each incident
- Summary report with common patterns
- Saved to `data/batch-analysis/batch-{timestamp}.json`

### runbook

Generate a runbook for incident resolution.

```bash
node index.js runbook <incident-id>
```

**Example:**
```bash
node index.js runbook INC-001
```

**Output:**
```
📖 RUNBOOK: INC-001

## Pre-requisites
- Access to production environment
- Database admin credentials
- On-call DBA contact

## Step 1: Verify Issue
1. Check database connection status
2. Verify error rate in monitoring dashboard
3. Confirm no ongoing maintenance

## Step 2: Initial Mitigation
1. Scale up database resources
2. Clear connection pools
3. Enable circuit breaker bypass (if safe)

## Step 3: Root Cause Resolution
1. Investigate database logs
2. Check for blocking queries
3. Review recent deployments

## Step 4: Verification
1. Confirm error rate returning to normal
2. Verify all services reconnecting
3. Check downstream dependencies

## Rollback Plan
If issues persist after 15 minutes:
1. Failover to replica database
2. Notify stakeholders
3. Escalate to database team
```

### correlate

Find related incidents based on patterns.

```bash
node index.js correlate <incident-id>
```

**Example:**
```bash
node index.js correlate INC-001
```

**Output:**
```
🔗 RELATED INCIDENTS FOR INC-001

Similar Incidents Found: 3

1. INC-089 (2 days ago)
   Service: payment-api
   Similarity: 85%
   Pattern: Database connection issues

2. INC-067 (1 week ago)
   Service: checkout-api
   Similarity: 72%
   Pattern: Connection pool exhaustion

3. INC-045 (2 weeks ago)
   Service: payment-api
   Similarity: 68%
   Pattern: Timeout errors

Suggested Root Cause Pattern:
The payment-api service has recurring database connectivity 
issues, typically occurring during traffic spikes.

Recommendation:
Consider implementing connection pool auto-scaling and 
database read replicas.
```

### trigger

Trigger a Kestra workflow for an incident.

```bash
node index.js trigger <incident-id>
```

**Example:**
```bash
node index.js trigger INC-001
```

**Output:**
```
🚀 Triggering Kestra workflow for INC-001...

✅ Workflow triggered successfully!
   Execution ID: 2itfnpkFHgdEY0SZ03QE8r
   Status: RUNNING

View execution at:
http://localhost:8080/ui/main/executions/incident.response/incident-handler/2itfnpkFHgdEY0SZ03QE8r
```

### export

Export incident data in various formats.

```bash
node index.js export <incident-id> [--format <format>]
```

**Formats:**
- `json` (default)
- `markdown`
- `yaml`

**Examples:**
```bash
# Export as JSON
node index.js export INC-001

# Export as Markdown
node index.js export INC-001 --format markdown

# Export as YAML
node index.js export INC-001 --format yaml
```

### auto-fix

Attempt automatic remediation for an incident.

```bash
node index.js auto-fix <incident-id> [--dry-run]
```

**Options:**
- `--dry-run` - Show commands without executing (default: true)

**Example:**
```bash
# Preview commands (dry run)
node index.js auto-fix INC-001

# Execute commands (use with caution!)
node index.js auto-fix INC-001 --no-dry-run
```

**Output:**
```
🔧 AUTO-FIX FOR INC-001

[DRY RUN MODE - Commands will not be executed]

Proposed Actions:

1. health-check database-cluster --service payment-api
   Purpose: Verify database health
   Risk: LOW
   [SAFE - Would execute]

2. restart service payment-api --host prod-api-3
   Purpose: Clear connection pools
   Risk: LOW
   [SAFE - Would execute]

3. restart database-instance --id payment-db-primary --force
   Purpose: Hard restart database
   Risk: HIGH
   [BLOCKED - Requires approval]

To execute safe commands, run:
  node index.js auto-fix INC-001 --no-dry-run
```

### replay

Replay an incident for testing or training.

```bash
node index.js replay <incident-id>
```

**Example:**
```bash
node index.js replay INC-001
```

## Guardrails

The CLI implements safety guardrails for remediation commands:

### Allowlisted Commands

Only these command patterns are executable:
- `health-check *`
- `restart service *`
- `scale *`
- `rollback *`
- `drain *`

### Blocked Commands

These patterns are always blocked:
- `rm -rf *`
- `drop database *`
- `delete *`
- `format *`
- `shutdown *`

### Approval Required

These require explicit confirmation:
- `restart database-instance *`
- `failover *`
- `migrate *`
- `* --force`

## Data Storage

Analysis results are saved to:

```
data/
├── analysis-INC-001.json      # Single incident analysis
├── batch-analysis/
│   └── batch-1704067200.json  # Batch analysis results
└── mock-incidents.json        # Source incident data
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `KESTRA_URL` | Kestra server URL | For trigger command |
| `KESTRA_USERNAME` | Kestra auth username | If Kestra has auth |
| `KESTRA_PASSWORD` | Kestra auth password | If Kestra has auth |

## Error Handling

```bash
# Incident not found
node index.js analyze INC-999
# Error: Incident INC-999 not found

# API key not configured
node index.js analyze INC-001
# Error: GEMINI_API_KEY environment variable not set

# Kestra unreachable
node index.js trigger INC-001
# Error: Failed to connect to Kestra at http://localhost:8080
```

## Scripting

The CLI can be used in scripts:

```bash
#!/bin/bash

# Analyze all open incidents
for id in INC-001 INC-002 INC-003; do
  echo "Analyzing $id..."
  node index.js analyze $id
done

# Export as part of CI/CD
node index.js export INC-001 --format json > incident-report.json
```

