import { NextRequest, NextResponse } from 'next/server';
import { Incident } from '@/types/incident';
import { notifyIncidentCreated } from '@/lib/slack';
import fs from 'fs';
import path from 'path';

// Load existing incidents
const getIncidents = (): Incident[] => {
  const dataPath = path.join(process.cwd(), '..', 'data', 'mock-incidents.json');
  try {
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading incidents:', error);
    return [];
  }
};

// Save incidents
const saveIncidents = (incidents: Incident[]): void => {
  const dataPath = path.join(process.cwd(), '..', 'data', 'mock-incidents.json');
  try {
    fs.writeFileSync(dataPath, JSON.stringify(incidents, null, 2));
  } catch (error) {
    console.error('Error saving incidents:', error);
  }
};

// Generate incident ID
const generateIncidentId = (): string => {
  const incidents = getIncidents();
  const maxId = incidents.reduce((max, inc) => {
    const num = parseInt(inc.id.split('-')[1], 10);
    return num > max ? num : max;
  }, 0);
  return `INC-${String(maxId + 1).padStart(3, '0')}`;
};

// Map severity from monitoring tools to our format
const mapSeverity = (severity: string): 'HIGH' | 'MEDIUM' | 'LOW' => {
  const s = severity.toLowerCase();
  if (s.includes('critical') || s.includes('high') || s.includes('p0') || s.includes('p1')) {
    return 'HIGH';
  }
  if (s.includes('medium') || s.includes('warning') || s.includes('p2')) {
    return 'MEDIUM';
  }
  return 'LOW';
};

/**
 * Webhook endpoint for auto-creating incidents from monitoring tools
 *
 * Supports multiple formats:
 * - Datadog alerts
 * - PagerDuty incidents
 * - CloudWatch alarms
 * - Prometheus alerts
 * - Generic webhook format
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Determine source and parse accordingly
    const source = req.headers.get('x-webhook-source') || 'generic';

    let incident: Partial<Incident> = {};

    switch (source.toLowerCase()) {
      case 'datadog':
        incident = parseDatadogAlert(payload);
        break;
      case 'pagerduty':
        incident = parsePagerDutyIncident(payload);
        break;
      case 'cloudwatch':
        incident = parseCloudWatchAlarm(payload);
        break;
      case 'prometheus':
        incident = parsePrometheusAlert(payload);
        break;
      default:
        incident = parseGenericWebhook(payload);
    }

    // Validate required fields
    if (!incident.service || !incident.title) {
      return NextResponse.json(
        { error: 'Missing required fields: service and title' },
        { status: 400 }
      );
    }

    // Create new incident
    const newIncident: Incident = {
      id: generateIncidentId(),
      organization_id: incident.organization_id || 'unknown', // Set from webhook context
      timestamp: incident.timestamp || new Date().toISOString(),
      service: incident.service,
      severity: incident.severity || 'MEDIUM',
      status: 'open',
      title: incident.title,
      logs: incident.logs || [],
      metrics: incident.metrics || {},
      context: incident.context || {
        host: 'unknown',
        region: 'unknown',
        version: 'unknown',
        deployment: 'unknown'
      }
    };

    // Save to incidents
    const incidents = getIncidents();
    incidents.unshift(newIncident);
    saveIncidents(incidents);

    console.log('Auto-created incident:', newIncident.id, 'from source:', source);

    // Send Slack notification
    try {
      await notifyIncidentCreated(newIncident);
      console.log('Sent Slack notification for incident:', newIncident.id);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }

    // Optionally auto-trigger Kestra workflow for high-severity incidents
    if (newIncident.severity === 'HIGH') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/kestra/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incident_data: newIncident })
        });
        console.log('Auto-triggered Kestra workflow for high-severity incident:', newIncident.id);
      } catch (error) {
        console.error('Failed to auto-trigger Kestra:', error);
      }
    }

    return NextResponse.json({
      success: true,
      incident: newIncident,
      message: `Incident ${newIncident.id} created successfully`
    });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
      { status: 500 }
    );
  }
}

// Parser for Datadog alerts
function parseDatadogAlert(payload: any): Partial<Incident> {
  return {
    title: payload.title || payload.alert_name || 'Datadog Alert',
    service: payload.tags?.find((t: string) => t.startsWith('service:'))?.split(':')[1] || 'unknown',
    severity: mapSeverity(payload.priority || payload.alert_type || 'medium'),
    logs: [payload.body || payload.message || 'No details provided'],
    metrics: {
      alert_id: payload.id,
      ...payload.metrics
    },
    context: {
      host: payload.host || 'unknown',
      region: payload.tags?.find((t: string) => t.startsWith('region:'))?.split(':')[1] || 'unknown',
      version: 'unknown',
      deployment: payload.tags?.find((t: string) => t.startsWith('deployment:'))?.split(':')[1] || 'unknown'
    },
    timestamp: payload.date || new Date().toISOString()
  };
}

// Parser for PagerDuty incidents
function parsePagerDutyIncident(payload: any): Partial<Incident> {
  const incident = payload.incident || payload;
  return {
    title: incident.title || incident.summary || 'PagerDuty Incident',
    service: incident.service?.summary || incident.service?.name || 'unknown',
    severity: mapSeverity(incident.urgency || incident.priority || 'medium'),
    logs: [incident.description || incident.body?.details || 'No details provided'],
    metrics: {
      pagerduty_id: incident.id,
      incident_number: incident.incident_number
    },
    context: {
      host: 'unknown',
      region: 'unknown',
      version: 'unknown',
      deployment: 'unknown'
    },
    timestamp: incident.created_at || new Date().toISOString()
  };
}

// Parser for CloudWatch alarms
function parseCloudWatchAlarm(payload: any): Partial<Incident> {
  const message = JSON.parse(payload.Message || '{}');
  return {
    title: message.AlarmName || 'CloudWatch Alarm',
    service: message.Dimensions?.find((d: any) => d.Name === 'ServiceName')?.Value || 'unknown',
    severity: mapSeverity(message.NewStateValue || 'medium'),
    logs: [message.NewStateReason || message.AlarmDescription || 'No details provided'],
    metrics: {
      alarm_name: message.AlarmName,
      metric_name: message.Trigger?.MetricName,
      threshold: message.Trigger?.Threshold
    },
    context: {
      host: message.Dimensions?.find((d: any) => d.Name === 'InstanceId')?.Value || 'unknown',
      region: message.Region || 'unknown',
      version: 'unknown',
      deployment: 'unknown'
    },
    timestamp: message.StateChangeTime || new Date().toISOString()
  };
}

// Parser for Prometheus alerts
function parsePrometheusAlert(payload: any): Partial<Incident> {
  const alert = payload.alerts?.[0] || payload;
  return {
    title: alert.labels?.alertname || 'Prometheus Alert',
    service: alert.labels?.service || alert.labels?.job || 'unknown',
    severity: mapSeverity(alert.labels?.severity || 'medium'),
    logs: [alert.annotations?.description || alert.annotations?.summary || 'No details provided'],
    metrics: {
      alert_name: alert.labels?.alertname,
      instance: alert.labels?.instance,
      ...alert.annotations
    },
    context: {
      host: alert.labels?.instance || 'unknown',
      region: alert.labels?.region || 'unknown',
      version: alert.labels?.version || 'unknown',
      deployment: alert.labels?.deployment || 'unknown'
    },
    timestamp: alert.startsAt || new Date().toISOString()
  };
}

// Parser for generic webhooks
function parseGenericWebhook(payload: any): Partial<Incident> {
  return {
    title: payload.title || payload.message || payload.alert || 'Generic Alert',
    service: payload.service || payload.application || 'unknown',
    severity: mapSeverity(payload.severity || payload.priority || 'medium'),
    logs: Array.isArray(payload.logs) ? payload.logs : [payload.description || payload.details || 'No details provided'],
    metrics: payload.metrics || {},
    context: payload.context || {
      host: payload.host || 'unknown',
      region: payload.region || 'unknown',
      version: payload.version || 'unknown',
      deployment: payload.deployment || 'unknown'
    },
    timestamp: payload.timestamp || new Date().toISOString()
  };
}
