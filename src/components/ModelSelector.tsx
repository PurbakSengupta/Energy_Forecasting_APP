import React from 'react';
import { ModelType } from './PredictionDashboard';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onSelectModel: (model: ModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel }) => {
  const models = [
    { id: 'lstm', name: 'LSTM', description: 'Long Short-Term Memory network for sequence modeling' },
    { id: 'cnn-lstm', name: 'CNN-LSTM', description: 'Convolutional + LSTM hybrid for feature extraction and sequence modeling' },
    { id: 'transformer', name: 'Transformer', description: 'Attention-based architecture for modeling complex dependencies' }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Select Model
      </label>
      <div className="space-y-2">
        {models.map((model) => (
          <div 
            key={model.id}
            onClick={() => onSelectModel(model.id as ModelType)}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200
              ${selectedModel === model.id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' 
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
          >
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${
                selectedModel === model.id 
                  ? 'bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-700' 
                  : 'border border-slate-300 dark:border-slate-600'
              }`} />
              <div>
                <h3 className="font-medium text-slate-800 dark:text-white">{model.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{model.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};