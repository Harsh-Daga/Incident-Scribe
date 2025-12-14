'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Workflow,
  Zap,
  Shield,
  Users,
  Webhook,
  Brain,
  Database,
  Monitor,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lock,
  Eye,
  Settings
} from 'lucide-react';

type Section = 'overview' | 'lifecycle' | 'features' | 'getting-started';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; name: string; icon: React.ReactNode }[] = [
    { id: 'overview', name: 'System Overview', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'lifecycle', name: 'Incident Lifecycle', icon: <Workflow className="w-4 h-4" /> },
    { id: 'features', name: 'Features', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'getting-started', name: 'Getting Started', icon: <Zap className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
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
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                How It Works
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Learn how Incident Scribe helps you manage and resolve incidents faster
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <nav className="sticky top-8 space-y-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    background: activeSection === section.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: activeSection === section.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    border: activeSection === section.id ? '1px solid var(--accent-cyan)' : '1px solid transparent'
                  }}
                >
                  {section.icon}
                  <span className="font-medium">{section.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-8">
            {/* System Overview */}
            {activeSection === 'overview' && (
              <>
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    System Overview
                  </h2>
                  <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Incident Scribe is an AI-powered incident management platform that automatically analyzes, 
                    categorizes, and provides remediation guidance for your production incidents.
                  </p>

                  {/* Architecture Diagram */}
                  <div className="p-6 rounded-xl mb-6" style={{ background: 'var(--bg-card)' }}>
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
                      ARCHITECTURE
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      {/* Monitoring Tools */}
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
                          style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                          <Monitor className="w-8 h-8" style={{ color: 'var(--accent-amber)' }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Monitoring Tools
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Datadog, PagerDuty, etc.
                        </p>
                      </div>

                      <ChevronRight className="w-6 h-6 hidden md:block" style={{ color: 'var(--text-muted)' }} />

                      {/* Webhooks */}
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
                          style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                          <Webhook className="w-8 h-8" style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Webhook API
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Ingestion endpoint
                        </p>
                      </div>

                      <ChevronRight className="w-6 h-6 hidden md:block" style={{ color: 'var(--text-muted)' }} />

                      {/* Database */}
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
                          style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                          <Database className="w-8 h-8" style={{ color: 'var(--accent-emerald)' }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Supabase
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Secure storage
                        </p>
                      </div>

                      <ChevronRight className="w-6 h-6 hidden md:block" style={{ color: 'var(--text-muted)' }} />

                      {/* Kestra */}
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
                          style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                          <Workflow className="w-8 h-8" style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Kestra
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Workflow engine
                        </p>
                      </div>

                      <ChevronRight className="w-6 h-6 hidden md:block" style={{ color: 'var(--text-muted)' }} />

                      {/* AI */}
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
                          style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
                          <Brain className="w-8 h-8" style={{ color: 'var(--accent-magenta)' }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Gemini AI
                        </span>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Analysis engine
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Key Components */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Webhook className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Webhook Ingestion</h4>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Receive incidents from any monitoring tool via webhooks. Supports Datadog, PagerDuty, CloudWatch, Prometheus, and custom sources.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Brain className="w-5 h-5" style={{ color: 'var(--accent-magenta)' }} />
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>AI Analysis</h4>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Powered by Google Gemini, automatically analyzes incidents to identify root causes, assess impact, and suggest remediation steps.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Workflow className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Automated Workflows</h4>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Kestra orchestrates multi-step workflows for incident processing, enabling automated responses and escalations.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Multi-Tenant Security</h4>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Complete data isolation between organizations with Row Level Security. Each team sees only their incidents.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Incident Lifecycle */}
            {activeSection === 'lifecycle' && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Incident Lifecycle
                </h2>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  From detection to resolution, here&apos;s how incidents flow through the system:
                </p>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-cyan)', color: 'white' }}>
                        1
                      </div>
                      <div className="flex-1 w-px my-2" style={{ background: 'var(--glass-border)' }} />
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Detection
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Your monitoring tools (Datadog, PagerDuty, CloudWatch, etc.) detect an issue and trigger an alert based on your configured thresholds.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Example: Error rate exceeds 5% threshold for payment-api service
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-magenta)', color: 'white' }}>
                        2
                      </div>
                      <div className="flex-1 w-px my-2" style={{ background: 'var(--glass-border)' }} />
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Ingestion
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        The monitoring tool sends a webhook to Incident Scribe. The payload is normalized and validated regardless of source format.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        POST /api/webhooks/ingest?source=datadog&key=your-webhook-key
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-emerald)', color: 'white' }}>
                        3
                      </div>
                      <div className="flex-1 w-px my-2" style={{ background: 'var(--glass-border)' }} />
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Storage
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        The incident is saved to Supabase with your organization ID. Row Level Security ensures data isolation between organizations.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Incident stored with status: open, severity: HIGH
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-purple)', color: 'white' }}>
                        4
                      </div>
                      <div className="flex-1 w-px my-2" style={{ background: 'var(--glass-border)' }} />
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Workflow Trigger
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        For HIGH and CRITICAL severity incidents, Kestra workflows are automatically triggered to process the incident.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Kestra workflow: incident.response/incident-handler started
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-amber)', color: 'white' }}>
                        5
                      </div>
                      <div className="flex-1 w-px my-2" style={{ background: 'var(--glass-border)' }} />
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        AI Analysis
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Gemini AI analyzes the incident logs, metrics, and context to identify root cause, assess impact, and generate remediation recommendations.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Root cause: Database connection pool exhausted
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--status-critical)', color: 'white' }}>
                        6
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Resolution
                      </h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Your team reviews the AI insights, applies the recommended fixes, and marks the incident as resolved. A postmortem can be generated automatically.
                      </p>
                      <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        Incident resolved, MTTR: 23 minutes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {activeSection === 'features' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Features
                  </h2>
                  <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Incident Scribe provides a comprehensive set of features to help you manage incidents effectively:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Real-time Monitoring */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                        <Monitor className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Real-time Monitoring
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Live incident dashboard with auto-refresh
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Severity-based filtering and search
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Status tracking (open, investigating, resolved)
                      </li>
                    </ul>
                  </div>

                  {/* AI Analysis */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
                        <Brain className="w-5 h-5" style={{ color: 'var(--accent-magenta)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        AI-Powered Analysis
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Automatic root cause identification
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Impact assessment and blast radius
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Remediation recommendations
                      </li>
                    </ul>
                  </div>

                  {/* Automated Workflows */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <Workflow className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Automated Workflows
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Kestra-powered orchestration
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Severity-based routing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Automatic escalation triggers
                      </li>
                    </ul>
                  </div>

                  {/* Security */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                        <Shield className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Enterprise Security
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Organization-level data isolation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Row Level Security (RLS) policies
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Webhook key authentication
                      </li>
                    </ul>
                  </div>

                  {/* Role-Based Access */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                        <Users className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Role-Based Access
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-amber)' }} />
                        <strong>Admin:</strong> Full access, manage users
                      </li>
                      <li className="flex items-center gap-2">
                        <Settings className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                        <strong>Member:</strong> View and update incidents
                      </li>
                      <li className="flex items-center gap-2">
                        <Eye className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <strong>Viewer:</strong> Read-only access
                      </li>
                    </ul>
                  </div>

                  {/* Integrations */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                        <Webhook className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Integrations
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Datadog, PagerDuty, CloudWatch
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Prometheus Alertmanager
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        Generic webhook support
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Getting Started */}
            {activeSection === 'getting-started' && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Getting Started
                </h2>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Follow these steps to start using Incident Scribe:
                </p>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-cyan)', color: 'white' }}>
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Get Your Webhook Key
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Navigate to the Webhooks page to find your organization&apos;s webhook key. This key authenticates requests from your monitoring tools.
                        </p>
                        <Link
                          href="/dashboard/webhooks"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: 'var(--accent-cyan)', color: 'white' }}
                        >
                          Go to Webhooks
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-magenta)', color: 'white' }}>
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Configure Your Monitoring Tool
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Add the webhook URL to your monitoring tool (Datadog, PagerDuty, etc.). Follow the step-by-step guides on the Webhooks page for your specific tool.
                        </p>
                        <div className="text-xs p-3 rounded-lg font-mono"
                          style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                          POST https://your-domain.com/api/webhooks/ingest?source=datadog&key=YOUR_KEY
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-emerald)', color: 'white' }}>
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Send a Test Incident
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Use the &ldquo;Send Test Webhook&rdquo; button on the Webhooks page to create a sample incident and verify your integration is working.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-purple)', color: 'white' }}>
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          View and Analyze
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          Go to the Dashboard to see your incidents. Click on any incident to view details and trigger AI analysis.
                        </p>
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: 'var(--accent-purple)', color: 'white' }}
                        >
                          View Dashboard
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-6 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-amber)', color: 'white' }}>
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Invite Your Team
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                          (Admin only) Generate invite codes from the Organization Settings page to add team members. Assign appropriate roles (admin, member, viewer).
                        </p>
                        <Link
                          href="/dashboard/organization"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ background: 'var(--accent-amber)', color: 'white' }}
                        >
                          Organization Settings
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

