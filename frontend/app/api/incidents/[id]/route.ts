import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
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

    const { id } = await params;

    // Build query - RLS will handle access control
    let query = supabase
      .from('incidents')
      .select('*')
      .eq('external_id', id);

    // For non-platform admins, explicitly filter by organization
    if (!userData.is_platform_admin && userData.organization_id) {
      query = query.eq('organization_id', userData.organization_id);
    }

    const { data: incident, error: incError } = await query.single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Optionally fetch AI analysis if it exists
    let aiAnalysis = null;
    const { data: analysisData } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (analysisData) {
      aiAnalysis = analysisData;
    }

    // Transform to match frontend interface
    const transformedIncident = {
      id: incident.external_id,
      internal_id: incident.id,
      organization_id: incident.organization_id,
      timestamp: incident.timestamp,
      service: incident.service,
      severity: incident.severity,
      status: incident.status,
      title: incident.title,
      description: incident.description,
      logs: incident.logs || [],
      metrics: incident.metrics || {},
      context: incident.context || {},
      created_at: incident.created_at,
      updated_at: incident.updated_at,
      resolved_at: incident.resolved_at,
      ai_analysis: aiAnalysis ? {
        analysis: aiAnalysis.analysis,
        remediation: aiAnalysis.remediation,
        documentation: aiAnalysis.documentation,
        confidence_level: aiAnalysis.confidence_level,
        kestra_execution_id: aiAnalysis.kestra_execution_id,
        created_at: aiAnalysis.created_at
      } : null
    };

    return NextResponse.json(transformedIncident);
  } catch (error: any) {
    console.error('Error fetching incident:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident', details: error.message },
      { status: 500 }
    );
  }
}
