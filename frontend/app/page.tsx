'use client';

import { useEffect, useState } from 'react';
import { Incident } from '@/types/incident';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getIncidents } from '@/lib/api';
import { useRouter } from 'next/navigation';
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
  ExternalLink
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadIncidents() {
      try {
        const data = await getIncidents();
        setIncidents(data);
      } catch (err) {
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
  }, []);

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
              <div className="text-right">
                <div className="font-mono text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="font-mono text-xs" style={{color: 'var(--text-tertiary)'}}>
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </div>
              </div>
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
