import React, { useState, useRef } from 'react';
import { DataPoint } from './PredictionDashboard';

interface DataInputProps {
  onDataUpdate: (data: DataPoint[]) => void;
}

export const DataInput: React.FC<DataInputProps> = ({ onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualData, setManualData] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n')
          .filter(row => row.trim())
          .map(row => row.split(',').map(value => value.trim()));

        // Find the first row that contains all numeric values
        const dataStartIndex = rows.findIndex(row =>
          row.every(value => !isNaN(parseFloat(value)) && isFinite(parseFloat(value)))
        );

        if (dataStartIndex === -1) {
          throw new Error('No numeric data found in CSV');
        }

        const processedData: DataPoint[] = rows.slice(dataStartIndex).map(row => {
          const values = row.map(value => parseFloat(value));
          if (values.some(isNaN)) {
            return null;
          }
          return values;
        }).filter((row): row is DataPoint => row !== null);

        onDataUpdate(processedData);
        setFileError(null);
      } catch (err) {
        setFileError('Error processing CSV: ' + (err instanceof Error ? err.message : String(err)));
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.onerror = () => {
      setFileError('Error reading file');
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setFileError('Please upload a CSV file');
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setCsvFile(file);
    setFileError(null);
    processCSVFile(file);
  };

  const handleManualDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualData(e.target.value);
  };

  const processManualData = () => {
    try {
      if (!manualData.trim()) {
        setManualError('Please enter data');
        return;
      }
      
      const rows = manualData.split('\n').filter(row => row.trim());
      const processedData: DataPoint[] = rows.map(row => {
        const values = row.split(',').map(value => parseFloat(value.trim()));
        if (values.some(isNaN)) {
          throw new Error('Data contains non-numeric values');
        }
        return values;
      });
      
      onDataUpdate(processedData);
      setManualError(null);
    } catch (err) {
      setManualError('Error parsing data: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Upload CSV
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`ml-8 py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Manual Entry
          </button>
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'upload' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">CSV files only</p>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>
            
            {csvFile && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <span>{csvFile.name}</span>
                </div>
                <button
                  onClick={() => {
                    setCsvFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                >
                  Clear
                </button>
              </div>
            )}
            
            {fileError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-md">
                {fileError}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="manualData" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter data (comma-separated values, one row per line)
              </label>
              <textarea
                id="manualData"
                rows={6}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="1.2, 3.4, 5.6, 7.8&#10;2.3, 4.5, 6.7, 8.9&#10;..."
                value={manualData}
                onChange={handleManualDataChange}
              ></textarea>
            </div>
            
            <button
              onClick={processManualData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium rounded-lg transition-colors duration-200"
            >
              Process Data
            </button>
            
            {manualError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-md">
                {manualError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};