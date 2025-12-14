'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Waves, AlertCircle, Loader2, Mail, Lock, User, Key, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; orgName?: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function validateInviteCode(code: string) {
    if (code.length < 64) {
      setCodeValidation(null);
      return;
    }

    setValidatingCode(true);
    try {
      const response = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      setCodeValidation({
        valid: data.isValid,
        orgName: data.organizationName
      });
    } catch (err) {
      setCodeValidation({ valid: false });
    } finally {
      setValidatingCode(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call our signup API that handles invite code validation
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          inviteCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.requiresConfirmation) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Successful signup - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Check Your Email
          </h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            We've sent a confirmation link to <strong>{email}</strong>. 
            Click the link in the email to verify your account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
              color: 'white'
            }}
          >
            Go to Login
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
      </div>

      <div className="glass-card p-8 max-w-md w-full relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
              <Waves className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            JOIN INCIDENT SCRIBE
          </h1>
          <p className="font-mono text-xs tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            CREATE YOUR ACCOUNT
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg mb-6"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--status-critical)' }} />
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-5">
          {/* Invite Code - First and Prominent */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Invite Code <span style={{ color: 'var(--status-critical)' }}>*</span>
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: validatingCode ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  validateInviteCode(e.target.value);
                }}
                required
                placeholder="Enter your 64-character invite code"
                className="w-full pl-12 pr-12 py-3 rounded-lg font-mono text-xs transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${codeValidation?.valid ? 'var(--accent-emerald)' : codeValidation === null ? 'var(--glass-border)' : 'var(--status-critical)'}`,
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              {validatingCode && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin"
                  style={{ color: 'var(--accent-cyan)' }} />
              )}
              {codeValidation?.valid && (
                <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{ color: 'var(--accent-emerald)' }} />
              )}
            </div>
            {codeValidation?.valid && codeValidation.orgName && (
              <p className="mt-2 text-xs" style={{ color: 'var(--accent-emerald)' }}>
                Joining organization: {codeValidation.orgName}
              </p>
            )}
            {codeValidation && !codeValidation.valid && inviteCode.length >= 64 && (
              <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
                Invalid or expired invite code
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full pl-12 pr-4 py-3 rounded-lg font-mono text-sm transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full pl-12 pr-4 py-3 rounded-lg font-mono text-sm transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full pl-12 pr-4 py-3 rounded-lg font-mono text-sm transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !codeValidation?.valid}
            className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: (loading || !codeValidation?.valid) ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
              color: (loading || !codeValidation?.valid) ? 'var(--text-muted)' : 'white',
              cursor: (loading || !codeValidation?.valid) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                CREATING ACCOUNT...
              </>
            ) : (
              <>
                CREATE ACCOUNT
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent-cyan)' }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Note */}
        <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          <p className="text-xs font-mono text-center" style={{ color: 'var(--accent-cyan)' }}>
            INVITE CODE REQUIRED<br />
            <span style={{ color: 'var(--text-tertiary)' }}>
              Contact your organization admin for an invite code
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
