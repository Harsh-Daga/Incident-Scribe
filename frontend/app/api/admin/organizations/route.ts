import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { generateInviteCode, generateWebhookKey, generateSlug } from '@/lib/organizations';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify platform admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_platform_admin) {
      return NextResponse.json({ error: 'Forbidden - platform admin required' }, { status: 403 });
    }

    // Get all organizations
    const adminClient = createAdminClient();
    const { data: organizations, error } = await adminClient
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(organizations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify platform admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_platform_admin) {
      return NextResponse.json({ error: 'Forbidden - platform admin required' }, { status: 403 });
    }

    const { name, adminEmail, adminName } = await req.json();

    if (!name || !adminEmail) {
      return NextResponse.json({ 
        error: 'Organization name and admin email are required' 
      }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const slug = generateSlug(name);
    const webhookKey = generateWebhookKey();

    // Check if slug already exists
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json({ 
        error: 'An organization with this name already exists' 
      }, { status: 400 });
    }

    // Create organization
    const { data: org, error: orgError } = await adminClient
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
      return NextResponse.json({ 
        error: orgError?.message || 'Failed to create organization' 
      }, { status: 500 });
    }

    // Create admin auth user
    const tempPassword = `Admin${randomBytes(6).toString('base64url')}!`;
    
    const { data: adminAuth, error: adminAuthError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        name: adminName || adminEmail.split('@')[0], 
        organization_id: org.id 
      }
    });

    if (adminAuthError) {
      // Rollback org creation
      await adminClient.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: adminAuthError.message }, { status: 400 });
    }

    // Create admin user record
    await adminClient.from('users').insert({
      id: adminAuth.user!.id,
      email: adminEmail,
      name: adminName || adminEmail.split('@')[0],
      organization_id: org.id,
      role: 'admin',
      is_platform_admin: false
    });

    // Generate initial invite code
    const inviteCode = generateInviteCode();
    await adminClient.from('invite_codes').insert({
      organization_id: org.id,
      code: inviteCode,
      created_by: adminAuth.user!.id,
      role: 'member',
      active: true
    });

    // Audit log
    await adminClient.from('audit_log').insert({
      action: 'organization_created',
      organization_id: org.id,
      user_id: user.id,
      details: {
        created_by_platform_admin: user.id,
        organization_name: name,
        admin_email: adminEmail
      }
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        webhookKey: org.webhook_key
      },
      admin: {
        email: adminEmail,
        tempPassword // In production, send this via email instead
      },
      inviteCode
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

