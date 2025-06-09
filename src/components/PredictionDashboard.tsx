import React, { useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { TransformSelector } from './TransformSelector';
import { DataInput } from './DataInput';
import { ForecastResults } from './ForecastResults';
import { ExplanationPanel } from './ExplanationPanel';
import { FeedbackSection } from './FeedbackSection';
import { AIExplanationAssistant } from './AIExplanationAssistant';
import { runForecast, getBasicExplanation, getDetailedExplanation } from '../services/apiService';

export type ModelType = 'lstm' | 'cnn-lstm' | 'transformer';
export type TransformType = 'DCT' | 'DWT' | 'CS' | 'NONE';
export type DataPoint = number[];

export interface ForecastResult {
  forecast: number[];
  model: string;
  transform: string;
  status: string;
  baseline?: number[]; 
}

export const PredictionDashboard: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelType>('lstm');
  const [selectedTransform, setSelectedTransform] = useState<TransformType>('NONE');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ForecastResult | null>(null);
  const [basicExplanation, setBasicExplanation] = useState<string>('');
  const [detailedExplanation, setDetailedExplanation] = useState<string>('');
  const [shapValues, setShapValues] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showBasicExplanation, setShowBasicExplanation] = useState(false);
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const handleRunForecast = async () => {
    if (data.length === 0) {
      setError('Please provide data for forecasting');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const forecastResult = await runForecast(selectedModel, selectedTransform, data);
      setResults(forecastResult);
      setShowResults(true);
      
      const basicExp = await getBasicExplanation(selectedModel);
      setBasicExplanation(basicExp.explanation);
      setShowBasicExplanation(true);
      
      try {
        const detailedExp = await getDetailedExplanation(selectedModel, selectedTransform, data);
        const topContributors = Object.entries(detailedExp.shap_values || {})
          .filter(([_, v]) => typeof v === 'number')
          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
          .slice(0, 3);
      
        const summaryText = topContributors.map(
          ([k, v]) => `• ${k} contributed ${v >= 0 ? 'positively' : 'negatively'} with a SHAP value of ${v.toFixed(4)}.`
        ).join(' ');
      
        setDetailedExplanation(`Explanation of key contributors:\n${summaryText}`);
        setShapValues(detailedExp.shap_values);
        setShowDetailedExplanation(true);
        setShowAIAssistant(true);
      } catch (shapErr) {
        console.error('SHAP generation failed:', shapErr);
      }
    } catch (err) {
      setError('Error running forecast: ' + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setShowBasicExplanation(false);
    setShowDetailedExplanation(false);
    setShowFeedback(false);
    setShowAIAssistant(false);
    setResults(null);
    setBasicExplanation('');
    setDetailedExplanation('');
    setShapValues(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
          <TransformSelector selectedTransform={selectedTransform} onSelectTransform={setSelectedTransform} />
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Data Input</h2>
        <DataInput onDataUpdate={setData} />
        
        <div className="mt-6 flex space-x-4">
          <button
            onClick={handleRunForecast}
            disabled={loading || data.length === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg 
                      transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              'Run Forecast'
            )}
          </button>
          
          {results && (
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 
                        text-slate-700 dark:text-white font-medium rounded-lg transition-colors duration-200"
            >
              Reset
            </button>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
      </section>

      {results && showResults && (
        <>
          <ForecastResults results={results} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showBasicExplanation && (
              <ExplanationPanel 
                title="Basic Explanation" 
                explanation={basicExplanation} 
                model={selectedModel}
                transform={selectedTransform}
                onClose={() => setShowBasicExplanation(false)}
              />
            )}
            
            {showDetailedExplanation && (
              <ExplanationPanel 
                title="Detailed Explanation" 
                explanation={detailedExplanation}
                model={selectedModel}
                transform={selectedTransform}
                shapValues={shapValues}
                isDetailed = {true}
                onClose={() => setShowDetailedExplanation(false)}
              />
            )}
          </div>
          
          {showAIAssistant && (
            <AIExplanationAssistant 
              model={selectedModel} 
              shapValues={shapValues} 
              explanation={detailedExplanation} 
            />
          )}
          
          <FeedbackSection />
        </>
      )}
    </div>
  );
};