'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Key,
  Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type SourceType = 'datadog' | 'pagerduty' | 'cloudwatch' | 'prometheus' | 'generic';

const SOURCE_CONFIGS: Record<SourceType, {
  name: string;
  color: string;
  setupSteps: string[];
  examplePayload: object;
}> = {
  datadog: {
    name: 'Datadog',
    color: '#632CA6',
    setupSteps: [
      'Go to your Datadog dashboard',
      'Navigate to Integrations → Webhooks',
      'Click "New Webhook"',
      'Set the URL to the webhook endpoint shown above',
      'Configure the payload template (optional)',
      'Save and test the webhook'
    ],
    examplePayload: {
      title: 'High CPU Usage Alert',
      body: 'CPU usage exceeded 90% on prod-server-1',
      priority: 'P2',
      tags: ['service:api', 'env:production'],
      alert_type: 'error',
      host: 'prod-server-1'
    }
  },
  pagerduty: {
    name: 'PagerDuty',
    color: '#06AC38',
    setupSteps: [
      'Go to your PagerDuty dashboard',
      'Navigate to Services → Your Service',
      'Click "Integrations" tab',
      'Add a new "Generic Webhook" integration',
      'Set the URL to the webhook endpoint shown above',
      'Configure event rules as needed'
    ],
    examplePayload: {
      event: {
        routing_key: 'your-routing-key',
        event_action: 'trigger',
        payload: {
          summary: 'Database connection failure',
          severity: 'critical',
          source: 'db-primary',
          component: 'database',
          custom_details: {
            error_count: 150,
            affected_users: 1200
          }
        }
      }
    }
  },
  cloudwatch: {
    name: 'CloudWatch',
    color: '#FF9900',
    setupSteps: [
      'Create an SNS topic in AWS Console',
      'Create a Lambda function that forwards to our webhook',
      'Subscribe the Lambda to your SNS topic',
      'Create CloudWatch alarms that publish to the SNS topic',
      'The Lambda should POST to the webhook endpoint with the alarm data'
    ],
    examplePayload: {
      AlarmName: 'High-Error-Rate-API',
      AlarmDescription: 'Error rate exceeded 5% threshold',
      NewStateValue: 'ALARM',
      StateChangeTime: '2024-01-15T10:30:00.000Z',
      Region: 'us-east-1',
      Trigger: {
        MetricName: 'ErrorRate',
        Namespace: 'AWS/ApplicationELB',
        Threshold: 5.0,
        EvaluationPeriods: 1
      }
    }
  },
  prometheus: {
    name: 'Prometheus Alertmanager',
    color: '#E6522C',
    setupSteps: [
      'Edit your alertmanager.yml configuration',
      'Add a new receiver with the webhook endpoint',
      'Configure routes to send alerts to the new receiver',
      'Reload Alertmanager configuration',
      'Test with a sample alert'
    ],
    examplePayload: {
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          labels: {
            alertname: 'HighMemoryUsage',
            severity: 'warning',
            instance: 'prod-api-1:9090'
          },
          annotations: {
            summary: 'High memory usage detected',
            description: 'Memory usage is above 85%'
          },
          startsAt: '2024-01-15T10:30:00.000Z'
        }
      ]
    }
  },
  generic: {
    name: 'Generic / Custom',
    color: '#6B7280',
    setupSteps: [
      'Use any HTTP client (curl, Postman, your application)',
      'Send a POST request to the webhook endpoint',
      'Include the JSON payload in the request body',
      'Set Content-Type header to application/json'
    ],
    examplePayload: {
      title: 'Custom Alert',
      description: 'A custom incident from your monitoring system',
      severity: 'HIGH',
      service: 'my-service',
      logs: ['Error: Connection timeout', 'Retrying...'],
      metrics: {
        error_rate: 0.15,
        latency_ms: 500
      },
      context: {
        host: 'server-1',
        region: 'us-east-1'
      }
    }
  }
};

export default function WebhooksPage() {
  const [webhookKey, setWebhookKey] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceType>('generic');
  const [expandedGuide, setExpandedGuide] = useState<SourceType | null>('generic');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWebhookKey() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (userData?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('webhook_key, name')
          .eq('id', userData.organization_id)
          .single();
        
        if (org) {
          setWebhookKey(org.webhook_key);
          setOrganizationName(org.name);
        }
      }
      setLoading(false);
    }
    
    loadWebhookKey();
  }, []);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const webhookEndpoint = `${baseUrl}/api/webhooks/ingest`;
  const fullUrl = webhookKey ? `${webhookEndpoint}?source=${selectedSource}&key=${webhookKey}` : '';

  async function testWebhook() {
    if (!webhookKey) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const payload = SOURCE_CONFIGS[selectedSource].examplePayload;
      const response = await fetch(
        `${webhookEndpoint}?source=${selectedSource}&key=${webhookKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: `Incident created successfully! ID: ${data.incidentId}`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to create incident'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Network error'
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
              <Webhook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Webhook Integration
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Connect your monitoring tools to Incident Scribe
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-cyan)' }} />
          </div>
        ) : (
          <>
            {/* Webhook Key Section */}
            <div className="glass-card p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                  <Key className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Your Webhook Key
                  </h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    This key authenticates requests from your monitoring tools. Keep it secret!
                  </p>
                  {webhookKey ? (
                    <div className="flex items-center gap-3">
                      <code className="flex-1 px-4 py-3 rounded-lg font-mono text-sm break-all"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {webhookKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookKey, 'key')}
                        className="p-3 rounded-lg transition-all"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
                      >
                        {copiedField === 'key' 
                          ? <Check className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                          : <Copy className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                      <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
                        No webhook key found. Contact your organization administrator.
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Organization: {organizationName || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoint Section */}
            <div className="glass-card p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Webhook Endpoint
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Base URL
                  </label>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 rounded-lg font-mono text-sm"
                      style={{ background: 'var(--bg-card)', color: 'var(--accent-cyan)' }}>
                      POST {webhookEndpoint}
                    </code>
                    <button
                      onClick={() => copyToClipboard(webhookEndpoint, 'endpoint')}
                      className="p-3 rounded-lg transition-all"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
                    >
                      {copiedField === 'endpoint'
                        ? <Check className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                        : <Copy className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Query Parameters
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <code className="text-sm" style={{ color: 'var(--accent-magenta)' }}>source</code>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        One of: datadog, pagerduty, cloudwatch, prometheus, generic
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <code className="text-sm" style={{ color: 'var(--accent-magenta)' }}>key</code>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Your organization&apos;s webhook key (shown above)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-amber)' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--accent-amber)' }}>Rate Limiting</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Webhooks are limited to 60 requests per minute per organization. Excess requests will receive a 429 response.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Selection */}
            <div className="glass-card p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Choose Your Monitoring Tool
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.keys(SOURCE_CONFIGS) as SourceType[]).map(source => (
                  <button
                    key={source}
                    onClick={() => {
                      setSelectedSource(source);
                      setExpandedGuide(source);
                    }}
                    className="p-4 rounded-lg text-center transition-all"
                    style={{
                      background: selectedSource === source ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-card)',
                      border: selectedSource === source ? '2px solid var(--accent-cyan)' : '1px solid var(--glass-border)'
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mx-auto mb-2"
                      style={{ background: SOURCE_CONFIGS[source].color }}
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {SOURCE_CONFIGS[source].name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Setup Guide */}
            <div className="glass-card p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Setup Guide: {SOURCE_CONFIGS[selectedSource].name}
              </h2>
              
              {/* Full URL */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Full Webhook URL (copy this)
                </label>
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 rounded-lg font-mono text-xs break-all"
                    style={{ background: 'var(--bg-card)', color: 'var(--accent-cyan)' }}>
                    {fullUrl || 'Webhook key not available'}
                  </code>
                  <button
                    onClick={() => fullUrl && copyToClipboard(fullUrl, 'fullUrl')}
                    disabled={!fullUrl}
                    className="p-3 rounded-lg transition-all"
                    style={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--glass-border)',
                      opacity: fullUrl ? 1 : 0.5
                    }}
                  >
                    {copiedField === 'fullUrl'
                      ? <Check className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                      : <Copy className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Steps
                </h3>
                <ol className="space-y-2">
                  {SOURCE_CONFIGS[selectedSource].setupSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: 'var(--accent-cyan)', color: 'white' }}>
                        {index + 1}
                      </span>
                      <span className="text-sm pt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Example Payload */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Example Payload
                  </h3>
                  <button
                    onClick={() => copyToClipboard(
                      JSON.stringify(SOURCE_CONFIGS[selectedSource].examplePayload, null, 2),
                      'payload'
                    )}
                    className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-all"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                  >
                    {copiedField === 'payload' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <pre className="p-4 rounded-lg overflow-x-auto text-xs"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {JSON.stringify(SOURCE_CONFIGS[selectedSource].examplePayload, null, 2)}
                </pre>
              </div>

              {/* Curl Example */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Curl Example
                </h3>
                <div className="relative">
                  <pre className="p-4 rounded-lg overflow-x-auto text-xs"
                    style={{ background: 'var(--bg-card)', color: 'var(--accent-emerald)' }}>
{`curl -X POST "${fullUrl || '<YOUR_WEBHOOK_URL>'}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(SOURCE_CONFIGS[selectedSource].examplePayload)}'`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(
                      `curl -X POST "${fullUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(SOURCE_CONFIGS[selectedSource].examplePayload)}'`,
                      'curl'
                    )}
                    className="absolute top-2 right-2 p-2 rounded transition-all"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    {copiedField === 'curl' ? <Check className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>
              </div>

              {/* Test Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={testWebhook}
                  disabled={testing || !webhookKey}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
                  style={{
                    background: testing || !webhookKey ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                    color: testing || !webhookKey ? 'var(--text-muted)' : 'white',
                    cursor: testing || !webhookKey ? 'not-allowed' : 'pointer'
                  }}
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Webhook
                    </>
                  )}
                </button>
                
                {testResult && (
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <XCircle className="w-5 h-5" style={{ color: 'var(--status-critical)' }} />
                    )}
                    <span className="text-sm" style={{ color: testResult.success ? 'var(--accent-emerald)' : 'var(--status-critical)' }}>
                      {testResult.message}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Troubleshooting
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    401 Unauthorized
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Your webhook key is invalid or missing. Make sure you&apos;re including the <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>key</code> query parameter with your organization&apos;s webhook key.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    429 Too Many Requests
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    You&apos;ve exceeded the rate limit (60 requests/minute). Implement backoff logic in your integration or contact support for higher limits.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    400 Bad Request
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    The request body is malformed. Ensure you&apos;re sending valid JSON with the Content-Type header set to <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>application/json</code>.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Incidents not appearing
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Check that your webhook response was 200 OK. Incidents may take a few seconds to appear in the dashboard. Try refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

