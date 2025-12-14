import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest, NextResponse } from 'next/server';

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
    // Rate limiting based on IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip, 10, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { incident } = await req.json();

    if (!incident) {
      return NextResponse.json({ error: 'Incident data required' }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Please set it in .env.local' },
        { status: 500 }
      );
    }

    // Validate incident data
    if (!incident.id || !incident.service || !incident.logs) {
      return NextResponse.json(
        { error: 'Invalid incident data. Missing required fields.' },
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
${Array.isArray(incident.logs) ? incident.logs.join('\n') : JSON.stringify(incident.logs)}

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

    // Stream the response using Vercel AI SDK
    const result = await streamText({
      model: google('gemini-2.5-flash', {
        apiKey,
      }),
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // streamText returns helpers; use toTextStreamResponse for streaming
    if (typeof result.toTextStreamResponse === 'function') {
      return result.toTextStreamResponse();
    }

    // Fallback: return plain text response
    const text = await result.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Internal server error: ${error.message || 'Unknown error'}`
      : 'Internal server error. Please check server logs.';
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
