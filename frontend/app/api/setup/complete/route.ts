import { NextResponse } from 'next/server';
import { runCompleteSetup } from '@/lib/supabase-setup';
import { runKestraSetup } from '@/lib/kestra-setup';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Verify platform admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();
    
    if (!userData?.is_platform_admin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    const results = {
      supabase: { success: false, steps: [] as any[] },
      kestra: { success: false, steps: [] as any[] }
    };
    
    // Step 1: Run Supabase setup
    console.log('Running Supabase setup...');
    const supabaseResult = await runCompleteSetup();
    results.supabase = supabaseResult;
    
    // Step 2: Run Kestra setup
    console.log('Running Kestra setup...');
    const kestraResult = await runKestraSetup();
    results.kestra = kestraResult;
    
    const allSuccess = supabaseResult.success && kestraResult.success;
    
    // Extract organization details from supabase setup
    const orgStep = supabaseResult.steps.find(s => s.step === 'Create/Get Organization');
    
    return NextResponse.json({
      success: allSuccess,
      supabase: results.supabase,
      kestra: results.kestra,
      organization: orgStep?.details ? {
        organizationId: orgStep.details.organizationId,
        webhookKey: orgStep.details.webhookKey,
        note: 'Use this webhook key to send incidents from your monitoring tools'
      } : undefined,
      message: allSuccess 
        ? 'Setup complete! Organization and sample incidents have been created.'
        : 'Setup partially completed. Check the steps for details. Make sure to run the SQL setup script first.'
    });
  } catch (error: any) {
    console.error('Complete setup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

