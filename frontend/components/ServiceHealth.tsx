'use client';

import { Incident } from '@/types/incident';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ServiceHealthProps {
  incident: Incident;
}

export function ServiceHealth({ incident }: ServiceHealthProps) {
  const metrics = incident.metrics;
  const errorRate = metrics.error_rate || 0;
  const latency = metrics.latency_p95_ms || 0;

  const getHealthStatus = () => {
    if (errorRate > 0.1 || latency > 1000) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (errorRate > 0.05 || latency > 500) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const health = getHealthStatus();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Service Health</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${health.bg} ${health.color}`}>
          {health.status.toUpperCase()}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Error Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {(errorRate * 100).toFixed(1)}%
            </span>
            {errorRate > 0.05 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${errorRate > 0.1 ? 'bg-red-500' : errorRate > 0.05 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(errorRate * 1000, 100)}%` }}
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">Latency (p95)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {latency}ms
            </span>
            {latency > 500 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : latency > 200 ? (
              <Minus className="w-4 h-4 text-yellow-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {latency < 200 ? 'Excellent' : latency < 500 ? 'Good' : 'Needs attention'}
          </div>
        </div>
      </div>
    </div>
  );
}

