import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, XCircle, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';

const AgoraSetup = ({ isOpen, onClose, onConfigUpdate }) => {
  const [config, setConfig] = useState({
    appId: process.env.REACT_APP_AGORA_APP_ID || '',
    customerId: '',
    customerSecret: '',
    baseUrl: 'https://api.agora.io/api/conversational-ai-agent/v2'
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test backend configuration
      const response = await fetch('/api/agora/config');
      const data = await response.json();

      if (data.success && data.data.configured) {
        setTestResult({
          success: true,
          message: '✅ Agora configuration is valid and ready to use!'
        });
        toast.success('Agora connection test successful!');
      } else {
        setTestResult({
          success: false,
          message: '❌ Agora configuration is missing or invalid. Please check your credentials.'
        });
        toast.error('Agora connection test failed');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Connection test failed: ${error.message}`
      });
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = () => {
    // In a real app, you'd save this to backend or localStorage
    localStorage.setItem('agoraConfig', JSON.stringify(config));
    toast.success('Agora configuration saved!');
    onConfigUpdate(config);
    onClose();
  };

  const loadConfig = () => {
    const saved = localStorage.getItem('agoraConfig');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  };

  React.useEffect(() => {
    loadConfig();
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Agora Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App ID *
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={(e) => handleInputChange('appId', e.target.value)}
              placeholder="Your Agora App ID"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from your Agora Console
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID *
            </label>
            <input
              type="text"
              value={config.customerId}
              onChange={(e) => handleInputChange('customerId', e.target.value)}
              placeholder="Your Agora Customer ID"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Secret *
            </label>
            <input
              type="password"
              value={config.customerSecret}
              onChange={(e) => handleInputChange('customerSecret', e.target.value)}
              placeholder="Your Agora Customer Secret"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => handleInputChange('baseUrl', e.target.value)}
              placeholder="https://api.agora.io/api/conversational-ai-agent/v2"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-md ${
              testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">How to get Agora credentials:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Go to <a href="https://console.agora.io" target="_blank" rel="noopener noreferrer" className="underline">Agora Console</a></li>
              <li>2. Create a new project or select existing one</li>
              <li>3. Go to "Project Management" → "Keys"</li>
              <li>4. Copy your App ID, Customer ID, and Customer Secret</li>
              <li>5. Enable "Conversational AI" in your project settings</li>
            </ol>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={saveConfig}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save Configuration
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AgoraSetup; 