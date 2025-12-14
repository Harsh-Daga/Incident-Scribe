import { NextResponse } from 'next/server';
import { runKestraSetup, checkKestraConnection, checkFlowExists } from '@/lib/kestra-setup';
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
    const connection = await checkKestraConnection();
    
    if (!connection.connected) {
      return NextResponse.json({
        connected: false,
        error: connection.error || 'Cannot connect to Kestra'
      });
    }
    
    const workflowExists = await checkFlowExists('incident.response', 'incident-handler');
    
    return NextResponse.json({
      connected: true,
      version: connection.version,
      workflowExists
    });
  } catch (error: any) {
    return NextResponse.json({ 
      connected: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await checkPlatformAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const result = await runKestraSetup();
    
    return NextResponse.json({
      success: result.success,
      steps: result.steps
    });
  } catch (error: any) {
    console.error('Kestra setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

