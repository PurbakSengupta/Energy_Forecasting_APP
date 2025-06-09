import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { PredictionDashboard } from './components/PredictionDashboard';
import { ExternalChatbot } from './components/ExternalChatbot';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Layout>
        {/* Main dashboard containing model selection, data input, and results */}
        <PredictionDashboard />
        {/* External chatbot script loader (invisible component) */}
        <ExternalChatbot />
      </Layout>
    </ThemeProvider>
  );
};

export default App;