import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params;
    const kestraUrl = process.env.KESTRA_URL || 'http://localhost:8080';
    const tenant = 'main';

    // Use simple execution ID endpoint (works with any flow)
    let url = `${kestraUrl}/api/v1/${tenant}/executions/${executionId}`;

    console.log('Fetching execution status:', { url, executionId });

    // Basic auth credentials for Kestra - MUST be set in environment
    if (!process.env.KESTRA_USERNAME || !process.env.KESTRA_PASSWORD) {
      throw new Error('KESTRA_USERNAME and KESTRA_PASSWORD must be set in environment variables');
    }

    const auth = {
      username: process.env.KESTRA_USERNAME,
      password: process.env.KESTRA_PASSWORD
    };

    const response = await axios.get(url, {
      auth: auth,
      timeout: 5000
    });

    const execution = response.data;

    // Helper function to parse Gemini response
    const parseGeminiResponse = (output: any): string | null => {
      if (!output) return null;
      try {
        const geminiResponse = typeof output === 'string' ? JSON.parse(output) : output;
        if (geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts?.[0]?.text) {
          return geminiResponse.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        console.error('Error parsing Gemini output:', e);
      }
      return typeof output === 'string' ? output : JSON.stringify(output);
    };

    // Extract AI results from all three AI agents
    const taskRunList = execution.taskRunList || [];

    const analysisTask = taskRunList.find((task: any) => task.taskId === 'ai_agent_analyze');
    const remediationTask = taskRunList.find((task: any) => task.taskId === 'ai_agent_remediation');
    const documentationTask = taskRunList.find((task: any) => task.taskId === 'ai_agent_documentation');

    const parsedAIAnalysis = parseGeminiResponse(analysisTask?.outputs?.body);
    const parsedRemediation = parseGeminiResponse(remediationTask?.outputs?.body);
    const parsedDocumentation = parseGeminiResponse(documentationTask?.outputs?.body);

    // Parse ISO 8601 duration (PT21.195872S -> 21.2 seconds)
    const parseDuration = (isoDuration: string | null): number | null => {
      if (!isoDuration) return null;
      const match = isoDuration.match(/PT([\d.]+)S/);
      return match ? parseFloat(match[1]) : null;
    };

    // Construct proper Kestra UI URL
    const kestraUiUrl = `http://localhost:8080/ui/${tenant}/executions/${execution.namespace}/${execution.flowId}/${execution.id}`;

    return NextResponse.json({
      executionId: execution.id,
      status: execution.state?.current || 'UNKNOWN',
      startDate: execution.state?.startDate,
      endDate: execution.state?.endDate,
      duration: parseDuration(execution.state?.duration),
      outputs: execution.outputs || {},
      aiResults: {
        analysis: parsedAIAnalysis,
        remediation: parsedRemediation,
        documentation: parsedDocumentation
      },
      url: kestraUiUrl
    });
  } catch (error: any) {
    const { id: executionId } = await params;
    console.error('Error fetching execution:', error.message, error.response?.status);

    const is401 = error.response?.status === 401;

    return NextResponse.json({
      error: is401
        ? 'Kestra authentication required'
        : 'Failed to fetch execution status',
      details: is401
        ? 'Please view execution details in Kestra UI at http://localhost:8080'
        : error.message,
      executionId: executionId,
      status: 'PENDING',
      aiResults: {
        analysis: null,
        remediation: null,
        documentation: null
      },
      url: `http://localhost:8080/ui/executions/${executionId}`
    }, { status: is401 ? 200 : (error.response?.status || 500) });
  }
}
