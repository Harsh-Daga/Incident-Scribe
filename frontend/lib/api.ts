import axios, { AxiosError } from 'axios';
import { Incident, KestraExecution } from '@/types/incident';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

// Handle API errors consistently
function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    
    // Check for auth errors
    if (axiosError.response?.status === 401) {
      throw new Error('Unauthorized - please log in');
    }
    
    // Check for rate limiting
    if (axiosError.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const message = axiosError.response?.data?.error 
      || axiosError.response?.data?.message 
      || axiosError.message;
    throw new Error(message);
  }
  
  throw error;
}

export async function getIncidents(): Promise<Incident[]> {
  try {
    const response = await axios.get(`${API_BASE}/incidents`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getIncident(id: string): Promise<Incident | null> {
  try {
    const response = await axios.get(`${API_BASE}/incidents/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    handleApiError(error);
  }
}

export async function triggerKestraWorkflow(incident: Incident): Promise<KestraExecution> {
  try {
    const response = await axios.post(`${API_BASE}/kestra/trigger`, {
      incident_data: {
        id: incident.id,
        timestamp: incident.timestamp,
        service: incident.service,
        severity: incident.severity,
        status: incident.status,
        title: incident.title,
        logs: incident.logs,
        metrics: incident.metrics,
        context: incident.context
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
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
    credentials: 'include', // Include cookies for auth
  });

  if (response.status === 401) {
    throw new Error('Unauthorized - please log in');
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response;
}

export async function getKestraExecutionStatus(executionId: string) {
  try {
    const response = await axios.get(`${API_BASE}/kestra/execution/${executionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}
