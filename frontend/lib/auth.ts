import { cookies } from 'next/headers';
import { supabase } from './db';

export interface Session {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

/**
 * Get current session from cookies
 * In production, this would validate a JWT token from Supabase Auth
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    return session;
  } catch {
    return null;
  }
}

/**
 * Get user's organization ID from session
 * This is what protects against accessing other orgs' data
 */
export async function getOrganizationId(): Promise<string | null> {
  const session = await getSession();
  return session?.organizationId || null;
}

/**
 * Authenticate user by email (DEMO ONLY)
 * In production, use Supabase Auth or similar
 */
export async function authenticateByEmail(email: string): Promise<Session | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      organization_id,
      organizations:organization_id (
        id,
        name,
        slug
      )
    `)
    .eq('email', email)
    .single();

  if (error || !user) {
    return null;
  }

  const org = Array.isArray(user.organizations) ? user.organizations[0] : user.organizations;

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organization_id,
    organizationName: org?.name || 'Unknown',
    role: user.role
  };
}

/**
 * Create session cookie
 */
export async function createSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

/**
 * Clear session
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
