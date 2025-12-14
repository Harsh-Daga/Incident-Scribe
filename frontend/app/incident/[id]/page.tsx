'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Incident } from '@/types/incident';
import { getIncident, triggerKestraWorkflow } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Zap,
  Terminal,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Server,
  Code,
  FileText,
  AlertTriangle,
  Play
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const incidentId = (params?.id || '') as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [triggeringKestra, setTriggeringKestra] = useState(false);
  const [kestraExecutionId, setKestraExecutionId] = useState<string | null>(null);
  const [kestraStatus, setKestraStatus] = useState<any>(null);
  const [pollingExecution, setPollingExecution] = useState(false);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (!authChecked) return;

    async function loadIncident() {
      try {
        const data = await getIncident(incidentId);
        if (!data) {
          router.push('/dashboard');
          return;
        }
        setIncident(data);
      } catch (error: any) {
        console.error('Error loading incident:', error);
        // Handle 401 - redirect to login
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          router.push('/login');
          return;
        }
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadIncident();
  }, [incidentId, authChecked, router]);

  const handleTriggerKestra = async () => {
    if (!incident) return;

    setTriggeringKestra(true);
    try {
      const result = await triggerKestraWorkflow(incident);
      setKestraExecutionId(result.executionId || result.id || null);
      setPollingExecution(true);
    } catch (error) {
      console.error('Error triggering Kestra:', error);
    } finally {
      setTriggeringKestra(false);
    }
  };

  // Poll for execution status and save results when complete
  useEffect(() => {
    if (!kestraExecutionId || !pollingExecution) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kestra/execution/${kestraExecutionId}`);
        const data = await response.json();
        setKestraStatus(data);

        if (data.status === 'SUCCESS' || data.status === 'FAILED' || data.status === 'KILLED') {
          setPollingExecution(false);
          
          // Save results to database when Kestra completes successfully
          if (data.status === 'SUCCESS' && data.aiResults && incident) {
            try {
              await fetch('/api/analysis/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  incidentId: incident.internal_id || incident.id,
                  executionId: kestraExecutionId,
                  analysis: data.aiResults.analysis,
                  remediation: data.aiResults.remediation,
                  documentation: data.aiResults.documentation,
                })
              });
              
              // Reload incident data to get persisted analysis
              const updatedData = await getIncident(incidentId);
              if (updatedData) {
                setIncident(updatedData);
              }
            } catch (saveError) {
              console.error('Error saving analysis:', saveError);
            }
          }
        }
      } catch (error) {
        console.error('Error polling execution:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [kestraExecutionId, pollingExecution, incident, incidentId]);

  // Parse AI analysis from Gemini response format
  const parseAIAnalysis = (analysis: any): string | null => {
    if (!analysis) return null;
    if (typeof analysis === 'string') return analysis;
    if (analysis.candidates && analysis.candidates[0]?.content?.parts?.[0]?.text) {
      return analysis.candidates[0].content.parts[0].text;
    }
    return JSON.stringify(analysis);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-primary)'}}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{color: 'var(--accent-cyan)'}} />
          <p className="font-mono text-sm" style={{color: 'var(--text-secondary)'}}>
            LOADING INCIDENT DATA...
          </p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-primary)'}}>
        <div className="glass-card p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--accent-amber)'}} />
          <h2 className="text-xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            INCIDENT NOT FOUND
          </h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary mt-4"
          >
            RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  // Check saved analysis first, then fall back to live Kestra results
  const savedAnalysis = (incident as any)?.ai_analysis;
  
  const aiAnalysisText = savedAnalysis?.analysis 
    || (kestraStatus?.aiResults?.analysis ? parseAIAnalysis(kestraStatus.aiResults.analysis) : null);

  const aiRemediationText = savedAnalysis?.remediation
    || (kestraStatus?.aiResults?.remediation ? parseAIAnalysis(kestraStatus.aiResults.remediation) : null);

  const aiDocumentationText = savedAnalysis?.documentation
    || (kestraStatus?.aiResults?.documentation ? parseAIAnalysis(kestraStatus.aiResults.documentation) : null);
  
  const hasAnyAnalysis = aiAnalysisText || aiRemediationText || aiDocumentationText;

  return (
    <div className="min-h-screen relative" style={{background: 'var(--bg-primary)'}}>
      {/* Header */}
      <div className="glass-card border-b" style={{borderColor: 'var(--glass-border)'}}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 mb-4 font-mono text-xs tracking-wider transition-all hover:gap-3"
            style={{color: 'var(--accent-cyan)'}}
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO DASHBOARD
          </button>

          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`status-badge status-${incident.severity.toLowerCase()}`}>
                  {incident.severity}
                </span>
                <span className="font-mono text-xs px-2 py-1 rounded" style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.2)'
                }}>
                  {incident.id}
                </span>
                <span className="font-mono text-xs" style={{color: 'var(--text-muted)'}}>
                  {formatDate(incident.timestamp)}
                </span>
              </div>

              <h1 className="text-3xl font-bold mb-3 glow-text-cyan" style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em'
              }}>
                {incident.title}
              </h1>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" style={{color: 'var(--accent-cyan)'}} />
                  <span className="font-mono text-sm" style={{color: 'var(--text-secondary)'}}>
                    {incident.service}
                  </span>
                </div>
                <span className={`status-badge ${
                  incident.status === 'resolved' ? 'status-resolved' : 'status-low'
                }`} style={{fontSize: '0.625rem'}}>
                  {incident.status.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={handleTriggerKestra}
              disabled={triggeringKestra || pollingExecution}
              className="btn-primary flex items-center gap-2"
            >
              {triggeringKestra || pollingExecution ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {pollingExecution ? 'EXECUTING...' : 'INITIALIZING...'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  RUN AI ANALYSIS
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Status */}
            {kestraStatus && (
              <div className="glass-card p-6 animate-data-stream">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5" style={{color: 'var(--accent-cyan)'}} />
                    <h2 className="text-lg font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                      WORKFLOW EXECUTION
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {kestraStatus.status === 'SUCCESS' && (
                      <CheckCircle2 className="w-5 h-5" style={{color: 'var(--status-resolved)'}} />
                    )}
                    {kestraStatus.status === 'FAILED' && (
                      <XCircle className="w-5 h-5" style={{color: 'var(--status-critical)'}} />
                    )}
                    {kestraStatus.status === 'RUNNING' && (
                      <Loader2 className="w-5 h-5 animate-spin" style={{color: 'var(--accent-cyan)'}} />
                    )}
                    <span className={`status-badge ${
                      kestraStatus.status === 'SUCCESS' ? 'status-resolved' :
                      kestraStatus.status === 'FAILED' ? 'status-critical' :
                      'status-low'
                    }`}>
                      {kestraStatus.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="metric-card">
                    <div className="font-mono text-xs tracking-wider mb-2" style={{color: 'var(--text-tertiary)'}}>
                      EXECUTION ID
                    </div>
                    <div className="font-mono text-sm" style={{color: 'var(--accent-cyan-glow)'}}>
                      {kestraStatus.executionId}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="font-mono text-xs tracking-wider mb-2" style={{color: 'var(--text-tertiary)'}}>
                      DURATION
                    </div>
                    <div className="font-mono text-sm" style={{color: 'var(--accent-cyan-glow)'}}>
                      {kestraStatus.duration ? `${kestraStatus.duration.toFixed(2)}s` : '—'}
                    </div>
                  </div>
                </div>

                {kestraStatus.url && (
                  <a
                    href={kestraStatus.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-sm transition-all hover:gap-3"
                    style={{color: 'var(--accent-cyan)'}}
                  >
                    VIEW IN KESTRA
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* AI Analysis */}
            {aiAnalysisText && (
              <div className="glass-card p-6 animate-data-stream" style={{
                borderLeft: '3px solid var(--accent-magenta)',
                animationDelay: '0.1s'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5" style={{color: 'var(--accent-magenta)'}} />
                  <h2 className="text-lg font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    AI ANALYSIS
                  </h2>
                </div>
                <MarkdownRenderer content={aiAnalysisText} />
              </div>
            )}

            {/* AI Remediation */}
            {aiRemediationText && (
              <div className="glass-card p-6 animate-data-stream" style={{
                borderLeft: '3px solid var(--accent-emerald)',
                animationDelay: '0.2s'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5" style={{color: 'var(--accent-emerald)'}} />
                  <h2 className="text-lg font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    REMEDIATION STEPS
                  </h2>
                </div>
                <MarkdownRenderer content={aiRemediationText} />
              </div>
            )}

            {/* AI Documentation */}
            {aiDocumentationText && (
              <div className="glass-card p-6 animate-data-stream" style={{
                borderLeft: '3px solid var(--accent-amber)',
                animationDelay: '0.3s'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5" style={{color: 'var(--accent-amber)'}} />
                  <h2 className="text-lg font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    POST-MORTEM DOCUMENTATION
                  </h2>
                </div>
                <MarkdownRenderer content={aiDocumentationText} />
              </div>
            )}

            {/* Logs */}
            {incident.logs && incident.logs.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="w-5 h-5" style={{color: 'var(--accent-cyan)'}} />
                  <h2 className="text-lg font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    SYSTEM LOGS
                  </h2>
                </div>
                <div className="terminal-block">
                  {incident.logs.map((log, i) => (
                    <code key={i} className="block mb-1" style={{color: 'var(--accent-cyan-glow)'}}>
                      [{String(i + 1).padStart(3, '0')}] {log}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metrics */}
            {incident.metrics && Object.keys(incident.metrics).length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5" style={{color: 'var(--accent-amber)'}} />
                  <h3 className="text-sm font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    METRICS
                  </h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(incident.metrics).map(([key, value]) => (
                    <div key={key} className="metric-card">
                      <div className="font-mono text-xs tracking-wider mb-1" style={{color: 'var(--text-tertiary)'}}>
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-2xl font-bold font-mono" style={{color: 'var(--accent-amber-glow)'}}>
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context */}
            {incident.context && Object.keys(incident.context).length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Code className="w-5 h-5" style={{color: 'var(--accent-cyan)'}} />
                  <h3 className="text-sm font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                    CONTEXT
                  </h3>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  {Object.entries(incident.context).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span style={{color: 'var(--text-tertiary)'}} className="shrink-0">{key}:</span>
                      <span style={{color: 'var(--text-secondary)'}} className="break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Summary */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5" style={{color: 'var(--status-high)'}} />
                <h3 className="text-sm font-bold font-mono tracking-wider" style={{color: 'var(--text-primary)'}}>
                  IMPACT SUMMARY
                </h3>
              </div>
              <div className="space-y-4">
                {incident.metrics?.error_rate && (
                  <div>
                    <div className="font-mono text-xs tracking-wider mb-2" style={{color: 'var(--text-tertiary)'}}>
                      ERROR RATE
                    </div>
                    <div className="text-3xl font-bold font-mono" style={{
                      color: '#fca5a5',
                      textShadow: '0 0 20px var(--status-critical)'
                    }}>
                      {(incident.metrics.error_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {incident.metrics?.latency_p95_ms && (
                  <div>
                    <div className="font-mono text-xs tracking-wider mb-2" style={{color: 'var(--text-tertiary)'}}>
                      P95 LATENCY
                    </div>
                    <div className="text-3xl font-bold font-mono" style={{
                      color: '#fdba74',
                      textShadow: '0 0 20px var(--status-high)'
                    }}>
                      {incident.metrics.latency_p95_ms}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
