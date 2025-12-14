import { createAdminClient } from './supabase-admin';
import crypto from 'crypto';

/**
 * Generate a secure 64-character invite code
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a secure webhook key
 */
export function generateWebhookKey(): string {
  return `whk_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  return slug || `org-${Date.now()}`;
}

/**
 * Validate invite code and return organization details
 */
export async function validateInviteCode(code: string): Promise<{
  isValid: boolean;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  error?: string;
}> {
  const supabase = createAdminClient();
  
  const { data: inviteCode, error } = await supabase
    .from('invite_codes')
    .select(`
      id,
      organization_id,
      role,
      expires_at,
      max_uses,
      current_uses,
      active,
      organizations:organization_id (
        id,
        name,
        slug
      )
    `)
    .eq('code', code)
    .single();

  if (error || !inviteCode) {
    return { isValid: false, error: 'Invalid invite code' };
  }

  if (!inviteCode.active) {
    return { isValid: false, error: 'Invite code is no longer active' };
  }

  if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
    return { isValid: false, error: 'Invite code has expired' };
  }

  if (inviteCode.max_uses !== null && inviteCode.current_uses >= inviteCode.max_uses) {
    return { isValid: false, error: 'Invite code has reached maximum uses' };
  }

  const org = Array.isArray(inviteCode.organizations) 
    ? inviteCode.organizations[0] 
    : inviteCode.organizations;

  return {
    isValid: true,
    organizationId: inviteCode.organization_id,
    organizationName: org?.name,
    role: inviteCode.role
  };
}

/**
 * Use invite code - atomically increment usage count to prevent race conditions
 */
export async function useInviteCode(code: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  // Use RPC for atomic increment to prevent race conditions
  const { error } = await supabase.rpc('use_invite_code', { invite_code: code });

  return !error;
}

/**
 * Create a new invite code for an organization
 */
export async function createInviteCode(
  organizationId: string,
  createdBy: string,
  options: {
    role?: 'member' | 'viewer';
    expiresAt?: Date;
    maxUses?: number;
  } = {}
): Promise<{ code: string; id: string } | null> {
  const supabase = createAdminClient();
  const code = generateInviteCode();

  const { data, error } = await supabase
    .from('invite_codes')
    .insert({
      organization_id: organizationId,
      code,
      created_by: createdBy,
      role: options.role || 'member',
      expires_at: options.expiresAt?.toISOString(),
      max_uses: options.maxUses
    })
    .select('id, code')
    .single();

  if (error || !data) {
    console.error('Error creating invite code:', error);
    return null;
  }

  return { code: data.code, id: data.id };
}

/**
 * Create a new organization with an admin user
 */
export async function createOrganization(
  name: string,
  adminUserId: string,
  adminEmail: string,
  adminName?: string
): Promise<{
  organization: { id: string; name: string; slug: string; webhookKey: string };
  inviteCode: string;
} | null> {
  const supabase = createAdminClient();
  const slug = generateSlug(name);
  const webhookKey = generateWebhookKey();

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      webhook_key: webhookKey,
      settings: { alert_channels: ['email'] }
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error('Error creating organization:', orgError);
    return null;
  }

  // Create or update admin user
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: adminUserId,
      email: adminEmail,
      name: adminName || adminEmail.split('@')[0],
      organization_id: org.id,
      role: 'admin',
      is_platform_admin: false
    }, { onConflict: 'id' });

  if (userError) {
    console.error('Error creating admin user:', userError);
    // Rollback organization creation
    const { error: rollbackError } = await supabase.from('organizations').delete().eq('id', org.id);
    if (rollbackError) {
      console.error('Failed to rollback organization:', rollbackError);
    }
    return null;
  }

  // Generate initial invite code
  const inviteCodeResult = await createInviteCode(org.id, adminUserId, { role: 'member' });
  
  if (!inviteCodeResult) {
    console.error('Error creating initial invite code');
    // Don't rollback - org and admin were created successfully
  }

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      webhookKey: org.webhook_key
    },
    inviteCode: inviteCodeResult?.code || ''
  };
}

/**
 * Check if a user is a platform admin
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', userId)
    .single();

  return !error && data?.is_platform_admin === true;
}

/**
 * Check if a user is an org admin
 */
export async function isOrgAdmin(userId: string, organizationId?: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', userId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  return !error && data?.role === 'admin';
}

/**
 * Get user's organization
 */
export async function getUserOrganization(userId: string): Promise<{
  id: string;
  name: string;
  slug: string;
  webhookKey: string;
} | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      organization_id,
      organizations:organization_id (
        id,
        name,
        slug,
        webhook_key
      )
    `)
    .eq('id', userId)
    .single();

  if (error || !data?.organizations) {
    return null;
  }

  const org = Array.isArray(data.organizations) 
    ? data.organizations[0] 
    : data.organizations;

  return org ? {
    id: org.id,
    name: org.name,
    slug: org.slug,
    webhookKey: org.webhook_key
  } : null;
}

/**
 * List invite codes for an organization
 */
export async function listInviteCodes(organizationId: string): Promise<Array<{
  id: string;
  code: string;
  role: string;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  active: boolean;
  createdAt: string;
}>> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(code => ({
    id: code.id,
    code: code.code,
    role: code.role,
    expiresAt: code.expires_at,
    maxUses: code.max_uses,
    usesCount: code.current_uses,
    active: code.active,
    createdAt: code.created_at
  }));
}

/**
 * List users in an organization
 */
export async function listOrganizationUsers(organizationId: string): Promise<Array<{
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}>> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at
  }));
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string, 
  newRole: 'admin' | 'member' | 'viewer'
): Promise<boolean> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  return !error;
}

/**
 * Remove a user from an organization
 */
export async function removeUserFromOrganization(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  return !error;
}

