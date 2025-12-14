'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Incident } from '@/types/incident';
import { getIncidents } from '@/lib/api';
import { GitBranch, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { getSeverityColor, formatRelativeTime } from '@/lib/utils';

interface RelatedIncidentsProps {
  currentIncident: Incident;
}

export function RelatedIncidents({ currentIncident }: RelatedIncidentsProps) {
  const [relatedIncidents, setRelatedIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRelatedIncidents() {
      try {
        const allIncidents = await getIncidents();

        // Find related incidents based on:
        // 1. Same service
        // 2. Same severity
        // 3. Similar error patterns in logs
        const related = allIncidents
          .filter(inc => inc.id !== currentIncident.id)
          .map(inc => {
            let score = 0;

            // Same service = strong correlation
            if (inc.service === currentIncident.service) score += 50;

            // Same severity = moderate correlation
            if (inc.severity === currentIncident.severity) score += 20;

            // Similar log patterns
            const currentLogKeywords = currentIncident.logs.join(' ').toLowerCase();
            const incLogKeywords = inc.logs.join(' ').toLowerCase();

            if (currentLogKeywords.includes('timeout') && incLogKeywords.includes('timeout')) score += 30;
            if (currentLogKeywords.includes('database') && incLogKeywords.includes('database')) score += 30;
            if (currentLogKeywords.includes('connection') && incLogKeywords.includes('connection')) score += 30;
            if (currentLogKeywords.includes('memory') && incLogKeywords.includes('memory')) score += 30;

            // Same region
            if (inc.context.region === currentIncident.context.region) score += 10;

            return { incident: inc, score };
          })
          .filter(item => item.score > 20) // Only show incidents with some correlation
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(item => item.incident);

        setRelatedIncidents(related);
      } catch (error) {
        console.error('Error loading related incidents:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRelatedIncidents();
  }, [currentIncident]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (relatedIncidents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <GitBranch className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Related Incidents</h3>
        </div>
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No related incidents found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <GitBranch className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Related Incidents</h3>
          <p className="text-sm text-gray-600">Correlated by service, severity, and error patterns</p>
        </div>
      </div>

      <div className="space-y-3">
        {relatedIncidents.map((incident) => {
          const severityColor = getSeverityColor(incident.severity);

          return (
            <Link
              key={incident.id}
              href={`/incident/${incident.id}`}
              className="block group"
            >
              <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {incident.id}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${severityColor}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-2">
                      {incident.title}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(incident.timestamp)}
                      </span>
                      <span className="font-medium">{incident.service}</span>
                    </div>
                  </div>
                  <AlertTriangle className={`w-5 h-5 ${
                    incident.severity === 'HIGH' ? 'text-red-500' :
                    incident.severity === 'MEDIUM' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                </div>

                {/* Correlation indicators */}
                <div className="flex gap-2 mt-3">
                  {incident.service === currentIncident.service && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      Same Service
                    </span>
                  )}
                  {incident.severity === currentIncident.severity && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      Same Severity
                    </span>
                  )}
                  {incident.context.region === currentIncident.context.region && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      Same Region
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span>Found {relatedIncidents.length} correlated incident{relatedIncidents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
