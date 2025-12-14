import { supabase, Incident, AIAnalysis } from './db';
import { getAdminClient } from './supabase-admin';

// Organization type for webhook validation
export interface Organization {
  id: string;
  name: string;
  slug: string;
  webhook_key: string;
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// Organization management
export async function getOrganizationByWebhookKey(webhookKey: string): Promise<Organization> {
  // Use admin client to bypass RLS for webhook key lookup
  const adminClient = getAdminClient();
  
  const { data, error } = await adminClient
    .from('organizations')
    .select('*')
    .eq('webhook_key', webhookKey)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    throw new Error('Invalid webhook key');
  }

  return data as Organization;
}

export async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }

  return data;
}

// Incident management with organization filtering
export async function getIncidents(organizationId?: string, filters?: {
  status?: string;
  severity?: string;
  service?: string;
  limit?: number;
}) {
  let query = supabase
    .from('incidents')
    .select('*')
    .order('timestamp', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

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

export async function getIncidentById(id: string, organizationId?: string) {
  let query = supabase
    .from('incidents')
    .select('*')
    .eq('external_id', id);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('Error fetching incident:', error);
    throw error;
  }

  return data as Incident;
}

export async function createIncident(
  incident: Omit<Incident, 'id' | 'created_at' | 'updated_at' | 'organization_id'>,
  webhookKey: string
) {
  // Use admin client to bypass RLS for webhook ingestion
  const adminClient = getAdminClient();

  // Look up organization by webhook key (using admin client)
  const { data: organization, error: orgError } = await adminClient
    .from('organizations')
    .select('*')
    .eq('webhook_key', webhookKey)
    .single();

  if (orgError || !organization) {
    console.error('Error fetching organization:', orgError);
    throw new Error('Invalid webhook key');
  }

  // Check for idempotency - don't create duplicate incidents
  const { data: existingIncident } = await adminClient
    .from('incidents')
    .select('id, external_id')
    .eq('external_id', incident.external_id)
    .eq('organization_id', organization.id)
    .single();

  if (existingIncident) {
    console.log(`Incident ${incident.external_id} already exists, returning existing`);
    const { data: fullIncident } = await adminClient
      .from('incidents')
      .select('*')
      .eq('id', existingIncident.id)
      .single();
    return fullIncident as Incident;
  }

  const incidentWithOrg = {
    ...incident,
    organization_id: organization.id
  };

  const { data, error } = await adminClient
    .from('incidents')
    .insert([incidentWithOrg])
    .select()
    .single();

  if (error) {
    console.error('Error creating incident:', error);
    throw error;
  }

  // Audit log (using admin client)
  await adminClient.from('audit_log').insert([{
    incident_id: data.id,
    organization_id: organization.id,
    action: 'incident_created',
    details: { source: incident.source }
  }]);

  return data as Incident;
}

export async function updateIncidentStatus(
  incidentId: string,
  status: 'open' | 'investigating' | 'resolved' | 'closed',
  organizationId?: string
) {
  const updates: any = { status };

  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString();
  }

  let query = supabase
    .from('incidents')
    .update(updates)
    .eq('external_id', incidentId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error} = await query.select().single();

  if (error) {
    console.error('Error updating incident status:', error);
    throw error;
  }

  // Audit log
  await supabase.from('audit_log').insert([{
    incident_id: data.id,
    organization_id: data.organization_id,
    action: 'status_changed',
    details: { old_status: data.status, new_status: status }
  }]);

  return data as Incident;
}

export async function saveAIAnalysis(analysis: Omit<AIAnalysis, 'id' | 'created_at' | 'organization_id'>, organizationId: string) {
  const analysisWithOrg = {
    ...analysis,
    organization_id: organizationId
  };

  const { data, error } = await supabase
    .from('ai_analyses')
    .insert([analysisWithOrg])
    .select()
    .single();

  if (error) {
    console.error('Error saving AI analysis:', error);
    throw error;
  }

  return data as AIAnalysis;
}

export async function getAIAnalysis(incidentId: string, organizationId?: string) {
  let query = supabase
    .from('ai_analyses')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') { // Ignore "not found" error
    console.error('Error fetching AI analysis:', error);
    throw error;
  }

  return data as AIAnalysis | null;
}
