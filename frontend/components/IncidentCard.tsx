'use client';

import Link from 'next/link';
import { Incident } from '@/types/incident';
import { getSeverityColor, getStatusColor, formatRelativeTime } from '@/lib/utils';
import { AlertTriangle, Clock, Server, Activity, TrendingUp, ArrowRight } from 'lucide-react';

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const severityColor = getSeverityColor(incident.severity);
  const statusColor = getStatusColor(incident.status);

  const getSeverityGradient = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'MEDIUM':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 'LOW':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  return (
    <Link href={`/incident/${incident.id}`}>
      <div className="group bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden">
        {/* Severity indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${getSeverityGradient(incident.severity)}`} />

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {incident.id}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${severityColor} shadow-sm`}>
                {incident.severity}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                {incident.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-800 font-semibold mb-3 text-lg">{incident.title}</p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{incident.service}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatRelativeTime(incident.timestamp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span>{incident.context.region}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AlertTriangle className={`w-8 h-8 ${
              incident.severity === 'HIGH' ? 'text-red-500 animate-pulse' :
              incident.severity === 'MEDIUM' ? 'text-yellow-500' :
              'text-green-500'
            }`} />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            {incident.metrics.error_rate !== undefined && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-red-700">Error Rate</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {(incident.metrics.error_rate * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {incident.metrics.latency_p95_ms && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">Latency P95</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {incident.metrics.latency_p95_ms}ms
                </div>
              </div>
            )}
            {incident.metrics.requests_per_sec && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-700">Requests/sec</span>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {incident.metrics.requests_per_sec}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </Link>
  );
}

