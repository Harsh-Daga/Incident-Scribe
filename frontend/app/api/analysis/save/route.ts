import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Failed to fetch user organization' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { incidentId, executionId, analysis, remediation, documentation } = body;

    if (!incidentId) {
      return NextResponse.json(
        { error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    // Parse AI response if needed
    const parseAIResponse = (data: any): string | null => {
      if (!data) return null;
      if (typeof data === 'string') return data;
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      return JSON.stringify(data);
    };

    // Save or update AI analysis
    const { data: existingAnalysis } = await supabase
      .from('ai_analyses')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('organization_id', userData.organization_id)
      .maybeSingle();

    const analysisData = {
      incident_id: incidentId,
      organization_id: userData.organization_id,
      kestra_execution_id: executionId,
      analysis: parseAIResponse(analysis),
      remediation: parseAIResponse(remediation),
      documentation: parseAIResponse(documentation),
      confidence_level: 'HIGH',
    };

    let result;
    if (existingAnalysis) {
      // Update existing
      const { data, error } = await supabase
        .from('ai_analyses')
        .update(analysisData)
        .eq('id', existingAnalysis.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('ai_analyses')
        .insert([analysisData])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error('Error saving analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis', details: error.message },
      { status: 500 }
    );
  }
}

