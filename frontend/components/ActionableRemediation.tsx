'use client';

import { useState } from 'react';
import { Play, Check, AlertTriangle, Terminal, RefreshCw, Scale, RotateCcw } from 'lucide-react';

interface RemediationAction {
  id: string;
  title: string;
  command: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
}

interface ActionableRemediationProps {
  remediationText: string;
  incidentId: string;
}

export function ActionableRemediation({ remediationText, incidentId }: ActionableRemediationProps) {
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [actionResults, setActionResults] = useState<Map<string, { success: boolean; message: string }>>(new Map());

  // Parse remediation text to extract actionable items
  const parseActions = (text: string): RemediationAction[] => {
    const actions: RemediationAction[] = [];

    // Look for common patterns in remediation text
    const patterns = [
      {
        regex: /restart.*service/i,
        title: 'Restart Service',
        command: 'kubectl rollout restart deployment/payment-api',
        risk: 'medium' as const,
        icon: RefreshCw
      },
      {
        regex: /scale.*pods?|increase.*capacity/i,
        title: 'Scale Up Pods',
        command: 'kubectl scale deployment/payment-api --replicas=5',
        risk: 'low' as const,
        icon: Scale
      },
      {
        regex: /rollback|revert.*deployment/i,
        title: 'Rollback Deployment',
        command: 'kubectl rollout undo deployment/payment-api',
        risk: 'high' as const,
        icon: RotateCcw
      },
      {
        regex: /clear.*cache|flush.*cache/i,
        title: 'Clear Cache',
        command: 'redis-cli FLUSHALL',
        risk: 'medium' as const,
        icon: Terminal
      },
      {
        regex: /increase.*connection.*pool/i,
        title: 'Increase Connection Pool',
        command: 'kubectl set env deployment/payment-api DB_POOL_SIZE=50',
        risk: 'low' as const,
        icon: Terminal
      }
    ];

    patterns.forEach((pattern, index) => {
      if (pattern.regex.test(text)) {
        actions.push({
          id: `action-${index}`,
          title: pattern.title,
          command: pattern.command,
          risk: pattern.risk,
          description: `Execute: ${pattern.command}`
        });
      }
    });

    return actions;
  };

  const actions = parseActions(remediationText);

  const executeAction = async (action: RemediationAction) => {
    setExecutingActions(prev => new Set(prev).add(action.id));

    try {
      // Call the API to execute the action
      const response = await fetch('/api/remediation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          action: action.command,
          risk: action.risk,
          dryRun: action.risk === 'high' // High risk actions run in dry-run mode
        })
      });

      const result = await response.json();

      setActionResults(prev => new Map(prev).set(action.id, {
        success: response.ok,
        message: result.message || 'Action executed successfully'
      }));

      if (response.ok) {
        setCompletedActions(prev => new Set(prev).add(action.id));
      }
    } catch (error) {
      setActionResults(prev => new Map(prev).set(action.id, {
        success: false,
        message: 'Failed to execute action'
      }));
    } finally {
      setExecutingActions(prev => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (actions.length === 0) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          No automated actions detected. Review the recommendations above for manual remediation steps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Terminal className="w-5 h-5 text-gray-700" />
        <h4 className="text-lg font-bold text-gray-900">Executable Actions</h4>
        <span className="text-sm text-gray-600">({actions.length} actions available)</span>
      </div>

      {actions.map((action) => {
        const isExecuting = executingActions.has(action.id);
        const isCompleted = completedActions.has(action.id);
        const result = actionResults.get(action.id);

        return (
          <div
            key={action.id}
            className={`border-2 rounded-lg p-4 transition-all ${
              isCompleted
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h5 className="font-bold text-gray-900">{action.title}</h5>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(action.risk)}`}>
                    {getRiskIcon(action.risk)}
                    <span className="ml-1">{action.risk.toUpperCase()} RISK</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{action.description}</p>
                <div className="bg-gray-900 rounded p-2 font-mono text-xs text-green-400">
                  $ {action.command}
                </div>

                {action.risk === 'high' && (
                  <div className="mt-2 text-xs text-red-600 font-medium">
                    ⚠️ This action will run in DRY-RUN mode. Manual approval required for execution.
                  </div>
                )}

                {result && (
                  <div className={`mt-3 p-3 rounded-lg border-2 ${
                    result.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{result.message}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => executeAction(action)}
                disabled={isExecuting || isCompleted}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md ${
                  isCompleted
                    ? 'bg-green-600 text-white cursor-not-allowed'
                    : isExecuting
                    ? 'bg-blue-500 text-white cursor-wait'
                    : action.risk === 'high'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                {isCompleted ? (
                  <>
                    <Check className="w-4 h-4" />
                    Completed
                  </>
                ) : isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Safety Guidelines:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>LOW RISK actions execute immediately</li>
              <li>MEDIUM RISK actions require confirmation</li>
              <li>HIGH RISK actions run in DRY-RUN mode and require manual approval</li>
              <li>All actions are logged and auditable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
