'use client';

import { Sparkles, CheckCircle, XCircle, Loader2, FileText, Wrench, BookOpen, Clock } from 'lucide-react';
import { ActionableRemediation } from './ActionableRemediation';

interface AIAnalysisResultsProps {
  kestraStatus: {
    executionId: string;
    status: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    aiResults?: {
      analysis: any;
      remediation: any;
      documentation: any;
    };
    url?: string;
    error?: string;
    details?: string;
  };
  incidentId: string;
}

export function AIAnalysisResults({ kestraStatus, incidentId }: AIAnalysisResultsProps) {
  const getStatusIcon = () => {
    switch (kestraStatus.status) {
      case 'SUCCESS':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'RUNNING':
      case 'CREATED':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="w-6 h-6 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (kestraStatus.status) {
      case 'SUCCESS':
        return 'from-green-500 to-emerald-600';
      case 'FAILED':
        return 'from-red-500 to-red-600';
      case 'RUNNING':
      case 'CREATED':
      case 'PENDING':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const parseAIContent = (content: any) => {
    if (!content) return null;

    try {
      // If it's already an object
      if (typeof content === 'object') {
        // Check if it's a Gemini API response
        if (content.candidates && content.candidates[0]?.content?.parts) {
          return content.candidates[0].content.parts[0].text;
        }
        return JSON.stringify(content, null, 2);
      }

      // If it's a string, try to parse it
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
            return parsed.candidates[0].content.parts[0].text;
          }
          return content;
        } catch {
          return content;
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing AI content:', error);
      return null;
    }
  };

  const analysisText = parseAIContent(kestraStatus?.aiResults?.analysis);
  const remediationText = parseAIContent(kestraStatus?.aiResults?.remediation);
  const documentationText = parseAIContent(kestraStatus?.aiResults?.documentation);

  return (
    <div className="space-y-6">
      {/* Execution Status Header */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getStatusColor()}`} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-bold text-gray-900">Kestra Workflow Execution</h3>
              <p className="text-sm text-gray-600">Execution ID: {kestraStatus.executionId}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getStatusColor()} text-white shadow-md`}>
              {kestraStatus.status}
            </span>
          </div>
        </div>

        {kestraStatus.duration && (
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Duration: {Math.round(kestraStatus.duration as any / 1000)}s</span>
            </div>
            {kestraStatus.url && (
              <a
                href={kestraStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                View in Kestra →
              </a>
            )}
          </div>
        )}

        {kestraStatus.status === 'RUNNING' && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-blue-800 font-medium">AI agents are analyzing the incident... This may take up to 2 minutes.</p>
            </div>
          </div>
        )}

        {kestraStatus.status === 'PENDING' && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium mb-2">{kestraStatus.error || 'Execution in progress'}</p>
                {kestraStatus.details && (
                  <p className="text-blue-700 text-sm">{kestraStatus.details}</p>
                )}
                {kestraStatus.url && (
                  <a
                    href={kestraStatus.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium underline mt-2 inline-block"
                  >
                    View execution in Kestra UI →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Results */}
      {kestraStatus.status === 'SUCCESS' && (
        <div className="space-y-6">
          {/* Analysis Section */}
          {analysisText && (
            <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-purple-600" />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Analysis</h3>
                  <p className="text-sm text-gray-600">Root cause and impact assessment</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 rounded-lg p-6">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {analysisText}
                </pre>
              </div>
            </div>
          )}

          {/* Remediation Section */}
          {remediationText && (
            <div className="bg-white rounded-xl shadow-lg border-2 border-orange-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-orange-600" />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Remediation Plan</h3>
                  <p className="text-sm text-gray-600">Recommended actions and fixes</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-100 rounded-lg p-6 mb-4">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {remediationText}
                </pre>
              </div>

              {/* Actionable Remediation */}
              <ActionableRemediation remediationText={remediationText} incidentId={incidentId} />
            </div>
          )}

          {/* Documentation Section */}
          {documentationText && (
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-blue-600" />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Documentation</h3>
                  <p className="text-sm text-gray-600">Post-mortem and knowledge base</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 rounded-lg p-6">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {documentationText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {(kestraStatus.status === 'FAILED' || kestraStatus.status === 'UNKNOWN') && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-red-900">
                {kestraStatus.status === 'FAILED' ? 'Workflow Execution Failed' : 'Unable to Fetch Execution Status'}
              </h3>
              <p className="text-sm text-red-600">
                {kestraStatus.status === 'FAILED'
                  ? 'The AI analysis could not be completed'
                  : 'Could not retrieve execution status from Kestra'}
              </p>
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-100 rounded-lg p-4">
            {kestraStatus.error && (
              <p className="text-red-800 font-medium mb-2">{kestraStatus.error}</p>
            )}
            {kestraStatus.details && (
              <p className="text-red-700 text-sm mb-2">Details: {kestraStatus.details}</p>
            )}
            <p className="text-red-800">
              {kestraStatus.status === 'FAILED'
                ? 'Please check the Kestra logs for more details or try triggering the workflow again.'
                : 'Please ensure Kestra is running and accessible at http://localhost:8080'}
            </p>
            {kestraStatus.url && (
              <a
                href={kestraStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 font-medium underline mt-2 inline-block"
              >
                View details in Kestra →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
