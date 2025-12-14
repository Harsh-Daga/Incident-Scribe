'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Incident } from '@/types/incident';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserMenu } from '@/components/UserMenu';
import { getIncidents } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  AlertCircle,
  Activity,
  TrendingUp,
  Clock,
  Zap,
  Shield,
  Search,
  Server,
  Waves,
  ChevronRight,
  ExternalLink,
  Settings,
  Users,
  BookOpen,
  Webhook,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { QuickStartGuide } from '@/components/QuickStartGuide';

interface UserInfo {
  email: string;
  name?: string;
  organizationName?: string;
  role?: string;
  isPlatformAdmin?: boolean;
  webhookKey?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDocsMenu, setShowDocsMenu] = useState(false);
  const [webhookKey, setWebhookKey] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const docsButtonRef = useRef<HTMLButtonElement>(null);
  const [docsDropdownPos, setDocsDropdownPos] = useState({ top: 0, right: 0 });

  // Track mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update docs dropdown position when opened
  useEffect(() => {
    if (showDocsMenu && docsButtonRef.current) {
      const rect = docsButtonRef.current.getBoundingClientRect();
      setDocsDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showDocsMenu]);

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/login');
        return;
      }

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role, is_platform_admin, organization_id')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        // User might not exist in users table yet - create basic profile
        setUser({
          email: authUser.email || '',
          name: authUser.user_metadata?.name
        });
        setAuthChecked(true);
        return;
      }

      // Fetch organization separately if user has one
      let org: { id: string; name: string; slug: string; webhook_key: string } | null = null;
      if (userData?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, webhook_key')
          .eq('id', userData.organization_id)
          .single();
        
        if (!orgError && orgData) {
          org = orgData;
        }
      }

      if (userData) {
        setWebhookKey(org?.webhook_key);
        setUser({
          email: userData.email || authUser.email || '',
          name: userData.name,
          organizationName: org?.name,
          role: userData.role,
          isPlatformAdmin: userData.is_platform_admin,
          webhookKey: org?.webhook_key
        });
      } else {
        // User exists in auth but not in users table yet
        setUser({
          email: authUser.email || '',
          name: authUser.user_metadata?.name
        });
      }

      setAuthChecked(true);
    }

    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (!authChecked) return;

    async function loadIncidents() {
      try {
        const data = await getIncidents();
        setIncidents(data);
      } catch (err: any) {
        // Handle 401 - redirect to login
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          router.push('/login');
          return;
        }
        setError('Failed to load incidents');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, [authChecked, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-primary)'}}>
        <div className="text-center">
          <div className="inline-block animate-spin-slow mb-4">
            <Waves className="w-12 h-12" style={{color: 'var(--accent-cyan)'}} />
          </div>
          <p className="font-mono text-sm" style={{color: 'var(--text-secondary)'}}>
            INITIALIZING MISSION CONTROL...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-primary)'}}>
        <div className="glass-card p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--status-critical)'}} />
          <h2 className="text-xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            CONNECTION FAILED
          </h2>
          <p style={{color: 'var(--text-secondary)'}} className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  const criticalIncidents = incidents.filter(inc => inc.severity === 'CRITICAL');
  const highSeverity = incidents.filter(inc => inc.severity === 'HIGH');
  const mediumSeverity = incidents.filter(inc => inc.severity === 'MEDIUM');
  const lowSeverity = incidents.filter(inc => inc.severity === 'LOW');
  const openIncidents = incidents.filter(inc => inc.status === 'open');
  const resolvedIncidents = incidents.filter(inc => inc.status === 'resolved');

  // Apply both filter and search
  const filteredIncidents = incidents
    .filter(inc => filter === 'all' || inc.severity === filter)
    .filter(inc => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        inc.id.toLowerCase().includes(search) ||
        inc.title.toLowerCase().includes(search) ||
        inc.service.toLowerCase().includes(search) ||
        inc.logs.some(log => log.toLowerCase().includes(search))
      );
    });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen relative" style={{background: 'var(--bg-primary)'}}>
      {/* Mission Control Header */}
      <div className="glass-card border-b" style={{borderColor: 'var(--glass-border)'}}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 glow-text-cyan" style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '-0.02em'
              }}>
                INCIDENT SCRIBE
              </h1>
              <p className="font-mono text-xs tracking-wider flex items-center gap-2" style={{color: 'var(--text-tertiary)'}}>
                <Activity className="w-3 h-3 animate-pulse" style={{color: 'var(--accent-emerald)'}} />
                MISSION CONTROL // AI-POWERED INCIDENT MANAGEMENT
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Admin Links */}
              {user?.isPlatformAdmin && (
                <Link
                  href="/dashboard/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
                >
                  <Settings className="w-4 h-4" style={{ color: 'var(--accent-magenta)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--accent-magenta)' }}>ADMIN</span>
                </Link>
              )}
              {user?.role === 'admin' && !user.isPlatformAdmin && (
                <Link
                  href="/dashboard/organization"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                >
                  <Users className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>ORG SETTINGS</span>
                </Link>
              )}

              {/* Documentation Dropdown */}
              <div className="relative">
                <button
                  ref={docsButtonRef}
                  onClick={() => setShowDocsMenu(!showDocsMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
                >
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                  <span className="font-mono text-xs hidden sm:inline" style={{ color: 'var(--accent-purple)' }}>DOCS</span>
                  <ChevronDown className="w-3 h-3" style={{ color: 'var(--accent-purple)' }} />
                </button>
                
                {showDocsMenu && mounted && createPortal(
                  <>
                    <div 
                      className="fixed inset-0"
                      style={{ zIndex: 9998 }}
                      onClick={() => setShowDocsMenu(false)}
                    />
                    <div 
                      className="fixed w-56 rounded-lg shadow-xl"
                      style={{ 
                        top: docsDropdownPos.top,
                        right: docsDropdownPos.right,
                        zIndex: 9999,
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--glass-border)' 
                      }}
                    >
                      <Link
                        href="/dashboard/docs"
                        className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5"
                        onClick={() => setShowDocsMenu(false)}
                      >
                        <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>How It Works</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>System overview & guides</p>
                        </div>
                      </Link>
                      <Link
                        href="/dashboard/webhooks"
                        className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5"
                        onClick={() => setShowDocsMenu(false)}
                      >
                        <Webhook className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Webhook Setup</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connect monitoring tools</p>
                        </div>
                      </Link>
                      <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <a
                          href="https://github.com/Harsh-Daga/Incident-Scribe"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5"
                        >
                          <HelpCircle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Get Help</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>GitHub & support</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
              
              <div className="text-right hidden md:block">
                <div className="font-mono text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </div>
              </div>
              {user && <UserMenu user={user} />}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{color: 'var(--accent-cyan)'}} />
            <input
              type="text"
              placeholder="Search incidents by ID, title, service, or logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg font-mono text-sm transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Quick Start Guide - show for new users or users with few incidents */}
        {incidents.length < 3 && (
          <QuickStartGuide
            hasIncidents={incidents.length > 0}
            isAdmin={user?.role === 'admin'}
            webhookKey={webhookKey}
          />
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Total */}
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: 'var(--text-tertiary)'}}>TOTAL</div>
              <Server className="w-5 h-5" style={{color: 'var(--text-muted)'}} />
            </div>
            <div className="text-4xl font-bold mb-1 glow-text-cyan" style={{color: 'var(--accent-cyan-glow)', fontFamily: 'var(--font-mono)'}}>
              {incidents.length}
            </div>
            <div className="font-mono text-xs" style={{color: 'var(--text-muted)'}}>ACTIVE</div>
          </div>

          {/* Critical */}
          <div className="metric-card group cursor-pointer" onClick={() => setFilter(filter === 'CRITICAL' ? 'all' : 'CRITICAL')}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: '#fca5a5'}}>CRITICAL</div>
              <AlertCircle className="w-5 h-5 animate-pulse" style={{color: 'var(--status-critical)'}} />
            </div>
            <div className="text-4xl font-bold mb-1" style={{
              color: '#fca5a5',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 20px var(--status-critical)'
            }}>
              {criticalIncidents.length}
            </div>
            <div className="font-mono text-xs" style={{color: '#f87171'}}>URGENT</div>
          </div>

          {/* High */}
          <div className="metric-card group cursor-pointer" onClick={() => setFilter(filter === 'HIGH' ? 'all' : 'HIGH')}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: '#fdba74'}}>HIGH</div>
              <TrendingUp className="w-5 h-5" style={{color: 'var(--status-high)'}} />
            </div>
            <div className="text-4xl font-bold mb-1" style={{
              color: '#fdba74',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 15px var(--status-high)'
            }}>
              {highSeverity.length}
            </div>
            <div className="font-mono text-xs" style={{color: '#fb923c'}}>ELEVATED</div>
          </div>

          {/* Medium */}
          <div className="metric-card group cursor-pointer" onClick={() => setFilter(filter === 'MEDIUM' ? 'all' : 'MEDIUM')}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: '#fde047'}}>MEDIUM</div>
              <Zap className="w-5 h-5" style={{color: 'var(--status-medium)'}} />
            </div>
            <div className="text-4xl font-bold mb-1" style={{
              color: '#fde047',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 15px var(--status-medium)'
            }}>
              {mediumSeverity.length}
            </div>
            <div className="font-mono text-xs" style={{color: '#facc15'}}>MODERATE</div>
          </div>

          {/* Low */}
          <div className="metric-card group cursor-pointer" onClick={() => setFilter(filter === 'LOW' ? 'all' : 'LOW')}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: '#93c5fd'}}>LOW</div>
              <Shield className="w-5 h-5" style={{color: 'var(--status-low)'}} />
            </div>
            <div className="text-4xl font-bold mb-1" style={{
              color: '#93c5fd',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 15px var(--status-low)'
            }}>
              {lowSeverity.length}
            </div>
            <div className="font-mono text-xs" style={{color: '#60a5fa'}}>STABLE</div>
          </div>

          {/* Resolved */}
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-xs tracking-wider" style={{color: '#6ee7b7'}}>RESOLVED</div>
              <Clock className="w-5 h-5" style={{color: 'var(--status-resolved)'}} />
            </div>
            <div className="text-4xl font-bold mb-1" style={{
              color: '#6ee7b7',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 15px var(--status-resolved)'
            }}>
              {resolvedIncidents.length}
            </div>
            <div className="font-mono text-xs" style={{color: '#34d399'}}>CLOSED</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className="px-4 py-2 rounded font-mono text-xs tracking-wider transition-all whitespace-nowrap"
              style={{
                background: filter === sev ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: filter === sev ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: `1px solid ${filter === sev ? 'var(--accent-cyan)' : 'var(--glass-border)'}`,
                fontWeight: filter === sev ? 700 : 500
              }}
            >
              {sev === 'all' ? 'ALL INCIDENTS' : sev}
              <span className="ml-2 opacity-70">
                ({sev === 'all' ? incidents.length : incidents.filter(i => i.severity === sev).length})
              </span>
            </button>
          ))}
        </div>

        {/* Incidents List */}
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Server className="w-16 h-16 mx-auto mb-4 opacity-30" style={{color: 'var(--text-muted)'}} />
              <p className="font-mono" style={{color: 'var(--text-tertiary)'}}>
                NO INCIDENTS FOUND
              </p>
            </div>
          ) : (
            filteredIncidents.map((incident, index) => (
              <div
                key={incident.id}
                className="glass-card p-5 cursor-pointer group hover:scale-[1.01] transition-all animate-data-stream"
                onClick={() => router.push(`/incident/${incident.id}`)}
                style={{animationDelay: `${index * 0.05}s`}}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
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
                        {formatTimestamp(incident.timestamp)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2 group-hover:glow-text-cyan transition-all" style={{
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)'
                    }}>
                      {incident.title}
                    </h3>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4" style={{color: 'var(--accent-cyan)'}} />
                        <span className="font-mono text-sm" style={{color: 'var(--text-secondary)'}}>
                          {incident.service}
                        </span>
                      </div>

                      {incident.metrics && Object.keys(incident.metrics).length > 0 && (
                        <div className="flex items-center gap-3">
                          {Object.entries(incident.metrics).slice(0, 2).map(([key, value]) => (
                            <div key={key} className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>
                              <span className="opacity-60">{key}:</span>{' '}
                              <span style={{color: 'var(--accent-amber)'}}>
                                {typeof value === 'number' ? value.toFixed(2) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`status-badge ${
                      incident.status === 'resolved' ? 'status-resolved' : 'status-low'
                    }`} style={{fontSize: '0.625rem'}}>
                      {incident.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{color: 'var(--accent-cyan)'}} />
                  </div>
                </div>

                {/* Preview logs */}
                {incident.logs && incident.logs.length > 0 && (
                  <div className="mt-3 pt-3" style={{borderTop: '1px solid var(--glass-border)'}}>
                    <div className="terminal-block">
                      <code className="text-xs">{incident.logs[0].substring(0, 100)}{incident.logs[0].length > 100 ? '...' : ''}</code>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="font-mono text-xs" style={{color: 'var(--text-muted)'}}>
            REAL-TIME MONITORING ACTIVE // AUTO-REFRESH: 30S
          </p>
        </div>
      </div>
    </div>
  );
}

