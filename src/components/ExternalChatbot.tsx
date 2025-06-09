import React, { useEffect } from 'react';

export const ExternalChatbot: React.FC = () => {
  useEffect(() => {
    const scriptId = 'chat-data-bubble-script';

    // Avoid loading twice
    if (document.getElementById(scriptId)) {
      console.log('✅ External chatbot script already loaded.');
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://www.chat-data.com/embed.min.js?chatbotId=680eb1ac2b76777ce4d15b30';
    script.defer = true;
    script.onload = () => console.log('✅ Chatbot script loaded successfully.');
    script.onerror = () => console.error('❌ Failed to load chatbot script.');

    document.body.appendChild(script);
  }, []);

  return null;
};