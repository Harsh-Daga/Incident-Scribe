import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig, getConfigs } from './system-config';

interface KestraConfig {
  url: string;
  username?: string;
  password?: string;
}

// Cached config for sync functions
let cachedConfig: KestraConfig | null = null;

/**
 * Get Kestra config from database (with env fallback)
 */
async function getKestraConfigAsync(): Promise<KestraConfig> {
  const configs = await getConfigs(['KESTRA_URL', 'KESTRA_USERNAME', 'KESTRA_PASSWORD']);
  
  cachedConfig = {
    url: configs.KESTRA_URL || process.env.KESTRA_URL || 'http://localhost:8080',
    username: configs.KESTRA_USERNAME || process.env.KESTRA_USERNAME,
    password: configs.KESTRA_PASSWORD || process.env.KESTRA_PASSWORD
  };
  
  return cachedConfig;
}

/**
 * Get Kestra config synchronously (uses cached value or env vars)
 */
function getKestraConfig(): KestraConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  // Fallback to env vars if cache not populated
  return {
    url: process.env.KESTRA_URL || 'http://localhost:8080',
    username: process.env.KESTRA_USERNAME,
    password: process.env.KESTRA_PASSWORD
  };
}

function getAuthHeader(): Record<string, string> {
  const config = getKestraConfig();
  if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    return { 'Authorization': `Basic ${credentials}` };
  }
  return {};
}

async function getAuthHeaderAsync(): Promise<Record<string, string>> {
  const config = await getKestraConfigAsync();
  if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    return { 'Authorization': `Basic ${credentials}` };
  }
  return {};
}

/**
 * Check if Kestra is accessible
 */
export async function checkKestraConnection(): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    const response = await axios.get(`${config.url}/api/v1/plugins`, {
      headers: authHeader,
      timeout: 5000
    });
    
    return {
      connected: true,
      version: response.headers['x-kestra-version'] || 'unknown'
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Failed to connect to Kestra'
    };
  }
}

/**
 * Check if a namespace exists
 */
export async function checkNamespaceExists(namespace: string): Promise<boolean> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    await axios.get(
      `${config.url}/api/v1/flows/${namespace}`,
      {
        headers: authHeader,
        timeout: 5000
      }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a flow exists
 */
export async function checkFlowExists(namespace: string, flowId: string): Promise<boolean> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    const response = await axios.get(
      `${config.url}/api/v1/flows/${namespace}/${flowId}`,
      {
        headers: authHeader,
        timeout: 5000
      }
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Upload or update a flow
 */
export async function uploadFlow(
  namespace: string,
  flowId: string,
  yamlContent: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    // Try to create or update the flow
    await axios.post(
      `${config.url}/api/v1/flows/import`,
      yamlContent,
      {
        headers: {
          ...authHeader,
          'Content-Type': 'application/x-yaml'
        },
        timeout: 10000
      }
    );
    
    return { success: true };
  } catch (error: any) {
    // If import fails, try PUT for update
    try {
      await axios.put(
        `${config.url}/api/v1/flows/${namespace}/${flowId}`,
        yamlContent,
        {
          headers: {
            ...authHeader,
            'Content-Type': 'application/x-yaml'
          },
          timeout: 10000
        }
      );
      return { success: true };
    } catch (putError: any) {
      return {
        success: false,
        error: putError.response?.data?.message || putError.message || 'Failed to upload flow'
      };
    }
  }
}

/**
 * Set a KV store value
 */
export async function setKVSecret(
  namespace: string,
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    // Kestra KV Store API
    await axios.put(
      `${config.url}/api/v1/namespaces/${namespace}/kv/${key}`,
      value,
      {
        headers: {
          ...authHeader,
          'Content-Type': 'text/plain'
        },
        timeout: 5000
      }
    );
    
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to set KV secret'
    };
  }
}

/**
 * Get a KV store value
 */
export async function getKVSecret(
  namespace: string,
  key: string
): Promise<{ exists: boolean; value?: string; error?: string }> {
  const config = await getKestraConfigAsync();
  const authHeader = await getAuthHeaderAsync();
  
  try {
    const response = await axios.get(
      `${config.url}/api/v1/namespaces/${namespace}/kv/${key}`,
      {
        headers: authHeader,
        timeout: 5000
      }
    );
    
    return { exists: true, value: response.data };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { exists: false };
    }
    return {
      exists: false,
      error: error.message || 'Failed to get KV secret'
    };
  }
}

/**
 * Configure all required KV secrets for Kestra
 * Gets values from system_config (Supabase) with env fallback
 */
export async function configureKVSecrets(): Promise<{
  success: boolean;
  configured: string[];
  failed: string[];
}> {
  const namespace = 'incident.response';
  
  // Get GEMINI_API_KEY from system config
  const geminiKey = await getConfig('GEMINI_API_KEY');
  
  const secrets = {
    'GEMINI_API_KEY': geminiKey || process.env.GEMINI_API_KEY,
    'SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  const configured: string[] = [];
  const failed: string[] = [];
  
  for (const [key, value] of Object.entries(secrets)) {
    if (!value) {
      failed.push(`${key} (not set in environment)`);
      continue;
    }
    
    const result = await setKVSecret(namespace, key, value);
    if (result.success) {
      configured.push(key);
    } else {
      failed.push(`${key} (${result.error})`);
    }
  }
  
  return {
    success: failed.length === 0,
    configured,
    failed
  };
}

/**
 * Get the incident-handler workflow YAML content
 */
export function getWorkflowYaml(): string {
  // Try to read from file system
  try {
    const workflowPath = path.join(process.cwd(), '..', 'kestra', 'flows', 'incident-handler.yml');
    if (fs.existsSync(workflowPath)) {
      return fs.readFileSync(workflowPath, 'utf-8');
    }
  } catch (error) {
    console.log('Could not read workflow file from filesystem');
  }
  
  // Return embedded workflow
  return `id: incident-handler
namespace: incident.response

description: |
  Production-ready AI-powered incident analysis and remediation workflow.

labels:
  env: production
  team: sre

inputs:
  - id: incident_data
    type: JSON
    description: Incident details from webhook
    required: true

tasks:
  - id: log_incident
    type: io.kestra.plugin.core.log.Log
    message: |
      ========================================
      📢 INCIDENT RECEIVED
      ========================================
      ID: {{ inputs.incident_data.id }}
      Service: {{ inputs.incident_data.service }}
      Severity: {{ inputs.incident_data.severity }}
      Title: {{ inputs.incident_data.title }}
      Organization: {{ inputs.incident_data.organization_id }}
      ========================================

  - id: ai_agent_analyze
    type: io.kestra.plugin.core.http.Request
    uri: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{ kv('GEMINI_API_KEY') }}"
    method: POST
    contentType: application/json
    timeout: PT60S
    body: |
      {
        "contents": [{"parts": [{"text": "Analyze this incident: {{ inputs.incident_data.title }} for service {{ inputs.incident_data.service }}. Severity: {{ inputs.incident_data.severity }}. Provide root cause and remediation."}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2000}
      }

  - id: log_completion
    type: io.kestra.plugin.core.log.Log
    message: |
      ✅ INCIDENT ANALYSIS COMPLETE
      Incident ID: {{ inputs.incident_data.id }}

triggers:
  - id: webhook
    type: io.kestra.plugin.core.trigger.Webhook
    key: incident-webhook-key

outputs:
  - id: incident_id
    type: STRING
    value: "{{ inputs.incident_data.id }}"
  - id: execution_id
    type: STRING
    value: "{{ execution.id }}"
`;
}

/**
 * Run complete Kestra setup
 */
export async function runKestraSetup(): Promise<{
  success: boolean;
  steps: Array<{ step: string; success: boolean; details?: any; error?: string }>;
}> {
  const steps: Array<{ step: string; success: boolean; details?: any; error?: string }> = [];
  
  // Step 1: Check connection
  const connectionResult = await checkKestraConnection();
  steps.push({
    step: 'Check Kestra Connection',
    success: connectionResult.connected,
    details: connectionResult.connected ? { version: connectionResult.version } : undefined,
    error: connectionResult.error
  });
  
  if (!connectionResult.connected) {
    return { success: false, steps };
  }
  
  // Step 2: Upload workflow
  const workflowYaml = getWorkflowYaml();
  const uploadResult = await uploadFlow('incident.response', 'incident-handler', workflowYaml);
  steps.push({
    step: 'Upload Workflow',
    success: uploadResult.success,
    error: uploadResult.error
  });
  
  // Step 3: Configure KV secrets
  const kvResult = await configureKVSecrets();
  steps.push({
    step: 'Configure KV Secrets',
    success: kvResult.success,
    details: {
      configured: kvResult.configured,
      failed: kvResult.failed
    },
    error: kvResult.failed.length > 0 ? `Failed to set: ${kvResult.failed.join(', ')}` : undefined
  });
  
  // Step 4: Verify workflow exists
  const flowExists = await checkFlowExists('incident.response', 'incident-handler');
  steps.push({
    step: 'Verify Workflow',
    success: flowExists,
    error: flowExists ? undefined : 'Workflow not found after upload'
  });
  
  const allSuccess = steps.every(s => s.success);
  
  return { success: allSuccess, steps };
}

