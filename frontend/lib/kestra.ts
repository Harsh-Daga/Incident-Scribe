import axios from 'axios';

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
}

export async function triggerKestraWorkflowDirect(incident: KestraIncidentData) {
  const kestraUrl = process.env.KESTRA_URL;
  const kestraUsername = process.env.KESTRA_USERNAME;
  const kestraPassword = process.env.KESTRA_PASSWORD;

  if (!kestraUrl) {
    throw new Error('KESTRA_URL environment variable is required');
  }

  if (!kestraUsername || !kestraPassword) {
    throw new Error('KESTRA_USERNAME and KESTRA_PASSWORD must be set in environment variables');
  }

  const namespace = 'incident.response';
  const flowId = 'incident-handler';
  const webhookKey = 'incident-webhook-key';

  const triggerUrl = `${kestraUrl}/api/v1/executions/webhook/${namespace}/${flowId}/${webhookKey}`;

  console.log('Triggering Kestra workflow:', { triggerUrl, namespace, flowId, incident: incident.id });

  const response = await axios.post(
    triggerUrl,
    { incident_data: incident },
    {
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: kestraUsername,
        password: kestraPassword
      },
      timeout: 10000
    }
  );

  return {
    executionId: response.data.id,
    status: response.data.state?.current || 'RUNNING'
  };
}
