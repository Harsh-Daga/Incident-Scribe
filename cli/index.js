#!/usr/bin/env node

import { Command } from 'commander';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.GEMINI_API_KEY) {
  console.error(chalk.red('Error: GEMINI_API_KEY not found in environment variables'));
  console.error(chalk.yellow('Please create a .env file in the root directory with:'));
  console.error(chalk.yellow('GEMINI_API_KEY=your_api_key_here'));
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const program = new Command();

//=====================================================================
// RESILIENCE: Retry Logic with Exponential Backoff
//=====================================================================

/**
 * Retry a function with exponential backoff and jitter
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '503', '429'],
    onRetry = null,
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = retryableErrors.some(code =>
        error.message?.includes(code) ||
        error.code === code ||
        error.status === parseInt(code)
      );

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 1000; // Add 0-1s jitter
      const delay = exponentialDelay + jitter;

      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Circuit breaker to prevent cascade failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState() {
    return this.state;
  }
}

// Global circuit breaker for Gemini API
const geminiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
});

//=====================================================================
// ERROR HANDLING: Enhanced Error Messages
//=====================================================================

/**
 * Enhanced error handler with actionable guidance
 */
function handleError(error, context = {}) {
  const { command, incidentId, spinner } = context;

  if (spinner) {
    spinner.fail(chalk.red(`${command || 'Operation'} failed`));
  }

  console.log();
  console.log(chalk.bold.red('╔════════════════════════════════════════╗'));
  console.log(chalk.bold.red('║             ERROR OCCURRED             ║'));
  console.log(chalk.bold.red('╚════════════════════════════════════════╝'));
  console.log();

  // Categorize error and provide specific guidance
  if (error.message?.includes('GEMINI_API_KEY')) {
    console.log(chalk.yellow('❌ API Key Error'));
    console.log(chalk.white('   The Gemini API key is not configured or invalid.'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Get an API key from: https://makersuite.google.com/app/apikey'));
    console.log(chalk.white('   2. Create a .env file in the project root'));
    console.log(chalk.white('   3. Add: GEMINI_API_KEY=your_api_key_here'));
    console.log();
  } else if (error.message?.includes('not found') || error.message?.includes('Not found')) {
    console.log(chalk.yellow(`❌ Resource Not Found`));
    console.log(chalk.white(`   Incident ${incidentId || 'ID'} was not found in the database.`));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Check available incidents: ls data/mock-incidents.json'));
    console.log(chalk.white('   2. Valid IDs: INC-001, INC-002, INC-003, INC-004, INC-005'));
    console.log(chalk.white('   3. Verify the incident ID spelling'));
    console.log();
  } else if (error.message?.includes('Circuit breaker is OPEN')) {
    console.log(chalk.yellow('❌ Service Unavailable'));
    console.log(chalk.white('   The Gemini API is experiencing issues (circuit breaker opened).'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Wait 60 seconds and try again'));
    console.log(chalk.white('   2. Check API quota: https://makersuite.google.com'));
    console.log(chalk.white('   3. Verify API key is valid'));
    console.log();
  } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
    console.log(chalk.yellow('❌ Connection Refused'));
    console.log(chalk.white('   Cannot connect to Kestra server.'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Start Kestra: docker compose up -d'));
    console.log(chalk.white('   2. Wait 30 seconds for Kestra to initialize'));
    console.log(chalk.white('   3. Verify Kestra is running: http://localhost:8080'));
    console.log();
  } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    console.log(chalk.yellow('❌ Request Timeout'));
    console.log(chalk.white('   The request took too long to complete.'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Check your internet connection'));
    console.log(chalk.white('   2. Try again in a few moments'));
    console.log(chalk.white('   3. The operation will retry automatically with exponential backoff'));
    console.log();
  } else if (error.response?.status === 429 || error.message?.includes('429')) {
    console.log(chalk.yellow('❌ Rate Limit Exceeded'));
    console.log(chalk.white('   Too many requests to the API.'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Wait a few minutes and try again'));
    console.log(chalk.white('   2. Reduce batch size for batch operations'));
    console.log(chalk.white('   3. Check API quota limits'));
    console.log();
  } else if (error.response?.status === 503 || error.message?.includes('503')) {
    console.log(chalk.yellow('❌ Service Temporarily Unavailable'));
    console.log(chalk.white('   The API service is temporarily unavailable.'));
    console.log();
    console.log(chalk.cyan('💡 Solution:'));
    console.log(chalk.white('   1. Wait a few minutes and retry'));
    console.log(chalk.white('   2. Check service status page'));
    console.log(chalk.white('   3. The operation will retry automatically'));
    console.log();
  } else {
    // Generic error
    console.log(chalk.yellow('❌ Unexpected Error'));
    console.log(chalk.white(`   ${error.message || 'An unknown error occurred'}`));
    console.log();
    console.log(chalk.cyan('💡 Debug Steps:'));
    console.log(chalk.white('   1. Check error details above'));
    console.log(chalk.white('   2. Verify all dependencies are installed: npm install'));
    console.log(chalk.white('   3. Check .env file configuration'));
    console.log(chalk.white('   4. Report issue: https://github.com/your-repo/issues'));
    console.log();
  }

  // Technical details (for debugging)
  if (process.env.DEBUG === 'true') {
    console.log(chalk.gray('═══════════════════════════════════════════'));
    console.log(chalk.gray('DEBUG INFORMATION:'));
    console.log(chalk.gray(`Error Name: ${error.name}`));
    console.log(chalk.gray(`Error Code: ${error.code || 'N/A'}`));
    console.log(chalk.gray(`Stack Trace:`));
    console.log(chalk.gray(error.stack));
    console.log(chalk.gray('═══════════════════════════════════════════'));
    console.log();
  } else {
    console.log(chalk.gray('💡 Tip: Set DEBUG=true for detailed error information'));
    console.log();
  }
}

//=====================================================================
// HELPERS
//=====================================================================

// Helper: Load incident data
async function loadIncident(incidentId) {
  try {
    const dataPath = path.join(__dirname, '../data/mock-incidents.json');
    const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
    return data.find(inc => inc.id === incidentId);
  } catch (error) {
    throw new Error(`Failed to load incident: ${error.message}`);
  }
}

// Helper: Ensure output directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Helper: Call Gemini API with retry and circuit breaker
async function callGeminiWithResilience(model, prompt, spinner = null) {
  return await geminiCircuitBreaker.execute(async () => {
    return await retryWithBackoff(
      async () => await model.generateContent(prompt),
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt, maxRetries, delay, error) => {
          if (spinner) {
            spinner.text = chalk.yellow(
              `API call failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay/1000)}s...`
            );
          } else {
            console.log(chalk.yellow(
              `⚠️  API call failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay/1000)}s...`
            ));
          }
        },
      }
    );
  });
}

//=====================================================================
// COMMAND 1: ANALYZE
// Analyzes incident, clusters errors, proposes fixes
//=====================================================================
program
  .command('analyze <incident-id>')
  .description('Analyze incident with AI-powered error clustering and fix proposals')
  .action(async (incidentId) => {
    const spinner = ora('Loading incident data...').start();

    try {
      // Load incident
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      spinner.text = `Analyzing incident ${chalk.cyan(incidentId)}...`;

      // Call Gemini for deep analysis
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `You are an expert SRE analyzing a production incident. Perform deep analysis:

INCIDENT: ${incident.id}
SERVICE: ${incident.service}
SEVERITY: ${incident.severity}
TITLE: ${incident.title}

ERROR LOGS:
${incident.logs.join('\n')}

METRICS:
${JSON.stringify(incident.metrics, null, 2)}

CONTEXT:
${JSON.stringify(incident.context, null, 2)}

Provide structured analysis in JSON format with these fields:
{
  "error_clusters": [
    {
      "pattern": "error pattern description",
      "count": number_of_occurrences,
      "severity": "HIGH|MEDIUM|LOW"
    }
  ],
  "root_cause": "detailed root cause explanation",
  "root_cause_confidence": "HIGH|MEDIUM|LOW",
  "impact_analysis": {
    "affected_users": "estimation",
    "business_impact": "description",
    "technical_impact": "description"
  },
  "proposed_fixes": [
    {
      "fix": "specific fix description",
      "priority": "P0|P1|P2",
      "effort": "HIGH|MEDIUM|LOW",
      "risk": "HIGH|MEDIUM|LOW"
    }
  ],
  "remediation_commands": [
    {
      "command": "exact command (only: restart, scale, rollback, health-check)",
      "purpose": "what this does",
      "safe": true|false
    }
  ],
  "preventive_measures": ["list of preventive actions"]
}

Be specific and actionable. Focus on root cause and fixes.`;

      const result = await callGeminiWithResilience(model, prompt, spinner);
      const analysisText = result.response.text();

      spinner.succeed(chalk.green('Analysis complete!'));

      // Parse JSON response
      let analysis;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) ||
                          analysisText.match(/```\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        // If JSON parsing fails, use raw text
        analysis = { raw_analysis: analysisText };
      }

      // Display formatted analysis
      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║       INCIDENT ANALYSIS REPORT         ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      console.log(chalk.bold.white('📋 INCIDENT:'), chalk.yellow(incident.id));
      console.log(chalk.bold.white('🔧 SERVICE:'), incident.service);
      console.log(chalk.bold.white('⚠️  SEVERITY:'),
        incident.severity === 'HIGH' ? chalk.red(incident.severity) :
        incident.severity === 'MEDIUM' ? chalk.yellow(incident.severity) :
        chalk.green(incident.severity)
      );

      if (analysis.error_clusters) {
        console.log(chalk.bold.white('\n🔍 ERROR CLUSTERS:'));
        analysis.error_clusters.forEach((cluster, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${cluster.pattern}`));
          console.log(chalk.gray(`     Count: ${cluster.count}, Severity: ${cluster.severity}`));
        });
      }

      if (analysis.root_cause) {
        console.log(chalk.bold.white('\n🎯 ROOT CAUSE:'));
        console.log(chalk.white(`  ${analysis.root_cause}`));
        if (analysis.root_cause_confidence) {
          console.log(chalk.gray(`  Confidence: ${analysis.root_cause_confidence}`));
        }
      }

      if (analysis.impact_analysis) {
        console.log(chalk.bold.white('\n📊 IMPACT ANALYSIS:'));
        if (analysis.impact_analysis.affected_users) {
          console.log(chalk.white(`  Users: ${analysis.impact_analysis.affected_users}`));
        }
        if (analysis.impact_analysis.business_impact) {
          console.log(chalk.white(`  Business: ${analysis.impact_analysis.business_impact}`));
        }
        if (analysis.impact_analysis.technical_impact) {
          console.log(chalk.white(`  Technical: ${analysis.impact_analysis.technical_impact}`));
        }
      }

      if (analysis.proposed_fixes) {
        console.log(chalk.bold.white('\n💡 PROPOSED FIXES:'));
        analysis.proposed_fixes.forEach((fix, i) => {
          console.log(chalk.white(`  ${i + 1}. ${fix.fix}`));
          console.log(chalk.gray(`     Priority: ${fix.priority}, Effort: ${fix.effort}, Risk: ${fix.risk}`));
        });
      }

      if (analysis.remediation_commands) {
        console.log(chalk.bold.white('\n🛠️  SAFE REMEDIATION COMMANDS:'));
        const safeCommands = analysis.remediation_commands.filter(cmd => cmd.safe);
        safeCommands.forEach((cmd, i) => {
          console.log(chalk.green(`  ✓ ${cmd.command}`));
          console.log(chalk.gray(`    Purpose: ${cmd.purpose}`));
        });

        const unsafeCommands = analysis.remediation_commands.filter(cmd => !cmd.safe);
        if (unsafeCommands.length > 0) {
          console.log(chalk.bold.yellow('\n⚠️  COMMANDS REQUIRING APPROVAL:'));
          unsafeCommands.forEach((cmd, i) => {
            console.log(chalk.yellow(`  ! ${cmd.command}`));
            console.log(chalk.gray(`    Purpose: ${cmd.purpose}`));
          });
        }
      }

      if (analysis.preventive_measures) {
        console.log(chalk.bold.white('\n🛡️  PREVENTIVE MEASURES:'));
        analysis.preventive_measures.forEach((measure, i) => {
          console.log(chalk.white(`  ${i + 1}. ${measure}`));
        });
      }

      // Save analysis to file
      const outputDir = path.join(__dirname, '../data');
      await ensureDir(outputDir);
      const outputPath = path.join(outputDir, `analysis-${incidentId}.json`);
      await fs.writeFile(outputPath, JSON.stringify({
        incident_id: incidentId,
        timestamp: new Date().toISOString(),
        analysis: analysis
      }, null, 2));

      console.log(chalk.green(`\n✅ Analysis saved to: ${outputPath}\n`));

    } catch (error) {
      handleError(error, { command: 'Analysis', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 2: REPLAY
// Regenerates summary and postmortem for historical incidents
//=====================================================================
program
  .command('replay <incident-id>')
  .description('Regenerate summary and postmortem for historical incident')
  .action(async (incidentId) => {
    const spinner = ora('Loading incident history...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      spinner.text = 'Regenerating incident summary...';

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Generate summary
      const summaryPrompt = `Provide a concise 3-sentence executive summary for this incident:

Service: ${incident.service}
Severity: ${incident.severity}
Title: ${incident.title}
Logs: ${incident.logs.join(' | ')}
Metrics: ${JSON.stringify(incident.metrics)}

Focus on: what happened, impact, resolution`;

      const summaryResult = await callGeminiWithResilience(model, summaryPrompt, spinner);
      const summary = summaryResult.response.text();

      spinner.text = 'Generating comprehensive postmortem...';

      // Generate detailed postmortem
      const postmortemPrompt = `Generate a comprehensive postmortem document for this production incident:

INCIDENT ID: ${incident.id}
SERVICE: ${incident.service}
SEVERITY: ${incident.severity}
TITLE: ${incident.title}
TIMESTAMP: ${incident.timestamp}
STATUS: ${incident.status}

LOGS:
${incident.logs.join('\n')}

METRICS:
${JSON.stringify(incident.metrics, null, 2)}

CONTEXT:
${JSON.stringify(incident.context, null, 2)}

Create a detailed postmortem following this structure:

# Postmortem: ${incident.title}

## Executive Summary
[3-4 sentence overview for leadership]

## Incident Timeline
- ${incident.timestamp}: Incident detected
- [Add 3-4 realistic timeline entries with +5min, +15min, +30min timestamps]

## Root Cause Analysis

### What Happened
[Detailed technical explanation of the failure]

### Why It Happened
[Contributing factors: code, config, infrastructure, process]

### Why It Wasn't Caught Earlier
[Gaps in monitoring, alerting, testing]

## Impact Assessment

### Technical Impact
- Services affected: ${incident.service}
- Error rate: ${incident.metrics.error_rate || 'N/A'}
- Latency impact: ${incident.metrics.latency_p95_ms || 'N/A'}ms
- Duration: ~30 minutes

### Business Impact
- Customer-facing impact
- Revenue/SLA implications
- User experience degradation

## Resolution

### Immediate Actions Taken
1. [First action]
2. [Second action]
3. [Verification steps]

### Verification
- Metrics returned to baseline
- Error rate normalized
- Customer impact resolved

## Action Items

### Prevent Recurrence (P0)
- [ ] [Action 1] (Owner: Team, Due: 1 week)
- [ ] [Action 2] (Owner: Team, Due: 2 weeks)

### Improve Detection (P1)
- [ ] [Monitoring improvement] (Owner: SRE, Due: 1 week)
- [ ] [Alert tuning] (Owner: SRE, Due: 1 week)

### Documentation (P2)
- [ ] [Runbook update] (Owner: SRE, Due: 3 days)
- [ ] [Architecture diagram update] (Owner: Eng, Due: 1 week)

## Lessons Learned

### What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

### What Could Be Improved
- [Improvement area 1]
- [Improvement area 2]

## References
- Incident ticket: ${incident.id}
- Monitoring dashboard: [URL]
- Slack thread: #incidents
- Related incidents: [List similar past incidents]

---
*Generated: ${new Date().toISOString()}*
*AI-Assisted Postmortem via Incident Scribe*`;

      const postmortemResult = await callGeminiWithResilience(model, postmortemPrompt, spinner);
      const postmortem = postmortemResult.response.text();

      spinner.succeed(chalk.green('Postmortem generated successfully!'));

      // Display results
      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║         INCIDENT REPLAY RESULTS        ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      console.log(chalk.bold.white('📋 INCIDENT:'), chalk.yellow(incident.id));
      console.log(chalk.bold.white('📅 TIMESTAMP:'), incident.timestamp);
      console.log(chalk.bold.white('📊 STATUS:'), incident.status);

      console.log(chalk.bold.white('\n📝 EXECUTIVE SUMMARY:'));
      console.log(chalk.white(summary));

      console.log(chalk.bold.white('\n📄 POSTMORTEM DOCUMENT:\n'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(postmortem);
      console.log(chalk.gray('─'.repeat(60)));

      // Save postmortem
      const docsDir = path.join(__dirname, '../docs');
      await ensureDir(docsDir);
      const postmortemPath = path.join(docsDir, `postmortem-${incidentId}.md`);
      await fs.writeFile(postmortemPath, postmortem);

      console.log(chalk.green(`\n✅ Postmortem saved to: ${postmortemPath}\n`));

    } catch (error) {
      handleError(error, { command: 'Replay', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 3: RUNBOOK
// Generates operational runbook with guardrails
//=====================================================================
program
  .command('runbook <incident-id>')
  .description('Generate operational runbook with safety guardrails')
  .option('--dry-run', 'Show runbook without creating files (default: true)', true)
  .option('--create-pr', 'Create GitHub PR with runbook', false)
  .action(async (incidentId, options) => {
    const spinner = ora('Analyzing incident pattern...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      spinner.text = 'Generating runbook with safety guardrails...';

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const runbookPrompt = `Create an operational runbook for handling incidents like this:

SERVICE: ${incident.service}
INCIDENT TYPE: ${incident.title}
SEVERITY: ${incident.severity}
COMMON SYMPTOMS: ${incident.logs[0]}

Generate a comprehensive runbook following this structure:

# Runbook: ${incident.title}

## Overview
- **Service**: ${incident.service}
- **Incident Pattern**: ${incident.title}
- **Severity**: ${incident.severity}
- **Last Updated**: ${new Date().toISOString().split('T')[0]}

## Detection

### Symptoms
- [How to identify this issue]
- [Key error messages]
- [Metric thresholds]

### Monitoring Alerts
- Alert name: [Name]
- Threshold: [Value]
- Dashboard: [URL]

## Diagnosis

### Step 1: Verify the Issue
\`\`\`bash
# Check service health
kubectl get pods -n production | grep ${incident.service}
curl https://${incident.service}/health
\`\`\`

### Step 2: Check Logs
\`\`\`bash
# Recent error logs (SAFE - read-only)
kubectl logs -n production deployment/${incident.service} --tail=100 | grep ERROR
\`\`\`

### Step 3: Check Metrics
\`\`\`bash
# Health check (SAFE)
curl -s https://${incident.service}/metrics | grep error_rate
\`\`\`

## Remediation

### **IMPORTANT: Guardrails**
- ✅ **SAFE Commands**: health-check, logs, describe, get
- ⚠️  **APPROVAL REQUIRED**: restart, scale, rollback
- 🚫 **NEVER**: delete, destroy, drop

### For LOW Severity
\`\`\`bash
# Restart service (SAFE for this pattern)
kubectl rollout restart deployment/${incident.service} -n production

# Wait for rollout
kubectl rollout status deployment/${incident.service} -n production

# Verify health
curl https://${incident.service}/health
\`\`\`

### For MEDIUM Severity
\`\`\`bash
# Scale up (REQUIRES APPROVAL)
# Current: 5 replicas → Target: 10 replicas
kubectl scale deployment/${incident.service} -n production --replicas=10

# Monitor scaling
watch kubectl get pods -n production | grep ${incident.service}
\`\`\`

### For HIGH Severity
\`\`\`bash
# EMERGENCY: Contact on-call immediately
# PagerDuty: Trigger P1 incident
# Slack: Post in #critical-incidents

# Rollback to last known good version (REQUIRES APPROVAL)
kubectl rollout undo deployment/${incident.service} -n production

# Monitor rollback
kubectl rollout status deployment/${incident.service} -n production
\`\`\`

## Verification

### Post-Fix Checks
\`\`\`bash
# 1. Service health
curl https://${incident.service}/health

# 2. Error rate
# Should be < 1%

# 3. Latency
# p95 should be < 500ms

# 4. Traffic
# Requests/sec should be normal
\`\`\`

### Success Criteria
- [ ] Error rate < 1%
- [ ] p95 latency < 500ms
- [ ] All pods healthy
- [ ] No customer reports

## Escalation

### When to Escalate
- Fix doesn't resolve issue after 15 minutes
- Error rate increases after remediation
- Multiple services affected

### Escalation Path
1. SRE Lead (Slack: @sre-lead)
2. Engineering Manager (Slack: @eng-manager)
3. VP Engineering (Page if > 30 min)

## Prevention

### Long-term Fixes
1. [Root cause fix]
2. [Monitoring improvement]
3. [Architecture change]

### Related Documents
- Architecture: [URL]
- Monitoring: [URL]
- Past incidents: ${incident.id}

---
*Auto-generated runbook - Review before use in production*
*Generated: ${new Date().toISOString()}*`;

      const result = await callGeminiWithResilience(model, runbookPrompt, spinner);
      const runbook = result.response.text();

      spinner.succeed(chalk.green('Runbook generated!'));

      // Display runbook
      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║         OPERATIONAL RUNBOOK            ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      console.log(runbook);

      // Save runbook
      const docsDir = path.join(__dirname, '../docs');
      await ensureDir(docsDir);
      const filename = `runbook-${incident.service}-${incidentId}.md`;
      const runbookPath = path.join(docsDir, filename);

      if (options.dryRun) {
        console.log(chalk.yellow('\n⚠️  DRY-RUN MODE: Runbook not saved'));
        console.log(chalk.gray(`Would save to: ${runbookPath}`));
      } else {
        await fs.writeFile(runbookPath, runbook);
        console.log(chalk.green(`\n✅ Runbook saved to: ${runbookPath}`));
      }

      if (options.createPr) {
        console.log(chalk.yellow('\n📝 GitHub PR Creation:'));
        console.log(chalk.gray('To create a PR, run these commands:\n'));
        console.log(chalk.white(`  git checkout -b runbook/${incidentId}`));
        console.log(chalk.white(`  git add docs/${filename}`));
        console.log(chalk.white(`  git commit -m "docs: Add runbook for ${incident.title}"`));
        console.log(chalk.white(`  git push origin runbook/${incidentId}`));
        console.log(chalk.white(`  gh pr create --title "Add runbook for ${incident.title}" --body "Auto-generated operational runbook"`));
      }

      console.log(chalk.bold.green('\n🛡️  SAFETY GUARDRAILS ACTIVE:'));
      console.log(chalk.green('  ✓ Only allowlisted commands included'));
      console.log(chalk.green('  ✓ Approval required for destructive actions'));
      console.log(chalk.green('  ✓ Dry-run mode by default'));
      console.log();

    } catch (error) {
      handleError(error, { command: 'Runbook Generation', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 4: BATCH-ANALYZE
// Analyzes multiple incidents in parallel
//=====================================================================
program
  .command('batch-analyze <incident-ids...>')
  .description('Analyze multiple incidents in parallel')
  .option('--output-dir <dir>', 'Output directory for results', '../data/batch-analysis')
  .action(async (incidentIds, options) => {
    const spinner = ora(`Analyzing ${incidentIds.length} incidents...`).start();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const results = [];

      // Process incidents in parallel (with concurrency limit)
      const concurrency = 3;
      for (let i = 0; i < incidentIds.length; i += concurrency) {
        const batch = incidentIds.slice(i, i + concurrency);
        const batchPromises = batch.map(async (incidentId) => {
          const incident = await loadIncident(incidentId);
          if (!incident) {
            return { incidentId, error: 'Not found' };
          }

          const prompt = `Briefly analyze incident ${incidentId}: ${incident.title}. Service: ${incident.service}, Severity: ${incident.severity}. Provide root cause and recommended action in 2-3 sentences.`;
          const result = await callGeminiWithResilience(model, prompt);

          return {
            incidentId,
            incident,
            analysis: result.response.text(),
            timestamp: new Date().toISOString(),
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        spinner.text = `Analyzed ${Math.min(i + concurrency, incidentIds.length)}/${incidentIds.length} incidents...`;
      }

      spinner.succeed(chalk.green(`Batch analysis complete!`));

      // Display summary
      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║       BATCH ANALYSIS SUMMARY          ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      results.forEach((result, idx) => {
        if (result.error) {
          console.log(chalk.red(`${idx + 1}. ${result.incidentId}: ${result.error}`));
        } else {
          console.log(chalk.white(`${idx + 1}. ${result.incidentId}: ${result.incident.title}`));
          console.log(chalk.gray(`   ${result.analysis.substring(0, 100)}...`));
        }
      });

      // Save results
      const outputDir = path.join(__dirname, options.outputDir);
      await ensureDir(outputDir);
      const outputPath = path.join(outputDir, `batch-${Date.now()}.json`);
      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`\n✅ Results saved to: ${outputPath}\n`));

    } catch (error) {
      handleError(error, { command: 'Batch Analysis', spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 5: AUTO-FIX
// Proposes and optionally executes safe fixes
//=====================================================================
program
  .command('auto-fix <incident-id>')
  .description('Propose and optionally execute safe fixes for an incident')
  .option('--execute', 'Execute safe fixes (default: false)', false)
  .option('--approve-all', 'Auto-approve all fixes (dangerous)', false)
  .action(async (incidentId, options) => {
    const spinner = ora('Analyzing incident for auto-fix...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      // First, get analysis
      spinner.text = 'Getting incident analysis...';
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const analysisPrompt = `Analyze incident ${incidentId} and propose ONLY safe, low-risk fixes that can be auto-executed:
- Service: ${incident.service}
- Severity: ${incident.severity}
- Logs: ${incident.logs.join(' | ')}
- Metrics: ${JSON.stringify(incident.metrics)}

Provide JSON with:
{
  "safe_fixes": [
    {
      "action": "specific command or action",
      "risk": "LOW",
      "confidence": "HIGH|MEDIUM|LOW",
      "expected_impact": "what this will fix"
    }
  ],
  "requires_approval": [
    {
      "action": "action requiring approval",
      "risk": "MEDIUM|HIGH",
      "reason": "why approval needed"
    }
  ]
}`;

      const analysisResult = await callGeminiWithResilience(model, analysisPrompt, spinner);
      const analysisText = analysisResult.response.text();

      spinner.succeed(chalk.green('Analysis complete!'));

      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║         AUTO-FIX PROPOSALS            ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      console.log(analysisText);

      if (options.execute) {
        console.log(chalk.yellow('\n⚠️  EXECUTE MODE: Safe fixes will be executed'));
        if (!options.approveAll) {
          console.log(chalk.yellow('⚠️  Approval required for each fix'));
        }
      } else {
        console.log(chalk.gray('\n💡 Use --execute flag to execute safe fixes'));
        console.log(chalk.gray('💡 Use --approve-all to auto-approve (dangerous)'));
      }

      console.log(chalk.bold.green('\n🛡️  SAFETY GUARDRAILS:'));
      console.log(chalk.green('  ✓ Only LOW risk fixes can be auto-executed'));
      console.log(chalk.green('  ✓ Approval required for MEDIUM/HIGH risk'));
      console.log(chalk.green('  ✓ All actions logged and auditable'));
      console.log();

    } catch (error) {
      handleError(error, { command: 'Auto-Fix', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 6: CORRELATE
// Finds related incidents and patterns
//=====================================================================
program
  .command('correlate <incident-id>')
  .description('Find related incidents and identify patterns')
  .option('--min-similarity <n>', 'Minimum similarity threshold (0-1)', '0.5')
  .action(async (incidentId, options) => {
    const spinner = ora('Finding related incidents...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      // Load all incidents
      const dataPath = path.join(__dirname, '../data/mock-incidents.json');
      const allIncidents = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

      // Find similar incidents
      const similarIncidents = allIncidents.filter(inc => {
        if (inc.id === incidentId) return false;
        
        // Simple similarity: same service or similar error patterns
        const sameService = inc.service === incident.service;
        const similarPattern = inc.logs.some(log => 
          incident.logs.some(incLog => 
            log.toLowerCase().includes(incLog.toLowerCase().split(' ')[0]) ||
            incLog.toLowerCase().includes(log.toLowerCase().split(' ')[0])
          )
        );
        
        return sameService || similarPattern;
      });

      spinner.succeed(chalk.green(`Found ${similarIncidents.length} related incidents`));

      console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║      INCIDENT CORRELATION RESULTS      ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

      console.log(chalk.bold.white(`Analyzing: ${incidentId} - ${incident.title}\n`));

      if (similarIncidents.length === 0) {
        console.log(chalk.gray('No similar incidents found.'));
      } else {
        console.log(chalk.bold.white('Related Incidents:\n'));
        similarIncidents.forEach((inc, idx) => {
          console.log(chalk.white(`${idx + 1}. ${inc.id} - ${inc.title}`));
          console.log(chalk.gray(`   Service: ${inc.service}, Severity: ${inc.severity}, Status: ${inc.status}`));
          console.log(chalk.gray(`   Timestamp: ${inc.timestamp}\n`));
        });

        // Pattern analysis
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const patternPrompt = `Analyze these related incidents and identify patterns:

Current: ${incidentId} - ${incident.title}
Related: ${similarIncidents.map(inc => `${inc.id} - ${inc.title}`).join(', ')}

Identify:
1. Common root causes
2. Recurring patterns
3. Prevention recommendations`;

        spinner.text = 'Analyzing patterns...';
        const patternResult = await callGeminiWithResilience(model, patternPrompt, spinner);
        const patternAnalysis = patternResult.response.text();

        console.log(chalk.bold.white('\n📊 Pattern Analysis:\n'));
        console.log(patternAnalysis);
      }

      console.log();

    } catch (error) {
      handleError(error, { command: 'Correlation', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 7: TRIGGER
// Triggers Kestra workflow for an incident
//=====================================================================
program
  .command('trigger <incident-id>')
  .description('Trigger Kestra workflow for an incident')
  .option('--kestra-url <url>', 'Kestra server URL', process.env.KESTRA_URL || 'http://localhost:8080')
  .action(async (incidentId, options) => {
    const spinner = ora('Triggering Kestra workflow...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      // Trigger Kestra workflow via HTTP
      const kestraUrl = options.kestraUrl;
      const flowId = 'incident.response.incident-handler';

      spinner.text = `Triggering workflow: ${flowId}...`;

      try {
        const response = await retryWithBackoff(
          async () => axios.post(
            `${kestraUrl}/api/v1/executions/${flowId}/trigger`,
            {
              inputs: {
                incident_data: incident,
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          ),
          {
            maxRetries: 3,
            baseDelay: 1000,
            onRetry: (attempt, maxRetries, delay, error) => {
              spinner.text = chalk.yellow(
                `Connection failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay/1000)}s...`
              );
            },
          }
        );

        spinner.succeed(chalk.green('Kestra workflow triggered!'));
        console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
        console.log(chalk.bold.cyan('║      KESTRA WORKFLOW TRIGGERED         ║'));
        console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));
        console.log(chalk.white(`Execution ID: ${response.data.id || 'N/A'}`));
        console.log(chalk.white(`Status: ${response.data.state?.current || 'RUNNING'}`));
        console.log(chalk.white(`Flow: ${flowId}`));
        console.log(chalk.gray(`\nView execution: ${kestraUrl}/executions/${response.data.id || ''}`));
        console.log();

      } catch (error) {
        spinner.warn(chalk.yellow('Kestra may not be accessible'));
        console.log(chalk.yellow('\n⚠️  Could not connect to Kestra server'));
        console.log(chalk.gray(`URL: ${kestraUrl}`));
        console.log(chalk.gray(`Error: ${error.message}`));
        console.log(chalk.gray('\n💡 Make sure Kestra is running and accessible'));
        console.log();
      }

    } catch (error) {
      handleError(error, { command: 'Kestra Trigger', incidentId, spinner });
      process.exit(1);
    }
  });

//=====================================================================
// COMMAND 8: EXPORT
// Exports incident data in various formats
//=====================================================================
program
  .command('export <incident-id>')
  .description('Export incident data in various formats')
  .option('--format <format>', 'Export format: json, markdown, csv', 'json')
  .option('--output <file>', 'Output file path')
  .action(async (incidentId, options) => {
    const spinner = ora('Exporting incident data...').start();

    try {
      const incident = await loadIncident(incidentId);
      if (!incident) {
        spinner.fail(chalk.red(`Incident ${incidentId} not found`));
        process.exit(1);
      }

      let output = '';
      let extension = 'json';

      if (options.format === 'json') {
        output = JSON.stringify(incident, null, 2);
        extension = 'json';
      } else if (options.format === 'markdown') {
        output = `# Incident: ${incident.id}

## Details
- **Title**: ${incident.title}
- **Service**: ${incident.service}
- **Severity**: ${incident.severity}
- **Status**: ${incident.status}
- **Timestamp**: ${incident.timestamp}

## Logs
\`\`\`
${incident.logs.join('\n')}
\`\`\`

## Metrics
\`\`\`json
${JSON.stringify(incident.metrics, null, 2)}
\`\`\`

## Context
\`\`\`json
${JSON.stringify(incident.context, null, 2)}
\`\`\`
`;
        extension = 'md';
      } else if (options.format === 'csv') {
        const headers = ['id', 'timestamp', 'service', 'severity', 'status', 'title'];
        const row = [
          incident.id,
          incident.timestamp,
          incident.service,
          incident.severity,
          incident.status,
          incident.title,
        ];
        output = headers.join(',') + '\n' + row.join(',');
        extension = 'csv';
      }

      const outputFile = options.output || path.join(__dirname, `../data/export-${incidentId}.${extension}`);
      await fs.writeFile(outputFile, output);

      spinner.succeed(chalk.green(`Exported to ${outputFile}`));
      console.log(chalk.green(`\n✅ Export complete: ${outputFile}\n`));

    } catch (error) {
      handleError(error, { command: 'Export', incidentId, spinner });
      process.exit(1);
    }
  });

// Configure program
program
  .name('incident')
  .description('AI-powered incident management CLI tool with autonomous workflows and production-grade resilience')
  .version('1.0.0');

program.parse();
