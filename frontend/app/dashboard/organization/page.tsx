'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Key,
  Plus,
  Loader2,
  Copy,
  Check,
  Trash2,
  Shield,
  Eye,
  UserCircle,
  AlertCircle
} from 'lucide-react';

interface InviteCode {
  id: string;
  code: string;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  created_at: string;
}

interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  webhook_key: string;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState<'member' | 'viewer'>('member');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number | ''>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's organization and role
      const { data: userData } = await supabase
        .from('users')
        .select(`
          role,
          organization_id,
          organizations:organization_id (
            id,
            name,
            slug,
            webhook_key
          )
        `)
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      const org = Array.isArray(userData.organizations) 
        ? userData.organizations[0] 
        : userData.organizations;

      if (org) {
        setOrganization(org);

        // Load users
        const { data: orgUsers } = await supabase
          .from('users')
          .select('id, email, name, role, created_at')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false });

        if (orgUsers) {
          setUsers(orgUsers);
        }

        // Load invite codes
        const { data: codes } = await supabase
          .from('invite_codes')
          .select('*')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false });

        if (codes) {
          setInviteCodes(codes);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [supabase, router]);

  async function generateInviteCode() {
    if (!organization) return;
    
    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newCodeRole,
          maxUses: newCodeMaxUses || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate invite code');
        return;
      }

      // Reload invite codes
      const { data: codes } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (codes) {
        setInviteCodes(codes);
      }

      setNewCodeMaxUses('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deactivateCode(codeId: string) {
    const { error } = await supabase
      .from('invite_codes')
      .update({ active: false })
      .eq('id', codeId);

    if (!error) {
      setInviteCodes(inviteCodes.map(c => 
        c.id === codeId ? { ...c, active: false } : c
      ));
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" style={{ color: 'var(--accent-magenta)' }} />;
      case 'member':
        return <UserCircle className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />;
      case 'viewer':
        return <Eye className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />;
      default:
        return null;
    }
  };

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
                {organization?.name} Settings
              </h1>
              <p className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                MANAGE USERS & INVITE CODES
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Webhook Key */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Webhook Key
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Use this key to send incidents to your organization via webhooks.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
            <code className="flex-1 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
              {organization?.webhook_key}
            </code>
            <button
              onClick={() => copyToClipboard(organization?.webhook_key || '', 'webhook')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-primary)' }}
            >
              {copiedField === 'webhook' ? (
                <Check className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
              ) : (
                <Copy className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
          </div>
        </div>

        {/* Generate Invite Code */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Generate Invite Code
          </h2>
          
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg mb-4"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--status-critical)' }} />
              <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Role
              </label>
              <select
                value={newCodeRole}
                onChange={(e) => setNewCodeRole(e.target.value as 'member' | 'viewer')}
                className="px-4 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Max Uses (optional)
              </label>
              <input
                type="number"
                value={newCodeMaxUses}
                onChange={(e) => setNewCodeMaxUses(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="Unlimited"
                min="1"
                className="px-4 py-2 rounded-lg w-32"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <button
              onClick={generateInviteCode}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
              style={{
                background: generating ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
                color: generating ? 'var(--text-muted)' : 'white'
              }}
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Generate
            </button>
          </div>
        </div>

        {/* Invite Codes List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Invite Codes ({inviteCodes.length})
          </h2>
          
          <div className="space-y-3">
            {inviteCodes.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-tertiary)' }}>No invite codes yet</p>
              </div>
            ) : (
              inviteCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    opacity: code.active ? 1 : 0.5
                  }}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => copyToClipboard(code.code, `code-${code.id}`)}
                      className="flex items-center gap-2"
                    >
                      <code className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {code.code.substring(0, 24)}...
                      </code>
                      {copiedField === `code-${code.id}` ? (
                        <Check className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 rounded text-xs font-mono"
                      style={{
                        background: code.role === 'member' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: code.role === 'member' ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}>
                      {code.role.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {code.uses_count}/{code.max_uses || '∞'} uses
                    </span>
                    {!code.active && (
                      <span className="text-xs font-mono" style={{ color: 'var(--status-critical)' }}>
                        INACTIVE
                      </span>
                    )}
                    {code.active && (
                      <button
                        onClick={() => deactivateCode(code.id)}
                        className="p-2 rounded-lg hover:opacity-80"
                        style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--status-critical)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Team Members ({users.length})
          </h2>
          
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
                    <span className="text-white font-semibold">
                      {(user.name || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {user.name || user.email.split('@')[0]}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role)}
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      disabled={user.role === 'admin'}
                      className="px-3 py-1 rounded text-xs font-mono"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

