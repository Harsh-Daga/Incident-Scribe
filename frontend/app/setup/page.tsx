'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Waves,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Workflow,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface SetupStatus {
  isComplete: boolean;
  envConfigured?: boolean;
  missingEnvVars?: string[];
  message?: string;
  error?: string;
  supabase: {
    schemaExists: boolean;
    platformAdminExists: boolean;
    sampleOrgExists: boolean;
    sampleIncidentsExist: boolean;
  };
  kestra: {
    connected: boolean;
    version?: string;
    workflowExists: boolean;
    error?: string;
  };
}

interface SetupResult {
  success: boolean;
  supabase?: {
    success: boolean;
    steps: Array<{ step: string; success: boolean; details?: any; error?: string }>;
  };
  kestra?: {
    success: boolean;
    steps: Array<{ step: string; success: boolean; details?: any; error?: string }>;
  };
  organization?: {
    organizationId?: string;
    webhookKey?: string;
    note?: string;
  };
  message?: string;
  error?: string;
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function checkStatus() {
    setLoading(true);
    try {
      const response = await fetch('/api/setup/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function runSetup() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/setup/complete', { method: 'POST' });
      const data = await response.json();
      setResult(data);
      // Refresh status after setup
      await checkStatus();
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setRunning(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const StatusIcon = ({ success }: { success: boolean }) => (
    success 
      ? <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
      : <XCircle className="w-5 h-5" style={{ color: 'var(--status-critical)' }} />
  );

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
              <Waves className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold mb-4" style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Setup Incident Scribe
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Configure your database, create sample data, and set up Kestra workflows
          </p>
        </div>

        {/* Current Status */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Current Status
            </h2>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            </div>
          ) : status?.envConfigured === false ? (
            <div className="p-6 rounded-lg" style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)' 
            }}>
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: 'var(--status-critical)' }} />
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--status-critical)' }}>
                    Missing Environment Variables
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    The following environment variables must be set in <code className="px-1 rounded" style={{ background: 'var(--bg-card)' }}>frontend/.env.local</code>:
                  </p>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {status.missingEnvVars?.map((envVar) => (
                      <li key={envVar} className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" style={{ color: 'var(--status-critical)' }} />
                        <code className="px-2 py-1 rounded" style={{ background: 'var(--bg-card)' }}>
                          {envVar === 'supabaseUrl' && 'NEXT_PUBLIC_SUPABASE_URL'}
                          {envVar === 'supabaseAnonKey' && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'}
                          {envVar === 'supabaseServiceKey' && 'SUPABASE_SERVICE_ROLE_KEY'}
                          {envVar === 'kestraUrl' && 'KESTRA_URL'}
                          {envVar === 'geminiApiKey' && 'GEMINI_API_KEY'}
                        </code>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      Example .env.local:
                    </p>
                    <pre className="mt-2 text-xs overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KESTRA_URL=http://localhost:8080
GEMINI_API_KEY=your-gemini-key`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : status ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Supabase Status */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Supabase</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Database Schema</span>
                    <StatusIcon success={status.supabase.schemaExists} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Sample Organization</span>
                    <StatusIcon success={status.supabase.sampleOrgExists} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Sample Incidents</span>
                    <StatusIcon success={status.supabase.sampleIncidentsExist} />
                  </div>
                </div>
              </div>

              {/* Kestra Status */}
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Workflow className="w-6 h-6" style={{ color: 'var(--accent-magenta)' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kestra</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Connection</span>
                    <StatusIcon success={status.kestra.connected} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Workflow Deployed</span>
                    <StatusIcon success={status.kestra.workflowExists} />
                  </div>
                  {status.kestra.version && (
                    <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      Version: {status.kestra.version}
                    </div>
                  )}
                  {status.kestra.error && (
                    <div className="text-xs" style={{ color: 'var(--status-critical)' }}>
                      {status.kestra.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Important Note about Schema */}
        {status && !status.supabase.schemaExists && (
          <div className="glass-card p-6 mb-8" style={{ 
            background: 'rgba(251, 191, 36, 0.1)', 
            border: '1px solid rgba(251, 191, 36, 0.3)' 
          }}>
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--accent-amber)' }} />
              <div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-amber)' }}>
                  Database Schema Required
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Before running setup, you need to create the database schema in Supabase:
                </p>
                <ol className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                  <li>1. Go to your Supabase project dashboard</li>
                  <li>2. Open the SQL Editor</li>
                  <li>3. Run the contents of <code className="px-1 rounded" style={{ background: 'var(--bg-card)' }}>database/init.sql</code></li>
                  <li>4. Run the contents of <code className="px-1 rounded" style={{ background: 'var(--bg-card)' }}>database/migrations/001_add_multi_tenancy.sql</code></li>
                  <li>5. Run the contents of <code className="px-1 rounded" style={{ background: 'var(--bg-card)' }}>database/migrations/002_add_invite_codes.sql</code></li>
                  <li>6. Click "Refresh" above and then run setup</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Run Setup Button */}
        {!status?.isComplete && status?.envConfigured !== false && (
          <div className="glass-card p-6 mb-8 text-center">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Run Complete Setup
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              This will create sample organization, users, and incidents, then configure Kestra workflows.
            </p>
            <button
              onClick={runSetup}
              disabled={running || !status?.supabase?.schemaExists}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all"
              style={{
                background: (running || !status?.supabase?.schemaExists) 
                  ? 'var(--bg-card)' 
                  : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                color: (running || !status?.supabase?.schemaExists) ? 'var(--text-muted)' : 'white',
                cursor: (running || !status?.supabase?.schemaExists) ? 'not-allowed' : 'pointer'
              }}
            >
              {running ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Setup...
                </>
              ) : (
                <>
                  Run Setup
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Setup Result */}
        {result && (
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              {result.success ? (
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent-emerald)' }} />
              ) : (
                <XCircle className="w-8 h-8" style={{ color: 'var(--status-critical)' }} />
              )}
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {result.success ? 'Setup Complete!' : 'Setup Partially Complete'}
              </h2>
            </div>

            {/* Organization Info */}
            {result.organization?.webhookKey && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Organization Details
                </h3>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <div className="font-mono text-xs mb-2" style={{ color: 'var(--accent-amber)' }}>
                    WEBHOOK KEY
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Use this key to send incidents from your monitoring tools
                  </p>
                  <button
                    onClick={() => copyToClipboard(result.organization!.webhookKey!, 'webhook')}
                    className="flex items-center gap-2 text-xs font-mono break-all"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {result.organization.webhookKey}
                    {copiedField === 'webhook' ? <Check className="w-4 h-4 flex-shrink-0" /> : <Copy className="w-4 h-4 flex-shrink-0" />}
                  </button>
                </div>
              </div>
            )}

            {/* Go to Dashboard Button */}
            {result.success && (
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                    color: 'white'
                  }}
                >
                  Go to Login
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Already Complete */}
        {status?.isComplete && !result && (
          <div className="glass-card p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--accent-emerald)' }} />
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Setup Already Complete
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your Incident Scribe instance is fully configured and ready to use.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                color: 'white'
              }}
            >
              Go to Login
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

