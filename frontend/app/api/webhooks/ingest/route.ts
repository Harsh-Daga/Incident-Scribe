import { NextRequest, NextResponse } from 'next/server';
import { createIncident } from '@/lib/supabase-queries';
import { triggerKestraWorkflowDirect } from '@/lib/kestra';

// Webhook payload normalization
interface DatadogWebhook {
  id: string;
  title: string;
  body: string;
  date: number;
  priority: string;
  tags: string[];
}

interface PagerDutyWebhook {
  messages: Array<{
    id: string;
    event: string;
    incident: {
      title: string;
      urgency: string;
      service: { name: string };
      created_at: string;
    };
  }>;
}

interface CloudWatchAlarm {
  AlarmName: string;
  NewStateValue: string;
  NewStateReason: string;
  StateChangeTime: string;
  AlarmDescription?: string;
  Trigger: {
    MetricName: string;
    Namespace: string;
    Dimensions?: Array<{ name: string; value: string }>;
  };
}

interface GenericWebhook {
  title: string;
  service: string;
  severity?: string;
  logs?: string[];
  metrics?: Record<string, any>;
  context?: Record<string, any>;
}

function normalizeDatadog(payload: DatadogWebhook) {
  const service = payload.tags.find(t => t.startsWith('service:'))?.split(':')[1] || 'unknown';
  const severity = payload.priority === 'normal' ? 'MEDIUM' : 'HIGH';

  return {
    external_id: `DD-${payload.id}`,
    source: 'datadog',
    timestamp: new Date(payload.date * 1000).toISOString(),
    service,
    severity,
    status: 'open' as const,
    title: payload.title,
    description: payload.body,
    logs: [payload.body],
    metrics: {},
    context: { tags: payload.tags }
  };
}

function normalizePagerDuty(payload: PagerDutyWebhook) {
  const message = payload.messages[0];
  const severity = message.incident.urgency === 'high' ? 'HIGH' : 'MEDIUM';

  return {
    external_id: `PD-${message.id}`,
    source: 'pagerduty',
    timestamp: message.incident.created_at,
    service: message.incident.service.name,
    severity,
    status: 'open' as const,
    title: message.incident.title,
    logs: [],
    metrics: {},
    context: { urgency: message.incident.urgency }
  };
}

function normalizeCloudWatch(payload: CloudWatchAlarm) {
  const severity = payload.NewStateValue === 'ALARM' ? 'HIGH' : 'MEDIUM';
  const service = payload.Trigger.Dimensions?.find(d => d.name === 'ServiceName')?.value || 'cloudwatch';

  return {
    external_id: `CW-${payload.AlarmName}-${Date.now()}`,
    source: 'cloudwatch',
    timestamp: payload.StateChangeTime,
    service,
    severity,
    status: 'open' as const,
    title: payload.AlarmName,
    description: payload.NewStateReason,
    logs: [payload.NewStateReason],
    metrics: { metric: payload.Trigger.MetricName, namespace: payload.Trigger.Namespace },
    context: { alarm_description: payload.AlarmDescription || '' }
  };
}

function normalizeGeneric(payload: GenericWebhook) {
  return {
    external_id: `GEN-${Date.now()}`,
    source: 'generic',
    timestamp: new Date().toISOString(),
    service: payload.service,
    severity: (payload.severity?.toUpperCase() as any) || 'MEDIUM',
    status: 'open' as const,
    title: payload.title,
    logs: payload.logs || [],
    metrics: payload.metrics || {},
    context: payload.context || {}
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const source = req.nextUrl.searchParams.get('source') || 'generic';

    let normalizedIncident;

    switch (source) {
      case 'datadog':
        normalizedIncident = normalizeDatadog(payload);
        break;
      case 'pagerduty':
        normalizedIncident = normalizePagerDuty(payload);
        break;
      case 'cloudwatch':
        normalizedIncident = normalizeCloudWatch(payload);
        break;
      case 'generic':
      default:
        normalizedIncident = normalizeGeneric(payload);
        break;
    }

    // Save to Supabase
    const incident = await createIncident(normalizedIncident);

    // Auto-trigger Kestra workflow for HIGH/CRITICAL severity
    if (incident.severity === 'HIGH' || incident.severity === 'CRITICAL') {
      try {
        await triggerKestraWorkflowDirect({
          id: incident.external_id,
          timestamp: incident.timestamp,
          service: incident.service,
          severity: incident.severity,
          status: incident.status,
          title: incident.title,
          logs: incident.logs,
          metrics: incident.metrics,
          context: incident.context
        });
      } catch (error) {
        console.error('Failed to trigger Kestra workflow:', error);
        // Don't fail the webhook - incident is saved
      }
    }

    return NextResponse.json({
      success: true,
      incident_id: incident.external_id,
      message: 'Incident created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Webhook ingestion error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
