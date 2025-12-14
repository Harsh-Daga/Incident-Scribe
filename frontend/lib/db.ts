import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export interface Incident {
  id: string;
  external_id: string;
  organization_id: string;
  source: string;
  timestamp: string;
  service: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  title: string;
  description?: string;
  logs: string[];
  metrics: Record<string, any>;
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface AIAnalysis {
  id: string;
  incident_id: string;
  kestra_execution_id?: string;
  analysis?: string;
  remediation?: string;
  documentation?: string;
  confidence_level?: string;
  created_at: string;
}
