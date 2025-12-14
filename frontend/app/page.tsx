'use client';

import Link from 'next/link';
import {
  Waves,
  Zap,
  Shield,
  Activity,
  GitBranch,
  Terminal,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Bot,
  Workflow,
  Globe
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Analysis',
      description: 'Gemini AI analyzes incidents, identifies root causes, and suggests remediation steps automatically.',
      color: 'var(--accent-cyan)'
    },
    {
      icon: Workflow,
      title: 'Automated Workflows',
      description: 'Kestra orchestrates multi-step incident response with intelligent decision branching.',
      color: 'var(--accent-magenta)'
    },
    {
      icon: Shield,
      title: 'Multi-Tenant Security',
      description: 'Organization isolation with Row Level Security ensures your data stays private.',
      color: 'var(--accent-emerald)'
    },
    {
      icon: Terminal,
      title: 'CLI & API Access',
      description: 'Powerful CLI tools and REST APIs for seamless integration with your existing stack.',
      color: 'var(--accent-amber)'
    },
    {
      icon: GitBranch,
      title: 'Webhook Ingestion',
      description: 'Connect Datadog, PagerDuty, CloudWatch, and more with standardized webhook handlers.',
      color: 'var(--accent-cyan)'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Dashboard',
      description: 'Monitor incidents, track severity levels, and view AI analysis in a beautiful interface.',
      color: 'var(--accent-magenta)'
    }
  ];

  const stats = [
    { value: '10x', label: 'Faster Response' },
    { value: '85%', label: 'Root Cause Accuracy' },
    { value: '24/7', label: 'Automated Monitoring' },
    { value: '100+', label: 'Integrations' }
  ];

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
                <Waves className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold" style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                INCIDENT SCRIBE
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                  color: 'white'
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <Activity className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
              AI-POWERED INCIDENT MANAGEMENT
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-cyan) 50%, var(--accent-magenta) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Turn Incidents Into
            <br />Insights, Automatically
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Detect, analyze, and resolve production incidents 10x faster with AI-powered root cause analysis,
            automated workflows, and intelligent remediation suggestions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                color: 'white'
              }}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/setup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-80"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              Quick Setup
              <Terminal className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 px-6" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2" style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {stat.value}
                </div>
                <div className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Everything You Need for Incident Response
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              A complete platform for modern SRE teams to detect, analyze, and resolve incidents with AI assistance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card p-6 transition-all hover:scale-[1.02]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}20`, border: `1px solid ${feature.color}40` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              How It Works
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              From incident detection to resolution in minutes, not hours.
            </p>
          </div>

          <div className="space-y-8">
            {[
              { step: '01', title: 'Connect Your Monitoring Tools', desc: 'Integrate with Datadog, PagerDuty, CloudWatch, or any webhook-compatible source.', icon: Globe },
              { step: '02', title: 'AI Analyzes Incidents', desc: 'Gemini AI identifies root causes, clusters errors, and assesses impact automatically.', icon: Bot },
              { step: '03', title: 'Automated Workflow Execution', desc: 'Kestra orchestrates response actions based on severity and incident type.', icon: Workflow },
              { step: '04', title: 'Resolve & Document', desc: 'Apply fixes, generate postmortems, and learn from every incident.', icon: CheckCircle }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-mono text-xs mb-1" style={{ color: 'var(--accent-cyan)' }}>
                    STEP {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12 rounded-3xl" style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(236, 72, 153, 0.1))',
            border: '1px solid rgba(6, 182, 212, 0.2)'
          }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Ready to Transform Your Incident Response?
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Get started in minutes with our automated setup. No complex configuration required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                  color: 'white'
                }}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Waves className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} />
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Incident Scribe
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                Built for AI Agents Assemble Hackathon
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Powered by Gemini, Kestra & Vercel
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
