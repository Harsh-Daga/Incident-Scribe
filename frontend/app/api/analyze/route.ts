import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedOrganizationId } from '@/lib/supabase/server';
import { getConfig } from '@/lib/system-config';

// Use Node.js runtime for better compatibility with environment variables
export const runtime = 'nodejs';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify user is authenticated
    const organizationId = await getAuthenticatedOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    // Rate limiting based on organization
    if (!rateLimit(organizationId, 20, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { incident } = await req.json();

    if (!incident) {
      return NextResponse.json({ error: 'Incident data required' }, { status: 400 });
    }

    // Get API key from system config (with env fallback)
    const apiKey = await getConfig('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in system config or environment variables');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Please set it in system configuration or .env.local' },
        { status: 500 }
      );
    }

    // Validate incident data
    if (!incident.id || !incident.service) {
      return NextResponse.json(
        { error: 'Invalid incident data. Missing required fields: id, service' },
        { status: 400 }
      );
    }

    // Create prompt for analysis
    const prompt = `You are an expert SRE AI Agent analyzing a production incident. Perform comprehensive analysis:

INCIDENT: ${incident.id}
SERVICE: ${incident.service}
SEVERITY: ${incident.severity || 'UNKNOWN'}
TITLE: ${incident.title || 'Untitled Incident'}

ERROR LOGS:
${Array.isArray(incident.logs) ? incident.logs.join('\n') : JSON.stringify(incident.logs || [])}

METRICS:
${JSON.stringify(incident.metrics || {}, null, 2)}

CONTEXT:
${JSON.stringify(incident.context || {}, null, 2)}

Provide a detailed analysis covering:
1. **Root Cause Analysis**: What caused this incident?
2. **Impact Assessment**: Who/what is affected?
3. **Error Clustering**: Group similar errors and identify patterns
4. **Proposed Fixes**: Specific, actionable remediation steps
5. **Preventive Measures**: How to prevent recurrence
6. **Confidence Level**: How confident are you in this analysis?

Be specific, technical, and actionable. Format your response clearly with headers.`;

    // Create Google AI provider with API key
    const google = createGoogleGenerativeAI({
      apiKey,
    });

    // Stream the response using Vercel AI SDK
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      prompt,
    });

    // streamText returns helpers; use toTextStreamResponse for streaming
    if (typeof result.toTextStreamResponse === 'function') {
      return result.toTextStreamResponse();
    }

    // Fallback: return plain text response
    const text = await result.text;
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    
    // Return detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Internal server error: ${error.message || 'Unknown error'}`
      : 'Internal server error. Please check server logs.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
