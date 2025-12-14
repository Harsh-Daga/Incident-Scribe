'use client';

import { Incident } from '@/types/incident';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricsChartProps {
  incident: Incident;
}

export function MetricsChart({ incident }: MetricsChartProps) {
  const metrics = incident.metrics;
  
  const chartData = [
    ...(metrics.error_rate ? [{
      name: 'Error Rate',
      value: metrics.error_rate * 100,
      unit: '%',
    }] : []),
    ...(metrics.latency_p95_ms ? [{
      name: 'Latency (p95)',
      value: metrics.latency_p95_ms,
      unit: 'ms',
    }] : []),
    ...(metrics.requests_per_sec ? [{
      name: 'Requests/sec',
      value: metrics.requests_per_sec,
      unit: '/s',
    }] : []),
    ...(metrics.memory_usage_pct ? [{
      name: 'Memory Usage',
      value: metrics.memory_usage_pct,
      unit: '%',
    }] : []),
    ...(metrics.queue_depth ? [{
      name: 'Queue Depth',
      value: metrics.queue_depth,
      unit: 'msgs',
    }] : []),
  ];

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">No metrics available for visualization</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value}${props.payload.unit}`,
              name,
            ]}
          />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

