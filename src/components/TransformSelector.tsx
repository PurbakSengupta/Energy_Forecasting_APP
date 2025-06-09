import React from 'react';
import { TransformType } from './PredictionDashboard';

interface TransformSelectorProps {
  selectedTransform: TransformType;
  onSelectTransform: (transform: TransformType) => void;
}

export const TransformSelector: React.FC<TransformSelectorProps> = ({ 
  selectedTransform, 
  onSelectTransform 
}) => {
  const transforms = [
    { id: 'DCT', name: 'DCT', description: 'Discrete Cosine Transform' },
    { id: 'DWT', name: 'DWT', description: 'Discrete Wavelet Transform' },
    { id: 'CS', name: 'CS', description: 'Compressed Sensing' },
    { id: 'NONE', name: 'None', description: 'No transformation' }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Select Transform
      </label>
      <div className="grid grid-cols-2 gap-2">
        {transforms.map((transform) => (
          <div 
            key={transform.id}
            onClick={() => onSelectTransform(transform.id as TransformType)}
            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200
              ${selectedTransform === transform.id 
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-sm' 
                : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'}`}
          >
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${
                selectedTransform === transform.id 
                  ? 'bg-teal-500 ring-1 ring-teal-300 dark:ring-teal-700' 
                  : 'border border-slate-300 dark:border-slate-600'
              }`} />
              <div>
                <h3 className="font-medium text-slate-800 dark:text-white text-sm">{transform.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{transform.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};