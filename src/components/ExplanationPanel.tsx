import React, { useState } from 'react';
import { ModelType, TransformType } from './PredictionDashboard';
import { X } from 'lucide-react';

interface ExplanationPanelProps {
  title: string;
  explanation: string;
  model: ModelType;
  transform: TransformType;
  isDetailed?: boolean;
  shapValues?: any;
  onClose: () => void;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  title,
  explanation,
  model,
  transform,
  isDetailed = false,
  shapValues,
  onClose,
}) => {
  const [expanded, setExpanded] = useState(false);

  const renderFeatureImportance = () => {
    if (!shapValues || typeof shapValues !== 'object') return null;

    // Convert object entries to sortable array
    const entries = Object.entries(shapValues)
      .filter(([_, v]) => typeof v === 'number' && !isNaN(v));

    if (entries.length === 0) return null;

    const sorted = entries
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const maxAbs = Math.max(...sorted.map(d => Math.abs(d.value))) || 1;

    const displayItems = expanded ? sorted : sorted.slice(0, 5);

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Feature Importance</h4>
        <div className="space-y-2">
          {displayItems.map(({ key, value }) => {
            const percentage = (Math.abs(value) / maxAbs) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>{key}</span>
                  <span>{value.toFixed(4)}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${value >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          {isDetailed && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              {expanded ? 'Show Less' : 'Show More'}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert">
        <p className="text-slate-600 dark:text-slate-300">{explanation}</p>
        {isDetailed && renderFeatureImportance()}
      </div>

      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Model: <span className="font-medium">{model}</span> | Transform: <span className="font-medium">{transform}</span>
      </div>
    </div>
  );
};
