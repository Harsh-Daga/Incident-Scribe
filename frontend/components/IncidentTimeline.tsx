'use client';

import { Incident } from '@/types/incident';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface IncidentTimelineProps {
  incident: Incident;
}

export function IncidentTimeline({ incident }: IncidentTimelineProps) {
  const timelineEvents = [
    {
      time: incident.timestamp,
      type: 'detected',
      title: 'Incident Detected',
      description: `Incident ${incident.id} detected for service ${incident.service}`,
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      time: new Date(new Date(incident.timestamp).getTime() + 5 * 60000).toISOString(),
      type: 'investigating',
      title: 'Investigation Started',
      description: 'SRE team began investigating root cause',
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      time: new Date(new Date(incident.timestamp).getTime() + 15 * 60000).toISOString(),
      type: 'analyzing',
      title: 'AI Analysis Complete',
      description: 'AI agent completed analysis and proposed fixes',
      icon: CheckCircle,
      color: 'text-blue-500',
    },
    ...(incident.status === 'resolved' ? [{
      time: new Date(new Date(incident.timestamp).getTime() + 30 * 60000).toISOString(),
      type: 'resolved',
      title: 'Incident Resolved',
      description: 'Service restored to normal operation',
      icon: CheckCircle,
      color: 'text-green-500',
    }] : []),
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Timeline</h3>
      <div className="space-y-4">
        {timelineEvents.map((event, idx) => {
          const Icon = event.icon;
          return (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full bg-gray-100 ${event.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {idx < timelineEvents.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(event.time)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
                <span className="text-xs text-gray-400">{formatDate(event.time)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

