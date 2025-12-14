import axios from 'axios';
import { Incident, KestraExecution } from '@/types/incident';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export async function getIncidents(): Promise<Incident[]> {
  const response = await axios.get(`${API_BASE}/incidents`);
  return response.data;
}

export async function getIncident(id: string): Promise<Incident | null> {
  const response = await axios.get(`${API_BASE}/incidents/${id}`);
  return response.data;
}

export async function triggerKestraWorkflow(incident: Incident): Promise<KestraExecution> {
  const response = await axios.post(`${API_BASE}/kestra/trigger`, {
    incident_data: incident,
  });
  return response.data;
}

export async function analyzeIncident(incidentId: string): Promise<Response> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    throw new Error('Incident not found');
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ incident }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response;
}

