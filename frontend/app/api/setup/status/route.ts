import { NextResponse } from 'next/server';
import { checkSetupStatus } from '@/lib/supabase-setup';
import { checkKestraConnection, checkFlowExists } from '@/lib/kestra-setup';

export async function GET() {
  // Check for required environment variables
  const envStatus = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    kestraUrl: !!process.env.KESTRA_URL,
    geminiApiKey: !!process.env.GEMINI_API_KEY
  };

  const missingEnvVars = Object.entries(envStatus)
    .filter(([_, exists]) => !exists)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    return NextResponse.json({
      isComplete: false,
      envConfigured: false,
      missingEnvVars,
      supabase: {
        schemaExists: false,
        platformAdminExists: false,
        sampleOrgExists: false,
        sampleIncidentsExist: false
      },
      kestra: {
        connected: false,
        workflowExists: false,
        error: 'Environment not configured'
      },
      message: `Missing environment variables: ${missingEnvVars.join(', ')}`
    });
  }

  try {
    // Check Supabase status
    const supabaseStatus = await checkSetupStatus();
    
    // Check Kestra status
    const kestraConnection = await checkKestraConnection();
    const workflowExists = kestraConnection.connected 
      ? await checkFlowExists('incident.response', 'incident-handler')
      : false;
    
    const isComplete = 
      supabaseStatus.schemaExists &&
      supabaseStatus.sampleOrgExists &&
      supabaseStatus.sampleIncidentsExist &&
      kestraConnection.connected &&
      workflowExists;
    
    return NextResponse.json({
      isComplete,
      envConfigured: true,
      supabase: {
        schemaExists: supabaseStatus.schemaExists,
        platformAdminExists: supabaseStatus.platformAdminExists,
        sampleOrgExists: supabaseStatus.sampleOrgExists,
        sampleIncidentsExist: supabaseStatus.sampleIncidentsExist
      },
      kestra: {
        connected: kestraConnection.connected,
        version: kestraConnection.version,
        workflowExists,
        error: kestraConnection.error
      }
    });
  } catch (error: any) {
    console.error('Error checking setup status:', error);
    return NextResponse.json({
      isComplete: false,
      envConfigured: true,
      error: error.message,
      supabase: {
        schemaExists: false,
        platformAdminExists: false,
        sampleOrgExists: false,
        sampleIncidentsExist: false
      },
      kestra: {
        connected: false,
        workflowExists: false
      }
    });
  }
}

