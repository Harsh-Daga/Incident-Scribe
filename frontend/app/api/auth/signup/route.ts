import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { validateInviteCode, useInviteCode } from '@/lib/organizations';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await req.json();

    // Validate required fields
    if (!email || !password || !name || !inviteCode) {
      return NextResponse.json(
        { error: 'Email, password, name, and invite code are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate invite code
    const inviteValidation = await validateInviteCode(inviteCode);
    if (!inviteValidation.isValid) {
      return NextResponse.json(
        { error: inviteValidation.error || 'Invalid invite code' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for demo purposes
      user_metadata: {
        name,
        organization_id: inviteValidation.organizationId
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user record in users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name,
        organization_id: inviteValidation.organizationId,
        role: inviteValidation.role || 'member',
        is_platform_admin: false
      });

    if (userError) {
      console.error('User table error:', userError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Use the invite code (increment usage)
    await useInviteCode(inviteCode);

    // Audit log
    await supabase.from('audit_log').insert({
      action: 'user_signup',
      organization_id: inviteValidation.organizationId,
      user_id: authData.user.id,
      details: {
        email,
        name,
        role: inviteValidation.role,
        invite_code_used: inviteCode.substring(0, 8) + '...'
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        organizationId: inviteValidation.organizationId,
        organizationName: inviteValidation.organizationName,
        role: inviteValidation.role
      },
      requiresConfirmation: false
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup' },
      { status: 500 }
    );
  }
}

