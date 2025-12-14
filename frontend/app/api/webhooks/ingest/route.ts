import { NextRequest, NextResponse } from 'next/server';
import { createIncident, getOrganizationByWebhookKey } from '@/lib/supabase-queries';
import { triggerKestraWorkflowDirect } from '@/lib/kestra';

// Simple in-memory rate limiting (per webhook key)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(webhookKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(webhookKey);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(webhookKey, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// Valid severity values
const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// Webhook payload interfaces
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

interface PrometheusAlert {
  alerts: Array<{
    status: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt?: string;
  }>;
}

interface GenericWebhook {
  id?: string;
  title: string;
  service: string;
  severity?: string;
  logs?: string[];
  metrics?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: string;
}

function normalizeDatadog(payload: DatadogWebhook) {
  const service = payload.tags?.find(t => t.startsWith('service:'))?.split(':')[1] || 'unknown';
  const severity = (payload.priority === 'normal' ? 'MEDIUM' : 'HIGH') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  return {
    external_id: `DD-${payload.id}`,
    source: 'datadog' as const,
    timestamp: new Date(payload.date * 1000).toISOString(),
    service,
    severity,
    status: 'open' as const,
    title: payload.title || 'Datadog Alert',
    description: payload.body,
    logs: payload.body ? [payload.body] : [],
    metrics: {},
    context: { tags: payload.tags || [] }
  };
}

function normalizePagerDuty(payload: PagerDutyWebhook) {
  const message = payload.messages?.[0];
  if (!message) {
    throw new Error('Invalid PagerDuty payload: missing messages');
  }

  const severity = (message.incident.urgency === 'high' ? 'HIGH' : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  return {
    external_id: `PD-${message.id}`,
    source: 'pagerduty' as const,
    timestamp: message.incident.created_at || new Date().toISOString(),
    service: message.incident.service?.name || 'unknown',
    severity,
    status: 'open' as const,
    title: message.incident.title || 'PagerDuty Incident',
    logs: [] as string[],
    metrics: {},
    context: { urgency: message.incident.urgency, event: message.event }
  };
}

function normalizeCloudWatch(payload: CloudWatchAlarm) {
  const severity = (payload.NewStateValue === 'ALARM' ? 'HIGH' : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  const service = payload.Trigger?.Dimensions?.find(d => d.name === 'ServiceName')?.value || 'cloudwatch';

  return {
    external_id: `CW-${payload.AlarmName}-${Date.now()}`,
    source: 'cloudwatch' as const,
    timestamp: payload.StateChangeTime || new Date().toISOString(),
    service,
    severity,
    status: 'open' as const,
    title: payload.AlarmName || 'CloudWatch Alarm',
    description: payload.NewStateReason,
    logs: payload.NewStateReason ? [payload.NewStateReason] : [],
    metrics: { 
      metric: payload.Trigger?.MetricName, 
      namespace: payload.Trigger?.Namespace 
    },
    context: { alarm_description: payload.AlarmDescription || '' }
  };
}

function normalizePrometheus(payload: PrometheusAlert) {
  const alert = payload.alerts?.[0];
  if (!alert) {
    throw new Error('Invalid Prometheus payload: missing alerts');
  }

  const severityLabel = alert.labels?.severity?.toUpperCase();
  const severity = (VALID_SEVERITIES.includes(severityLabel) ? severityLabel : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  return {
    external_id: `PROM-${alert.labels?.alertname || 'unknown'}-${Date.now()}`,
    source: 'prometheus' as const,
    timestamp: alert.startsAt || new Date().toISOString(),
    service: alert.labels?.service || alert.labels?.job || 'prometheus',
    severity,
    status: 'open' as const,
    title: alert.annotations?.summary || alert.labels?.alertname || 'Prometheus Alert',
    description: alert.annotations?.description,
    logs: alert.annotations?.description ? [alert.annotations.description] : [],
    metrics: {},
    context: { labels: alert.labels, annotations: alert.annotations }
  };
}

function normalizeGeneric(payload: GenericWebhook) {
  // Validate required fields
  if (!payload.service) {
    throw new Error('Missing required field: service');
  }
  if (!payload.title) {
    throw new Error('Missing required field: title');
  }

  // Normalize and validate severity
  let severityRaw = payload.severity?.toUpperCase() || 'MEDIUM';
  if (!VALID_SEVERITIES.includes(severityRaw)) {
    severityRaw = 'MEDIUM';
  }
  const severity = severityRaw as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  return {
    external_id: payload.id || `GEN-${Date.now()}`,
    source: 'generic' as const,
    timestamp: payload.timestamp || new Date().toISOString(),
    service: payload.service,
    severity,
    status: 'open' as const,
    title: payload.title,
    logs: payload.logs || [],
    metrics: payload.metrics || {},
    context: payload.context || {}
  };
}

export async function POST(req: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Extract webhook key from header or query param
    const webhookKey = req.headers.get('x-webhook-key') || req.nextUrl.searchParams.get('key');

    if (!webhookKey) {
      console.warn(`[${requestId}] Missing webhook key`);
      return NextResponse.json(
        { 
          error: 'Missing webhook key',
          details: 'Include X-Webhook-Key header or ?key= parameter',
          request_id: requestId
        },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(webhookKey)) {
      console.warn(`[${requestId}] Rate limit exceeded for webhook key`);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          details: `Maximum ${RATE_LIMIT} requests per minute`,
          request_id: requestId
        },
        { status: 429 }
      );
    }

    // Validate webhook key exists in database
    const organization = await getOrganizationByWebhookKey(webhookKey).catch((error) => {
      console.warn(`[${requestId}] Invalid webhook key:`, error);
      return null;
    });

    if (!organization) {
      return NextResponse.json(
        { 
          error: 'Invalid webhook key',
          details: 'Webhook key not found in database',
          request_id: requestId
        },
        { status: 401 }
      );
    }

    // Parse payload
    let payload;
    try {
      payload = await req.json();
    } catch (error) {
      console.warn(`[${requestId}] Invalid JSON payload`);
      return NextResponse.json(
        { 
          error: 'Invalid JSON payload',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    const source = req.nextUrl.searchParams.get('source') || 'generic';

    // Normalize based on source
    let normalizedIncident;
    try {
      switch (source.toLowerCase()) {
        case 'datadog':
          normalizedIncident = normalizeDatadog(payload);
          break;
        case 'pagerduty':
          normalizedIncident = normalizePagerDuty(payload);
          break;
        case 'cloudwatch':
          normalizedIncident = normalizeCloudWatch(payload);
          break;
        case 'prometheus':
          normalizedIncident = normalizePrometheus(payload);
          break;
        case 'generic':
        default:
          normalizedIncident = normalizeGeneric(payload);
          break;
      }
    } catch (error: any) {
      console.warn(`[${requestId}] Payload normalization failed:`, error.message);
      return NextResponse.json(
        { 
          error: 'Invalid payload format',
          details: error.message,
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // Create incident (includes idempotency check)
    const orgName = organization?.name || 'unknown';
    console.log(`[${requestId}] Creating incident:`, {
      external_id: normalizedIncident.external_id,
      service: normalizedIncident.service,
      severity: normalizedIncident.severity,
      organization: orgName
    });

    const incident = await createIncident(normalizedIncident, webhookKey);

    // Track if this was a duplicate
    const isDuplicate = incident.external_id === normalizedIncident.external_id && 
                        incident.created_at !== incident.updated_at;

    // Auto-trigger Kestra workflow for HIGH/CRITICAL severity (only for new incidents)
    let kestraResult = null;
    if (!isDuplicate && (incident.severity === 'HIGH' || incident.severity === 'CRITICAL')) {
      try {
        kestraResult = await triggerKestraWorkflowDirect({
          id: incident.external_id,
          timestamp: incident.timestamp,
          service: incident.service,
          severity: incident.severity,
          status: incident.status,
          title: incident.title,
          logs: incident.logs || [],
          metrics: incident.metrics || {},
          context: incident.context || {},
          organization_id: incident.organization_id
        });
        console.log(`[${requestId}] Kestra workflow triggered:`, kestraResult);
      } catch (error: any) {
        console.error(`[${requestId}] Failed to trigger Kestra workflow:`, error.message);
        // Don't fail the webhook - incident is saved
      }
    }

    const response: any = {
      success: true,
      incident_id: incident.external_id,
      internal_id: incident.id,
      organization_id: incident.organization_id,
      severity: incident.severity,
      is_duplicate: isDuplicate,
      request_id: requestId
    };

    if (kestraResult) {
      response.kestra = {
        triggered: kestraResult.success,
        execution_id: kestraResult.executionId
      };
    }

    return NextResponse.json(response, { status: isDuplicate ? 200 : 201 });

  } catch (error: any) {
    console.error(`[${requestId}] Webhook ingestion error:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        request_id: requestId
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    supported_sources: ['datadog', 'pagerduty', 'cloudwatch', 'prometheus', 'generic'],
    rate_limit: `${RATE_LIMIT} requests per minute per webhook key`,
    documentation: 'POST /api/webhooks/ingest?source=<source>&key=<webhook_key>'
  });
}
