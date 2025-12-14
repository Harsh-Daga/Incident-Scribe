import { NextRequest, NextResponse } from 'next/server';
import { getIncidents } from '@/lib/supabase-queries';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const service = searchParams.get('service') || undefined;

    const incidents = await getIncidents({
      status,
      severity,
      service,
      limit: 100
    });

    // Transform to match frontend interface
    const transformedIncidents = incidents.map(inc => ({
      id: inc.external_id,
      timestamp: inc.timestamp,
      service: inc.service,
      severity: inc.severity,
      status: inc.status,
      title: inc.title,
      logs: inc.logs || [],
      metrics: inc.metrics || {},
      context: inc.context || {}
    }));

    return NextResponse.json(transformedIncidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

