'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Waves, AlertCircle, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-cyan)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-magenta)' }} />
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
            INCIDENT SCRIBE
          </h1>
          <p className="font-mono text-xs tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            AI-POWERED INCIDENT MANAGEMENT
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

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
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
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
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
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: loading ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))',
              color: loading ? 'var(--text-muted)' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                SIGNING IN...
              </>
            ) : (
              <>
                SIGN IN
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: 'var(--accent-cyan)' }}>
              Sign up
            </Link>
          </p>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Need an invite code?{' '}
            <span style={{ color: 'var(--text-tertiary)' }}>
              Contact your organization admin
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
