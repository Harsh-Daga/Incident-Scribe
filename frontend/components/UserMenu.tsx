'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User, LogOut, Building2, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface UserMenuProps {
  user: {
    email: string;
    name?: string;
    organizationName?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  async function handleLogout() {
    setLoading(true);
    setIsOpen(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  }

  const dropdown = isOpen && mounted ? createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={() => setIsOpen(false)}
      />

      {/* Dropdown */}
      <div
        className="fixed w-64 rounded-lg shadow-xl"
        style={{
          top: dropdownPosition.top,
          right: dropdownPosition.right,
          zIndex: 9999,
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* User Info */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {user.email}
          </p>
          {user.organizationName && (
            <div className="flex items-center gap-2 mt-2">
              <Building2 className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {user.organizationName}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-2">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
            style={{
              color: loading ? 'var(--text-muted)' : 'var(--status-critical)',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">
              {loading ? 'Signing out...' : 'Sign out'}
            </span>
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta))' }}>
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {user.name || user.email.split('@')[0]}
          </p>
          {user.organizationName && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {user.organizationName}
            </p>
          )}
        </div>
        <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </button>

      {dropdown}
    </div>
  );
}

