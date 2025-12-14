'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Waves,
  Building2,
  Users,
  Plus,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  webhook_key: string;
  created_at: string;
  user_count?: number;
  incident_count?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ orgName: string; inviteCode: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if platform admin
      const { data: userData } = await supabase
        .from('users')
        .select('is_platform_admin')
        .eq('id', user.id)
        .single();

      if (!userData?.is_platform_admin) {
        router.push('/dashboard');
        return;
      }

      // Load organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgs) {
        setOrganizations(orgs);
      }
      setLoading(false);
    }

    checkAdminAndLoad();
  }, [supabase, router]);

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          adminEmail: newAdminEmail,
          adminName: newAdminName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create organization');
        setCreating(false);
        return;
      }

      setSuccess({
        orgName: newOrgName,
        inviteCode: data.inviteCode
      });
      setShowCreateForm(false);
      setNewOrgName('');
      setNewAdminEmail('');
      setNewAdminName('');

      // Reload organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgs) {
        setOrganizations(orgs);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setCreating(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="glass-card border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
              >
                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Back</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Platform Admin
                </h1>
                <p className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  MANAGE ORGANIZATIONS
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                color: 'white'
              }}
            >
              <Plus className="w-5 h-5" />
              Create Organization
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Success Message */}
        {success && (
          <div className="glass-card p-6 mb-8" style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-emerald)' }}>
                  Organization Created: {success.orgName}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Share this invite code with the organization admin:
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <code className="text-xs font-mono flex-1 break-all" style={{ color: 'var(--text-primary)' }}>
                    {success.inviteCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(success.inviteCode, 'invite')}
                    className="flex-shrink-0"
                  >
                    {copiedField === 'invite' ? (
                      <Check className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <Copy className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>
                </div>
              </div>
              <button onClick={() => setSuccess(null)} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Create Organization Form */}
        {showCreateForm && (
          <div className="glass-card p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Create New Organization
            </h2>
            
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg mb-6"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--status-critical)' }} />
                <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateOrganization} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    required
                    placeholder="Acme Corporation"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                    placeholder="admin@company.com"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Admin Name
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 rounded-lg font-medium"
                  style={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
                  style={{
                    background: creating ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                    color: creating ? 'var(--text-muted)' : 'white'
                  }}
                >
                  {creating && <Loader2 className="w-5 h-5 animate-spin" />}
                  {creating ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Organizations List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Organizations ({organizations.length})
          </h2>
          
          <div className="space-y-4">
            {organizations.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-tertiary)' }}>No organizations yet</p>
              </div>
            ) : (
              organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {org.name}
                      </h3>
                      <p className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {org.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        WEBHOOK KEY
                      </div>
                      <button
                        onClick={() => copyToClipboard(org.webhook_key, `webhook-${org.id}`)}
                        className="flex items-center gap-1 font-mono text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {org.webhook_key.substring(0, 20)}...
                        {copiedField === `webhook-${org.id}` ? (
                          <Check className="w-3 h-3" style={{ color: 'var(--accent-emerald)' }} />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

