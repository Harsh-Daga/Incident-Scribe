import { NextResponse } from 'next/server';
import { runCompleteSetup, checkSetupStatus } from '@/lib/supabase-setup';
import { createClient } from '@/lib/supabase/server';

async function checkPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { authorized: false, error: 'Authentication required', status: 401 };
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_platform_admin) {
    return { authorized: false, error: 'Platform admin access required', status: 403 };
  }
  
  return { authorized: true };
}

export async function GET() {
  try {
    const status = await checkSetupStatus();
    
    return NextResponse.json({
      status,
      message: status.schemaExists 
        ? 'Schema exists' 
        : 'Schema not found - please run migrations in Supabase SQL Editor'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await checkPlatformAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const result = await runCompleteSetup();
    
    // Extract credentials for the response
    const orgStep = result.steps.find(s => s.step === 'Create Sample Organization');
    
    return NextResponse.json({
      success: result.success,
      steps: result.steps,
      credentials: result.success ? {
        demoAdmin: {
          email: 'admin@democompany.com',
          password: 'Admin123!'
        },
        demoMember: {
          email: 'member@democompany.com',
          password: 'Member123!'
        },
        demoViewer: {
          email: 'viewer@democompany.com',
          password: 'Viewer123!'
        },
        webhookKey: orgStep?.details?.webhookKey,
        inviteCode: orgStep?.details?.inviteCode
      } : undefined
    });
  } catch (error: any) {
    console.error('Supabase setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

