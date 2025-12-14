import { NextRequest, NextResponse } from 'next/server';
import { notifyRemediationAction } from '@/lib/slack';
import { getIncident } from '@/lib/api';

// Allowlisted safe commands that can be executed
const SAFE_COMMANDS = [
  'kubectl scale',
  'kubectl rollout restart',
  'kubectl rollout undo',
  'kubectl set env',
  'redis-cli FLUSHALL',
  'curl -X POST.*health-check',
];

interface ExecutionLog {
  timestamp: string;
  incidentId: string;
  action: string;
  risk: string;
  dryRun: boolean;
  result: string;
  user: string;
}

// In-memory log (in production, this would be in a database)
const executionLogs: ExecutionLog[] = [];

export async function POST(req: NextRequest) {
  try {
    const { incidentId, action, risk, dryRun } = await req.json();

    if (!incidentId || !action || !risk) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the command is in the allowlist
    const isSafe = SAFE_COMMANDS.some(pattern => {
      const regex = new RegExp(`^${pattern}`);
      return regex.test(action);
    });

    if (!isSafe) {
      return NextResponse.json(
        {
          success: false,
          message: 'Command not in allowlist. Manual execution required.',
          error: 'UNSAFE_COMMAND'
        },
        { status: 403 }
      );
    }

    // Log the execution attempt
    const log: ExecutionLog = {
      timestamp: new Date().toISOString(),
      incidentId,
      action,
      risk,
      dryRun: dryRun || false,
      result: 'pending',
      user: 'system' // In production, use actual user from auth
    };

    executionLogs.push(log);

    // Simulate command execution
    // In production, this would:
    // 1. Use Kestra workflow for execution
    // 2. Run kubectl commands via secure API
    // 3. Implement approval workflow for high-risk actions
    // 4. Use proper authentication and authorization

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `DRY-RUN: Command validated and would execute: ${action}`,
        dryRun: true,
        log: {
          executionId: `exec-${Date.now()}`,
          status: 'dry-run-success',
          output: `[DRY-RUN] Command: ${action}\n[DRY-RUN] Risk Level: ${risk}\n[DRY-RUN] Would execute successfully`
        }
      });
    }

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful execution
    const result = {
      success: true,
      message: `Action executed successfully: ${action}`,
      executionId: `exec-${Date.now()}`,
      output: `Command executed: ${action}\nStatus: SUCCESS\nTimestamp: ${new Date().toISOString()}`
    };

    // Update log
    log.result = 'success';

    // Send Slack notification (non-blocking)
    try {
      const incident = await getIncident(incidentId);
      await notifyRemediationAction(incident, action, true, result.output);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error executing remediation:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to execute action',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve execution logs
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const incidentId = url.searchParams.get('incidentId');

  if (incidentId) {
    const logs = executionLogs.filter(log => log.incidentId === incidentId);
    return NextResponse.json({ logs });
  }

  return NextResponse.json({ logs: executionLogs });
}
