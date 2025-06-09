import React, { useState } from 'react';
import { submitFeedback } from '../services/apiService';

export const FeedbackSection: React.FC = () => {
  const [feedbackType, setFeedbackType] = useState<'accurate' | 'inaccurate' | null>(null);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType) {
      setError('Please select whether the forecast was accurate or inaccurate');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await submitFeedback(feedbackType === 'accurate', comments);
      setSubmitted(true);
    } catch (err) {
      setError('Error submitting feedback: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Feedback</h2>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-green-700 dark:text-green-300">
          <p>Thank you for your feedback! We appreciate your input.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Feedback</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            How accurate was the forecast?
          </label>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setFeedbackType('accurate')}
              className={`px-4 py-2 rounded-md ${
                feedbackType === 'accurate'
                  ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 border-2 border-green-500'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
              }`}
            >
              Accurate
            </button>
            
            <button
              type="button"
              onClick={() => setFeedbackType('inaccurate')}
              className={`px-4 py-2 rounded-md ${
                feedbackType === 'inaccurate'
                  ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 border-2 border-red-500'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
              }`}
            >
              Inaccurate
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Additional Comments
          </label>
          <textarea
            id="comments"
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            placeholder="Please share any additional thoughts on the forecast results..."
          ></textarea>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg 
                    transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </section>
  );
};