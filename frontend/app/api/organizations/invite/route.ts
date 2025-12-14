import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInviteCode, listInviteCodes } from '@/lib/organizations';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const codes = await listInviteCodes(userData.organization_id);
    return NextResponse.json(codes);
  } catch (error: any) {
    console.error('Error listing invite codes:', error);
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

    // Get user's organization and verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const { role, expiresAt, maxUses } = await req.json();

    const result = await createInviteCode(
      userData.organization_id,
      user.id,
      {
        role: role || 'member',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined
      }
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      id: result.id
    });
  } catch (error: any) {
    console.error('Error creating invite code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const { codeId } = await req.json();

    // Deactivate the invite code
    const { error } = await supabase
      .from('invite_codes')
      .update({ active: false })
      .eq('id', codeId)
      .eq('organization_id', userData.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deactivating invite code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

