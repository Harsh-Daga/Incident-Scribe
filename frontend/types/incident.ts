export interface Organization {
  id: string;
  name: string;
  slug: string;
  webhook_key: string;
  settings?: Record<string, any>;
}

export interface Incident {
  id: string;
  internal_id?: string;  // Database UUID
  organization_id: string;
  timestamp: string;
  service: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'open' | 'resolved' | 'investigating' | 'closed';
  title: string;
  description?: string;
  logs: string[];
  ai_analysis?: {
    analysis?: string;
    remediation?: string;
    documentation?: string;
    confidence_level?: string;
    kestra_execution_id?: string;
    created_at?: string;
  };
  metrics: {
    error_rate?: number;
    latency_p95_ms?: number;
    requests_per_sec?: number;
    failed_requests?: number;
    memory_usage_pct?: number;
    gc_time_ms?: number;
    heap_size_mb?: number;
    gc_count_per_min?: number;
    queue_depth?: number;
    consumer_lag_sec?: number;
    processing_rate_msg_sec?: number;
    timeout_count?: number;
    requests_blocked?: number;
    rate_limit_threshold?: number;
    current_request_rate?: number;
    unique_ips?: number;
    cache_miss_rate?: number;
    cache_hit_rate?: number;
    cache_size_mb?: number;
    eviction_count?: number;
    uptime?: number;
    memory_usage?: number;
    active_connections?: number;
    [key: string]: any;
  };
  context: {
    host?: string;
    region?: string;
    version?: string;
    deployment?: string;
    client_id?: string;
    [key: string]: any;
  };
}

export interface IncidentAnalysis {
  error_clusters?: Array<{
    pattern: string;
    count: number;
    severity: string;
  }>;
  root_cause?: string;
  root_cause_confidence?: string;
  impact_analysis?: {
    affected_users?: string;
    business_impact?: string;
    technical_impact?: string;
  };
  proposed_fixes?: Array<{
    fix: string;
    priority: string;
    effort: string;
    risk: string;
  }>;
  remediation_commands?: Array<{
    command: string;
    purpose: string;
    safe: boolean;
  }>;
  preventive_measures?: string[];
}

export interface KestraExecution {
  id?: string;
  executionId?: string;
  success: boolean;
  status?: string;
  startDate?: string;
  endDate?: string;
  error?: string;
  message?: string;
}

