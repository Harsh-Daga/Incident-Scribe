'use client';

import { Incident } from '@/types/incident';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface IncidentInsightsProps {
  incident: Incident;
}

export function IncidentInsights({ incident }: IncidentInsightsProps) {
  // Generate insights based on incident data
  const getImpactLevel = () => {
    if (incident.severity === 'HIGH' && incident.metrics.error_rate && incident.metrics.error_rate > 0.3) {
      return { level: 'Critical', color: 'red', icon: AlertTriangle };
    } else if (incident.severity === 'MEDIUM') {
      return { level: 'Moderate', color: 'yellow', icon: TrendingUp };
    }
    return { level: 'Low', color: 'green', icon: CheckCircle };
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (incident.metrics.error_rate && incident.metrics.error_rate > 0.3) {
      recommendations.push({
        title: 'High Error Rate Detected',
        description: 'Error rate exceeds 30%. Immediate investigation recommended.',
        priority: 'high'
      });
    }

    if (incident.metrics.latency_p95_ms && incident.metrics.latency_p95_ms > 5000) {
      recommendations.push({
        title: 'High Latency Alert',
        description: 'P95 latency is above 5 seconds. Check database connections and API performance.',
        priority: 'high'
      });
    }

    if (incident.service === 'payment-api' || incident.service === 'auth-service') {
      recommendations.push({
        title: 'Critical Service Impact',
        description: `${incident.service} is a critical service. Consider rolling back recent changes.`,
        priority: 'critical'
      });
    }

    if (incident.logs.some(log => log.toLowerCase().includes('timeout'))) {
      recommendations.push({
        title: 'Timeout Pattern Detected',
        description: 'Multiple timeout errors found. Review connection pool settings and network latency.',
        priority: 'medium'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Normal Operations',
        description: 'No critical issues detected. Continue monitoring.',
        priority: 'low'
      });
    }

    return recommendations;
  };

  const impact = getImpactLevel();
  const recommendations = getRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-green-500 bg-green-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-700';
      case 'high':
        return 'text-orange-700';
      case 'medium':
        return 'text-yellow-700';
      default:
        return 'text-green-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">AI-Powered Insights</h3>
          <p className="text-sm text-gray-600">Automated analysis and recommendations</p>
        </div>
      </div>

      {/* Impact Assessment */}
      <div className={`mb-6 p-5 rounded-xl border-2 ${
        impact.color === 'red' ? 'border-red-300 bg-red-50' :
        impact.color === 'yellow' ? 'border-yellow-300 bg-yellow-50' :
        'border-green-300 bg-green-50'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {impact.icon && <impact.icon className={`w-6 h-6 ${
            impact.color === 'red' ? 'text-red-600' :
            impact.color === 'yellow' ? 'text-yellow-600' :
            'text-green-600'
          }`} />}
          <h4 className={`font-bold text-lg ${
            impact.color === 'red' ? 'text-red-900' :
            impact.color === 'yellow' ? 'text-yellow-900' :
            'text-green-900'
          }`}>
            Impact Level: {impact.level}
          </h4>
        </div>
        <p className={`text-sm ${
          impact.color === 'red' ? 'text-red-700' :
          impact.color === 'yellow' ? 'text-yellow-700' :
          'text-green-700'
        }`}>
          Based on severity ({incident.severity}) and metrics analysis
        </p>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          <h4 className="font-bold text-gray-900">Recommendations</h4>
        </div>
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border-l-4 ${getPriorityColor(rec.priority)}`}
          >
            <h5 className={`font-semibold mb-1 ${getPriorityTextColor(rec.priority)}`}>
              {rec.title}
            </h5>
            <p className="text-sm text-gray-700">{rec.description}</p>
            <div className="mt-2">
              <span className={`text-xs font-bold uppercase ${getPriorityTextColor(rec.priority)}`}>
                {rec.priority} priority
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">
              {incident.logs.length}
            </div>
            <div className="text-xs text-blue-600 font-medium">Log Entries</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-2xl font-bold text-purple-700">
              {Object.keys(incident.metrics).length}
            </div>
            <div className="text-xs text-purple-600 font-medium">Metrics Tracked</div>
          </div>
        </div>
      </div>
    </div>
  );
}
