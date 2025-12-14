'use client';

import { useStreamableText } from '@/hooks/useStreamableText';
import { Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StreamingAnalysisProps {
  stream: ReadableStream<Uint8Array> | null;
}

export function StreamingAnalysis({ stream }: StreamingAnalysisProps) {
  const [error, setError] = useState<string | null>(null);
  const { text, isStreaming } = useStreamableText(stream);

  useEffect(() => {
    if (!stream) {
      setError('No stream available');
    } else {
      setError(null);
    }
  }, [stream]);

  if (error && !text) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        {isStreaming && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        )}
      </div>
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap text-gray-700">
          {text || 'Starting analysis...'}
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

