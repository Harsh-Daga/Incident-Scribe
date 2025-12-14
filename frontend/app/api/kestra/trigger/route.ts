import { NextRequest, NextResponse } from 'next/server';
import { triggerKestraWorkflowDirect } from '@/lib/kestra';

export async function POST(req: NextRequest) {
  try {
    const { incident_data } = await req.json();

    if (!incident_data) {
      return NextResponse.json({ error: 'Incident data required' }, { status: 400 });
    }

    // Ensure all required fields are present
    const completeIncidentData = {
      id: incident_data.id,
      timestamp: incident_data.timestamp || new Date().toISOString(),
      service: incident_data.service,
      severity: incident_data.severity,
      status: incident_data.status || 'open',
      title: incident_data.title,
      logs: incident_data.logs || [],
      metrics: incident_data.metrics || {},
      context: incident_data.context || {
        host: 'unknown',
        region: 'unknown',
        version: 'unknown',
        deployment: 'unknown'
      }
    };

    const result = await triggerKestraWorkflowDirect(completeIncidentData);

    return NextResponse.json({
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

