import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, is_platform_admin')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const service = searchParams.get('service') || undefined;

    // Build query - RLS will automatically filter by organization
    let query = supabase
      .from('incidents')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    // For non-platform admins, explicitly filter by organization
    if (!userData.is_platform_admin) {
      if (!userData.organization_id) {
        return NextResponse.json({ error: 'Forbidden - no organization assigned' }, { status: 403 });
      }
      query = query.eq('organization_id', userData.organization_id);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (service) {
      query = query.eq('service', service);
    }

    const { data: incidents, error: incError } = await query;

    if (incError) {
      console.error('Error fetching incidents:', incError);
      return NextResponse.json(
        { error: 'Failed to fetch incidents', details: incError.message },
        { status: 500 }
      );
    }

    // Transform to match frontend interface
    const transformedIncidents = (incidents || []).map(inc => ({
      id: inc.external_id,
      organization_id: inc.organization_id,
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
  } catch (error: any) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents', details: error.message },
      { status: 500 }
    );
  }
}

