'use client';

import { Incident } from '@/types/incident';
import { Sparkles, Play, FileText, Download, Share2 } from 'lucide-react';

interface QuickActionsProps {
  incident: Incident;
  onAnalyze: () => void;
  onTriggerKestra: () => void;
  analyzing?: boolean;
  triggeringKestra?: boolean;
}

export function QuickActions({
  incident,
  onAnalyze,
  onTriggerKestra,
  analyzing = false,
  triggeringKestra = false,
}: QuickActionsProps) {
  const handleExport = () => {
    const dataStr = JSON.stringify(incident, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident-${incident.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Incident ${incident.id}`,
          text: `${incident.title} - ${incident.service}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900">Quick Actions</h4>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {analyzing || triggeringKestra ? 'Processing...' : 'Ready'}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="group relative flex flex-col items-center gap-3 px-6 py-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Sparkles className={`w-8 h-8 ${analyzing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
          <span className="text-sm font-semibold">{analyzing ? 'Analyzing...' : 'AI Analyze'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={onTriggerKestra}
          disabled={triggeringKestra}
          className="group relative flex flex-col items-center gap-3 px-6 py-5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Play className={`w-8 h-8 ${triggeringKestra ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
          <span className="text-sm font-semibold">{triggeringKestra ? 'Triggering...' : 'Run Workflow'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={handleExport}
          className="group relative flex flex-col items-center gap-3 px-6 py-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Download className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold">Export JSON</span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={handleShare}
          className="group relative flex flex-col items-center gap-3 px-6 py-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Share2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold">Share Link</span>
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}

