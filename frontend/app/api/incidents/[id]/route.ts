import { NextResponse } from 'next/server';
import { getIncidentById } from '@/lib/supabase-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const incident = await getIncidentById(id);

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Transform to match frontend interface
    const transformedIncident = {
      id: incident.external_id,
      timestamp: incident.timestamp,
      service: incident.service,
      severity: incident.severity,
      status: incident.status,
      title: incident.title,
      logs: incident.logs || [],
      metrics: incident.metrics || {},
      context: incident.context || {}
    };

    return NextResponse.json(transformedIncident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident' },
      { status: 500 }
    );
  }
}

