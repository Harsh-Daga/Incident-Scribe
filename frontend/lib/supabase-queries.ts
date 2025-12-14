import { supabase, Incident, AIAnalysis } from './db';

export async function getIncidents(filters?: {
  status?: string;
  severity?: string;
  service?: string;
  limit?: number;
}) {
  let query = supabase
    .from('incidents')
    .select('*')
    .order('timestamp', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }

  if (filters?.service) {
    query = query.eq('service', filters.service);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching incidents:', error);
    throw error;
  }

  return data as Incident[];
}

export async function getIncidentById(id: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('external_id', id)
    .single();

  if (error) {
    console.error('Error fetching incident:', error);
    throw error;
  }

  return data as Incident;
}

export async function createIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('incidents')
    .insert([incident])
    .select()
    .single();

  if (error) {
    console.error('Error creating incident:', error);
    throw error;
  }

  // Audit log
  await supabase.from('audit_log').insert([{
    incident_id: data.id,
    action: 'incident_created',
    details: { source: incident.source }
  }]);

  return data as Incident;
}

export async function updateIncidentStatus(
  incidentId: string,
  status: 'open' | 'investigating' | 'resolved' | 'closed'
) {
  const updates: any = { status };

  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('external_id', incidentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating incident status:', error);
    throw error;
  }

  // Audit log
  await supabase.from('audit_log').insert([{
    incident_id: data.id,
    action: 'status_changed',
    details: { old_status: data.status, new_status: status }
  }]);

  return data as Incident;
}

export async function saveAIAnalysis(analysis: Omit<AIAnalysis, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('ai_analyses')
    .insert([analysis])
    .select()
    .single();

  if (error) {
    console.error('Error saving AI analysis:', error);
    throw error;
  }

  return data as AIAnalysis;
}

export async function getAIAnalysis(incidentId: string) {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore "not found" error
    console.error('Error fetching AI analysis:', error);
    throw error;
  }

  return data as AIAnalysis | null;
}
