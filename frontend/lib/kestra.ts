import axios from 'axios';
import { getConfigs } from './system-config';

export interface KestraIncidentData {
  id: string;
  timestamp: string;
  service: string;
  severity: string;
  status: string;
  title: string;
  logs: string[];
  metrics: Record<string, any>;
  context: Record<string, any>;
  organization_id?: string; // Required for multi-tenancy
}

/**
 * Get Kestra config from system config (with env fallback)
 */
async function getKestraConfig() {
  const configs = await getConfigs(['KESTRA_URL', 'KESTRA_USERNAME', 'KESTRA_PASSWORD']);
  return {
    url: configs.KESTRA_URL || process.env.KESTRA_URL,
    username: configs.KESTRA_USERNAME || process.env.KESTRA_USERNAME,
    password: configs.KESTRA_PASSWORD || process.env.KESTRA_PASSWORD
  };
}

/**
 * Trigger Kestra workflow for incident analysis
 * Uses webhook endpoint with optional basic auth
 */
export async function triggerKestraWorkflowDirect(incident: KestraIncidentData) {
  const config = await getKestraConfig();

  if (!config.url) {
    throw new Error('KESTRA_URL is not configured. Set it in system config or environment variables.');
  }

  // Validate organization_id is present
  if (!incident.organization_id) {
    throw new Error('organization_id is required in incident data for Kestra workflow');
  }

  const namespace = 'incident.response';
  const flowId = 'incident-handler';
  const webhookKey = 'incident-webhook-key';

  const triggerUrl = `${config.url}/api/v1/executions/webhook/${namespace}/${flowId}/${webhookKey}`;

  console.log('Triggering Kestra workflow:', { 
    triggerUrl, 
    namespace, 
    flowId, 
    incidentId: incident.id,
    organizationId: incident.organization_id
  });

  const axiosConfig: any = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  };

  // Add auth if credentials provided
  if (config.username && config.password) {
    axiosConfig.auth = {
      username: config.username,
      password: config.password
    };
  }

  try {
    const response = await axios.post(
      triggerUrl,
      { incident_data: incident },
      axiosConfig
    );

    return {
      executionId: response.data.id || `exec-${Date.now()}`,
      status: response.data.state?.current || 'RUNNING',
      success: true
    };
  } catch (error: any) {
    console.error('Kestra trigger error:', error.message);
    
    // Return partial success - incident is saved, workflow trigger failed
    return {
      executionId: null,
      status: 'FAILED',
      success: false,
      error: error.message
    };
  }
}

/**
 * Get execution status from Kestra
 */
export async function getKestraExecutionStatus(executionId: string) {
  const config = await getKestraConfig();

  if (!config.url) {
    throw new Error('KESTRA_URL is not configured. Set it in system config or environment variables.');
  }

  const statusUrl = `${config.url}/api/v1/executions/${executionId}`;

  const axiosConfig: any = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  };

  if (config.username && config.password) {
    axiosConfig.auth = {
      username: config.username,
      password: config.password
    };
  }

  try {
    const response = await axios.get(statusUrl, axiosConfig);
    return {
      id: response.data.id,
      state: response.data.state?.current,
      outputs: response.data.outputs || {},
      startDate: response.data.state?.startDate,
      endDate: response.data.state?.endDate
    };
  } catch (error: any) {
    console.error('Kestra status check error:', error.message);
    throw error;
  }
}
