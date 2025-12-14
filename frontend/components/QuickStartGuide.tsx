'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Key,
  Settings,
  Send,
  Eye,
  Sparkles,
  Users
} from 'lucide-react';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  icon: React.ReactNode;
}

interface QuickStartGuideProps {
  hasIncidents?: boolean;
  isAdmin?: boolean;
  webhookKey?: string;
  onDismiss?: () => void;
}

const STORAGE_KEY = 'quickstart-dismissed';
const COMPLETED_KEY = 'quickstart-completed';

export function QuickStartGuide({ 
  hasIncidents = false, 
  isAdmin = false, 
  webhookKey,
  onDismiss 
}: QuickStartGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check if dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Load completed steps
    const saved = localStorage.getItem(COMPLETED_KEY);
    if (saved) {
      try {
        setCompletedSteps(new Set(JSON.parse(saved)));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Auto-complete steps based on props
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    
    if (webhookKey) {
      newCompleted.add('webhook-key');
    }
    if (hasIncidents) {
      newCompleted.add('test-incident');
      newCompleted.add('view-incident');
    }

    if (newCompleted.size !== completedSteps.size) {
      setCompletedSteps(newCompleted);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify([...newCompleted]));
    }
  }, [webhookKey, hasIncidents, completedSteps]);

  const steps: QuickStartStep[] = [
    {
      id: 'webhook-key',
      title: 'Get your webhook key',
      description: 'Find your organization\'s webhook key to connect monitoring tools',
      link: '/dashboard/webhooks',
      linkText: 'Go to Webhooks',
      icon: <Key className="w-4 h-4" />
    },
    {
      id: 'configure-tool',
      title: 'Configure your monitoring tool',
      description: 'Add the webhook URL to Datadog, PagerDuty, or other tools',
      link: '/dashboard/webhooks',
      linkText: 'Setup Guide',
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'test-incident',
      title: 'Send a test incident',
      description: 'Use the test button or send a real alert to verify the integration',
      link: '/dashboard/webhooks',
      linkText: 'Send Test',
      icon: <Send className="w-4 h-4" />
    },
    {
      id: 'view-incident',
      title: 'View incident in dashboard',
      description: 'Check that your incident appears and review the details',
      link: '/dashboard',
      linkText: 'View Dashboard',
      icon: <Eye className="w-4 h-4" />
    },
    {
      id: 'ai-analysis',
      title: 'Trigger AI analysis',
      description: 'Click "Analyze with AI" on any incident to get insights',
      icon: <Sparkles className="w-4 h-4" />
    },
    ...(isAdmin ? [{
      id: 'invite-team',
      title: 'Invite team members',
      description: 'Generate invite codes to add your team to the organization',
      link: '/dashboard/organization',
      linkText: 'Manage Team',
      icon: <Users className="w-4 h-4" />
    }] : [])
  ];

  const completedCount = steps.filter(s => completedSteps.has(s.id)).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  function toggleStep(stepId: string) {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...newCompleted]));
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
    onDismiss?.();
  }

  if (isDismissed) {
    return null;
  }

  return (
    <div 
      className="glass-card overflow-hidden mb-6"
      style={{ 
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(168, 85, 247, 0.1))',
        border: '1px solid rgba(6, 182, 212, 0.3)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' }}
          >
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Quick Start Guide
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {completedCount === steps.length 
                ? 'All steps completed!' 
                : `${completedCount} of ${steps.length} steps completed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="var(--glass-border)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="var(--accent-cyan)"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            <span 
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {progress}%
            </span>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-2 rounded-lg transition-all hover:bg-white/10"
            title="Dismiss guide"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          
          {isExpanded 
            ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          }
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              
              return (
                <div 
                  key={step.id}
                  className="flex items-start gap-3 p-3 rounded-lg transition-all"
                  style={{ 
                    background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                    opacity: isCompleted ? 0.8 : 1
                  }}
                >
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-0.5 flex-shrink-0 transition-all"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <Circle className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="p-1 rounded"
                        style={{ background: 'var(--bg-primary)', color: 'var(--accent-cyan)' }}
                      >
                        {step.icon}
                      </span>
                      <span 
                        className="font-medium text-sm"
                        style={{ 
                          color: 'var(--text-primary)',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}
                      >
                        {step.title}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {step.description}
                    </p>
                  </div>

                  {step.link && !isCompleted && (
                    <Link
                      href={step.link}
                      className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
                      style={{ 
                        background: 'var(--accent-cyan)', 
                        color: 'white'
                      }}
                    >
                      {step.linkText}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Learn More Link */}
          <div className="mt-4 text-center">
            <Link
              href="/dashboard/docs"
              className="text-sm transition-colors"
              style={{ color: 'var(--accent-cyan)' }}
            >
              Learn more about how Incident Scribe works →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

