import { NextRequest, NextResponse } from 'next/server';
import { triggerKestraWorkflowDirect } from '@/lib/kestra';
import { getAuthenticatedOrganizationId } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify user is authenticated and get their organization
    const organizationId = await getAuthenticatedOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const { incident_data } = await req.json();

    if (!incident_data) {
      return NextResponse.json({ error: 'Incident data required' }, { status: 400 });
    }

    // Validate required fields
    if (!incident_data.id || !incident_data.service || !incident_data.severity) {
      return NextResponse.json(
        { error: 'Missing required fields: id, service, severity' },
        { status: 400 }
      );
    }

    // Ensure organization_id is set from authenticated user (security)
    const completeIncidentData = {
      id: incident_data.id,
      timestamp: incident_data.timestamp || new Date().toISOString(),
      service: incident_data.service,
      severity: incident_data.severity,
      status: incident_data.status || 'open',
      title: incident_data.title || 'Incident',
      logs: incident_data.logs || [],
      metrics: incident_data.metrics || {},
      context: incident_data.context || {
        host: 'unknown',
        region: 'unknown',
        version: 'unknown',
        deployment: 'unknown'
      },
      // SECURITY: Use authenticated user's organization, not from request
      organization_id: organizationId
    };

    const result = await triggerKestraWorkflowDirect(completeIncidentData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to trigger Kestra workflow',
        message: 'Kestra may not be accessible. Check KESTRA_URL environment variable.'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      executionId: result.executionId,
      status: result.status,
      message: 'Kestra workflow triggered successfully',
    });
  } catch (error: any) {
    console.error('Error triggering Kestra workflow:', error);
    return NextResponse.json(
      { error: 'Failed to trigger Kestra workflow', details: error.message },
      { status: 500 }
    );
  }
}
