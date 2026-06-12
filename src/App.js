import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConversationInterface from './components/ConversationInterface';
import UserProfile from './components/UserProfile';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import { useConversation } from './hooks/useConversation';
import { useUser } from './hooks/useUser';
import clientConfigService from './services/clientConfigService';

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useUser();
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const { conversation, startConversation, sendMessage, upgradeToAgora, setConversation } = useConversation(ttsEnabled);

  useEffect(() => {
    // Load configuration using the client config service
    const loadConfig = async () => {
      try {
        const data = await clientConfigService.getConfig();
        setConfig(data);
        
        // Validate configuration silently (no error toast needed)
        const validation = clientConfigService.validateConfig();
        if (!validation.isValid) {
          console.warn('Configuration validation warnings:', validation.errors);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading config:', error);
        toast.error('Failed to load configuration');
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Conversational AI Demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <ConversationInterface 
                config={config}
                conversation={conversation}
                onStartConversation={startConversation}
                onSendMessage={sendMessage}
                onUpgradeToAgora={upgradeToAgora}
                user={user}
                onUserUpdate={updateUser}
                ttsEnabled={ttsEnabled}
                onTtsToggle={setTtsEnabled}
                setConversation={setConversation}
              />
            } 
          />
          <Route 
            path="/profile" 
            element={
              <UserProfile 
                user={user}
                onUserUpdate={updateUser}
              />
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <Analytics 
                conversation={conversation}
                user={user}
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <Settings 
                config={config}
                onBack={() => window.history.back()}
              />
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App; 