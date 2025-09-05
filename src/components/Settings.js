import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RefreshCw, TestTube, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = ({ config, onBack }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    microsoft: false,
    elevenlabs: false,
    cartesia: false,
    openai: false,
    hume: false,
    agora: false,
    deepgram: false
  });

  useEffect(() => {
    if (config) {
      setSettings({
        // Agora Settings
        AGORA_APP_ID: config.clientConfig?.REACT_APP_AGORA_APP_ID || '',
        AGORA_CHANNEL: config.clientConfig?.REACT_APP_AGORA_CHANNEL || 'onboarding_channel',
        
        // Server-side Agora Configuration (for reference - these are server-only)
        AGORA_CUSTOMER_ID: '', // Server-only, not editable in client
        AGORA_CUSTOMER_SECRET: '', // Server-only, not editable in client
        AGORA_API_BASE_URL: 'https://api.agora.io/api/conversational-ai-agent/v2',
        
        // Feature Flags
        ENABLE_RTM: config.clientConfig?.REACT_APP_ENABLE_RTM || true,
        ENABLE_RTC_VIDEO: config.clientConfig?.REACT_APP_ENABLE_RTC_VIDEO || true,
        ENABLE_RTC_AUDIO: config.clientConfig?.REACT_APP_ENABLE_RTC_AUDIO || true,
        AVATAR_ENABLED: config.clientConfig?.REACT_APP_AVATAR_ENABLED || false,
        AGORA_FALLBACK_ENABLED: config.clientConfig?.REACT_APP_AGORA_FALLBACK_ENABLED || true,
        
        // Additional Feature Flags
        ENABLE_VOICE_INPUT: config.enableVoiceInput !== undefined ? config.enableVoiceInput : true,
        ENABLE_TEXT_INPUT: config.enableTextInput !== undefined ? config.enableTextInput : true,
        ENABLE_AVATAR_DISPLAY: config.enableAvatarDisplay !== undefined ? config.enableAvatarDisplay : false,
        ENABLE_CONVERSATION_LOGGING: false,
        ENABLE_USER_ANALYTICS: false,
        ENABLE_PERFORMANCE_METRICS: false,
        ENABLE_AI_AVATAR: false,
        
        // TTS Settings
        TTS_VENDOR: config.clientConfig?.REACT_APP_TTS_VENDOR || 'microsoft',
        
        // Microsoft TTS
        MICROSOFT_TTS_API_KEY: config.microsoftTTS?.key || '',
        MICROSOFT_TTS_REGION: config.microsoftTTS?.region || 'eastus',
        MICROSOFT_TTS_VOICE: config.microsoftTTS?.voice || 'en-US-AvaMultilingualNeural',
        MICROSOFT_TTS_RATE: config.microsoftTTS?.rate || '1.0',
        MICROSOFT_TTS_VOLUME: config.microsoftTTS?.volume || '1.0',
        
        // ElevenLabs TTS
        ELEVENLABS_TTS_API_KEY: config.elevenlabsTTS?.key || '',
        ELEVENLABS_TTS_VOICE_ID: config.elevenlabsTTS?.voiceId || '',
        ELEVENLABS_TTS_MODEL: config.elevenlabsTTS?.model || 'eleven_monolingual_v1',
        ELEVENLABS_TTS_STABILITY: config.elevenlabsTTS?.stability || '0.5',
        ELEVENLABS_TTS_SIMILARITY_BOOST: config.elevenlabsTTS?.similarityBoost || '0.75',
        
        // Cartesia TTS
        CARTESIA_TTS_API_KEY: config.cartesiaTTS?.key || '',
        CARTESIA_TTS_VOICE_ID: config.cartesiaTTS?.voiceId || '',
        CARTESIA_TTS_MODEL: config.cartesiaTTS?.model || 'sonic-2',
        
        // OpenAI TTS
        OPENAI_TTS_VOICE: config.openaiTTS?.voice || 'alloy',
        OPENAI_TTS_SPEED: config.openaiTTS?.speed || '1.0',
        
        // Hume AI TTS
        HUME_TTS_API_KEY: config.humeTTS?.key || '',
        HUME_TTS_VOICE_ID: config.humeTTS?.voiceId || '',
        HUME_TTS_SPEED: config.humeTTS?.speed || '1.0',
        
        // ASR Settings
        ASR_VENDOR: config.clientConfig?.REACT_APP_ASR_VENDOR || 'agora',
        
        // Agora ASR
        AGORA_ASR_LANGUAGE: config.agoraASR?.language || 'en-US',
        AGORA_ASR_MODEL: config.agoraASR?.model || 'base',
        
        // Microsoft ASR
        MICROSOFT_ASR_API_KEY: config.microsoftASR?.key || '',
        MICROSOFT_ASR_REGION: config.microsoftASR?.region || 'eastus',
        MICROSOFT_ASR_LANGUAGE: config.microsoftASR?.language || 'en-US',
        
        // Deepgram ASR
        DEEPGRAM_ASR_API_KEY: config.deepgramASR?.key || '',
        DEEPGRAM_ASR_MODEL: config.deepgramASR?.model || 'nova-2',
        DEEPGRAM_ASR_LANGUAGE: config.deepgramASR?.language || 'en-US',
        
        // Bot Settings
        BOT_NAME: config.botName || 'Welcome Bot',
        BOT_PERSONALITY: config.botPersonality || 'friendly and helpful',
        
        // API URLs and Endpoints
        OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
        OPENAI_API_KEY: '', // Server-only, not editable in client
        OPENAI_MODEL: 'gpt-4o-mini',
        OPENAI_MAX_TOKENS: '1000',
        OPENAI_TEMPERATURE: '0.7',
        
        // Avatar Configuration
        AVATAR_VENDOR: 'agora',
        AVATAR_API_KEY: '',
        AVATAR_ID: '',
        AVATAR_RTC_UID: '8888',
        AVATAR_IMAGE_URL: config.avatarImageUrl || '',
        
        // Onboarding Configuration
        ONBOARDING_FORM_FIELDS: (config.onboardingFields || ['name', 'birthday', 'interests', 'bio', 'experienceLevel']).join(','),
        REQUIRED_FIELDS: (config.requiredFields || ['name']).join(','),
        OPTIONAL_FIELDS: (config.optionalFields || ['birthday', 'interests', 'bio', 'experienceLevel', 'location', 'phone', 'email', 'website', 'socialHandles']).join(','),
        
        // Platform Features
        ENABLE_PLATFORM_OVERVIEW: true,
        ENABLE_ONBOARDING_FORM: true,
        ENABLE_ADDITIONAL_CONVERSATION: true,
        COLLECT_USER_PREFERENCES: true,
        COLLECT_SKILL_ASSESSMENT: true,
        COLLECT_CONVERSATION_ANALYTICS: false,
        
        // Development Settings
        NODE_ENV: 'development',
        PORT: '3000'
      });
    }
  }, [config]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save settings to localStorage for client-side overrides
      localStorage.setItem('agoraSettings', JSON.stringify(settings));
      
      // Update window variables for immediate use
      Object.entries(settings).forEach(([key, value]) => {
        if (key.startsWith('REACT_APP_') || key.startsWith('AGORA_') || key.startsWith('ENABLE_') || key.startsWith('AVATAR_') || key.startsWith('TTS_') || key.startsWith('ASR_') || key.startsWith('BOT_') || key.startsWith('MICROSOFT_') || key.startsWith('ELEVENLABS_') || key.startsWith('CARTESIA_') || key.startsWith('OPENAI_') || key.startsWith('HUME_') || key.startsWith('DEEPGRAM_') || key.startsWith('COLLECT_') || key.startsWith('ONBOARDING_') || key.startsWith('REQUIRED_') || key.startsWith('OPTIONAL_') || key === 'NODE_ENV' || key === 'PORT') {
          window[key] = value;
        }
      });
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (config) {
      // Reset to the same comprehensive settings as in useEffect
      setSettings({
        // Agora Settings
        AGORA_APP_ID: config.clientConfig?.REACT_APP_AGORA_APP_ID || '',
        AGORA_CHANNEL: config.clientConfig?.REACT_APP_AGORA_CHANNEL || 'onboarding_channel',
        
        // Server-side Agora Configuration (for reference - these are server-only)
        AGORA_CUSTOMER_ID: '',
        AGORA_CUSTOMER_SECRET: '',
        AGORA_API_BASE_URL: 'https://api.agora.io/api/conversational-ai-agent/v2',
        
        // Feature Flags
        ENABLE_RTM: config.clientConfig?.REACT_APP_ENABLE_RTM || true,
        ENABLE_RTC_VIDEO: config.clientConfig?.REACT_APP_ENABLE_RTC_VIDEO || true,
        ENABLE_RTC_AUDIO: config.clientConfig?.REACT_APP_ENABLE_RTC_AUDIO || true,
        AVATAR_ENABLED: config.clientConfig?.REACT_APP_AVATAR_ENABLED || false,
        AGORA_FALLBACK_ENABLED: config.clientConfig?.REACT_APP_AGORA_FALLBACK_ENABLED || true,
        
        // Additional Feature Flags
        ENABLE_VOICE_INPUT: config.enableVoiceInput !== undefined ? config.enableVoiceInput : true,
        ENABLE_TEXT_INPUT: config.enableTextInput !== undefined ? config.enableTextInput : true,
        ENABLE_AVATAR_DISPLAY: config.enableAvatarDisplay !== undefined ? config.enableAvatarDisplay : false,
        ENABLE_CONVERSATION_LOGGING: false,
        ENABLE_USER_ANALYTICS: false,
        ENABLE_PERFORMANCE_METRICS: false,
        ENABLE_AI_AVATAR: false,
        
        // TTS Settings
        TTS_VENDOR: config.clientConfig?.REACT_APP_TTS_VENDOR || 'microsoft',
        
        // Microsoft TTS
        MICROSOFT_TTS_API_KEY: config.microsoftTTS?.key || '',
        MICROSOFT_TTS_REGION: config.microsoftTTS?.region || 'eastus',
        MICROSOFT_TTS_VOICE: config.microsoftTTS?.voice || 'en-US-AvaMultilingualNeural',
        MICROSOFT_TTS_RATE: config.microsoftTTS?.rate || '1.0',
        MICROSOFT_TTS_VOLUME: config.microsoftTTS?.volume || '1.0',
        
        // ElevenLabs TTS
        ELEVENLABS_TTS_API_KEY: config.elevenlabsTTS?.key || '',
        ELEVENLABS_TTS_VOICE_ID: config.elevenlabsTTS?.voiceId || '',
        ELEVENLABS_TTS_MODEL: config.elevenlabsTTS?.model || 'eleven_monolingual_v1',
        ELEVENLABS_TTS_STABILITY: config.elevenlabsTTS?.stability || '0.5',
        ELEVENLABS_TTS_SIMILARITY_BOOST: config.elevenlabsTTS?.similarityBoost || '0.75',
        
        // Cartesia TTS
        CARTESIA_TTS_API_KEY: config.cartesiaTTS?.key || '',
        CARTESIA_TTS_VOICE_ID: config.cartesiaTTS?.voiceId || '',
        CARTESIA_TTS_MODEL: config.cartesiaTTS?.model || 'sonic-2',
        
        // OpenAI TTS
        OPENAI_TTS_VOICE: config.openaiTTS?.voice || 'alloy',
        OPENAI_TTS_SPEED: config.openaiTTS?.speed || '1.0',
        
        // Hume AI TTS
        HUME_TTS_API_KEY: config.humeTTS?.key || '',
        HUME_TTS_VOICE_ID: config.humeTTS?.voiceId || '',
        HUME_TTS_SPEED: config.humeTTS?.speed || '1.0',
        
        // ASR Settings
        ASR_VENDOR: config.clientConfig?.REACT_APP_ASR_VENDOR || 'agora',
        
        // Agora ASR
        AGORA_ASR_LANGUAGE: config.agoraASR?.language || 'en-US',
        AGORA_ASR_MODEL: config.agoraASR?.model || 'base',
        
        // Microsoft ASR
        MICROSOFT_ASR_API_KEY: config.microsoftASR?.key || '',
        MICROSOFT_ASR_REGION: config.microsoftASR?.region || 'eastus',
        MICROSOFT_ASR_LANGUAGE: config.microsoftASR?.language || 'en-US',
        
        // Deepgram ASR
        DEEPGRAM_ASR_API_KEY: config.deepgramASR?.key || '',
        DEEPGRAM_ASR_MODEL: config.deepgramASR?.model || 'nova-2',
        DEEPGRAM_ASR_LANGUAGE: config.deepgramASR?.language || 'en-US',
        
        // Bot Settings
        BOT_NAME: config.botName || 'Welcome Bot',
        BOT_PERSONALITY: config.botPersonality || 'friendly and helpful',
        
        // API URLs and Endpoints
        OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
        OPENAI_API_KEY: '',
        OPENAI_MODEL: 'gpt-4o-mini',
        OPENAI_MAX_TOKENS: '1000',
        OPENAI_TEMPERATURE: '0.7',
        
        // Avatar Configuration
        AVATAR_VENDOR: 'agora',
        AVATAR_API_KEY: '',
        AVATAR_ID: '',
        AVATAR_RTC_UID: '8888',
        AVATAR_IMAGE_URL: config.avatarImageUrl || '',
        
        // Onboarding Configuration
        ONBOARDING_FORM_FIELDS: (config.onboardingFields || ['name', 'birthday', 'interests', 'bio', 'experienceLevel']).join(','),
        REQUIRED_FIELDS: (config.requiredFields || ['name']).join(','),
        OPTIONAL_FIELDS: (config.optionalFields || ['birthday', 'interests', 'bio', 'experienceLevel', 'location', 'phone', 'email', 'website', 'socialHandles']).join(','),
        
        // Platform Features
        ENABLE_PLATFORM_OVERVIEW: true,
        ENABLE_ONBOARDING_FORM: true,
        ENABLE_ADDITIONAL_CONVERSATION: true,
        COLLECT_USER_PREFERENCES: true,
        COLLECT_SKILL_ASSESSMENT: true,
        COLLECT_CONVERSATION_ANALYTICS: false,
        
        // Development Settings
        NODE_ENV: 'development',
        PORT: '3000'
      });
      toast.success('Settings reset to defaults');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        toast.success('Connection test successful!');
        console.log('Current configuration:', data);
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderTTSVendorSettings = () => {
    const vendor = settings.TTS_VENDOR || 'microsoft';
    
    switch (vendor) {
      case 'microsoft':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.MICROSOFT_TTS_API_KEY || ''}
                onChange={(e) => handleInputChange('MICROSOFT_TTS_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Microsoft TTS API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={settings.MICROSOFT_TTS_REGION || ''}
                onChange={(e) => handleInputChange('MICROSOFT_TTS_REGION', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., eastus, westus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice
              </label>
              <input
                type="text"
                value={settings.MICROSOFT_TTS_VOICE || ''}
                onChange={(e) => handleInputChange('MICROSOFT_TTS_VOICE', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., en-US-AvaMultilingualNeural"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.MICROSOFT_TTS_RATE || ''}
                  onChange={(e) => handleInputChange('MICROSOFT_TTS_RATE', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.MICROSOFT_TTS_VOLUME || ''}
                  onChange={(e) => handleInputChange('MICROSOFT_TTS_VOLUME', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0"
                />
              </div>
            </div>
          </div>
        );
      
      case 'elevenlabs':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.ELEVENLABS_TTS_API_KEY || ''}
                onChange={(e) => handleInputChange('ELEVENLABS_TTS_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ElevenLabs API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice ID
              </label>
              <input
                type="text"
                value={settings.ELEVENLABS_TTS_VOICE_ID || ''}
                onChange={(e) => handleInputChange('ELEVENLABS_TTS_VOICE_ID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Voice ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={settings.ELEVENLABS_TTS_MODEL || 'eleven_monolingual_v1'}
                onChange={(e) => handleInputChange('ELEVENLABS_TTS_MODEL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
                <option value="eleven_multilingual_v1">Eleven Multilingual v1</option>
                <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stability
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.ELEVENLABS_TTS_STABILITY || ''}
                  onChange={(e) => handleInputChange('ELEVENLABS_TTS_STABILITY', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Similarity Boost
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.ELEVENLABS_TTS_SIMILARITY_BOOST || ''}
                  onChange={(e) => handleInputChange('ELEVENLABS_TTS_SIMILARITY_BOOST', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.75"
                />
              </div>
            </div>
          </div>
        );
      
      case 'cartesia':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.CARTESIA_TTS_API_KEY || ''}
                onChange={(e) => handleInputChange('CARTESIA_TTS_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Cartesia API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice ID
              </label>
              <input
                type="text"
                value={settings.CARTESIA_TTS_VOICE_ID || ''}
                onChange={(e) => handleInputChange('CARTESIA_TTS_VOICE_ID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Voice ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={settings.CARTESIA_TTS_MODEL || 'sonic-2'}
                onChange={(e) => handleInputChange('CARTESIA_TTS_MODEL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sonic-2">Sonic 2</option>
                <option value="sonic-1">Sonic 1</option>
              </select>
            </div>
          </div>
        );
      
      case 'openai':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice
              </label>
              <select
                value={settings.OPENAI_TTS_VOICE || 'alloy'}
                onChange={(e) => handleInputChange('OPENAI_TTS_VOICE', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speed
              </label>
              <input
                type="number"
                step="0.1"
                min="0.25"
                max="4.0"
                value={settings.OPENAI_TTS_SPEED || ''}
                onChange={(e) => handleInputChange('OPENAI_TTS_SPEED', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.0"
              />
            </div>
          </div>
        );
      
      case 'hume':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.HUME_TTS_API_KEY || ''}
                onChange={(e) => handleInputChange('HUME_TTS_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Hume AI API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice ID
              </label>
              <input
                type="text"
                value={settings.HUME_TTS_VOICE_ID || ''}
                onChange={(e) => handleInputChange('HUME_TTS_VOICE_ID', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Voice ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speed
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={settings.HUME_TTS_SPEED || ''}
                onChange={(e) => handleInputChange('HUME_TTS_SPEED', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.0"
              />
            </div>
          </div>
        );
      
      default:
        return <div className="text-gray-500">Select a TTS vendor to configure</div>;
    }
  };

  const renderASRVendorSettings = () => {
    const vendor = settings.ASR_VENDOR || 'agora';
    
    switch (vendor) {
      case 'agora':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                value={settings.AGORA_ASR_LANGUAGE || ''}
                onChange={(e) => handleInputChange('AGORA_ASR_LANGUAGE', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., en-US"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={settings.AGORA_ASR_MODEL || 'base'}
                onChange={(e) => handleInputChange('AGORA_ASR_MODEL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="base">Base</option>
                <option value="enhanced">Enhanced</option>
              </select>
            </div>
          </div>
        );
      
      case 'microsoft':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.MICROSOFT_ASR_API_KEY || ''}
                onChange={(e) => handleInputChange('MICROSOFT_ASR_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Microsoft ASR API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={settings.MICROSOFT_ASR_REGION || ''}
                onChange={(e) => handleInputChange('MICROSOFT_ASR_REGION', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., eastus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                value={settings.MICROSOFT_ASR_LANGUAGE || ''}
                onChange={(e) => handleInputChange('MICROSOFT_ASR_LANGUAGE', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., en-US"
              />
            </div>
          </div>
        );
      
      case 'deepgram':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.DEEPGRAM_ASR_API_KEY || ''}
                onChange={(e) => handleInputChange('DEEPGRAM_ASR_API_KEY', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Deepgram API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={settings.DEEPGRAM_ASR_MODEL || 'nova-2'}
                onChange={(e) => handleInputChange('DEEPGRAM_ASR_MODEL', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nova-2">Nova 2</option>
                <option value="nova">Nova</option>
                <option value="enhanced">Enhanced</option>
                <option value="base">Base</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                value={settings.DEEPGRAM_ASR_LANGUAGE || ''}
                onChange={(e) => handleInputChange('DEEPGRAM_ASR_LANGUAGE', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., en-US"
              />
            </div>
          </div>
        );
      
      default:
        return <div className="text-gray-500">Select an ASR vendor to configure</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="min-h-screen bg-gray-50 p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <TestTube className="w-4 h-4" />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Agora Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agora Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App ID
                </label>
                <input
                  type="password"
                  value={settings.AGORA_APP_ID || ''}
                  onChange={(e) => handleInputChange('AGORA_APP_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Agora App ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={settings.AGORA_CHANNEL || ''}
                  onChange={(e) => handleInputChange('AGORA_CHANNEL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter channel name"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Flags</h2>
            <div className="space-y-4">
              {[
                { key: 'ENABLE_RTM', label: 'Enable RTM Messaging' },
                { key: 'ENABLE_RTC_VIDEO', label: 'Enable RTC Video' },
                { key: 'ENABLE_RTC_AUDIO', label: 'Enable RTC Audio' },
                { key: 'AVATAR_ENABLED', label: 'Enable Avatar' },
                { key: 'AGORA_FALLBACK_ENABLED', label: 'Enable Agora Fallback' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type="checkbox"
                    checked={settings[key] || false}
                    onChange={(e) => handleInputChange(key, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* TTS Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">TTS Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TTS Vendor
                </label>
                <select
                  value={settings.TTS_VENDOR || 'microsoft'}
                  onChange={(e) => handleInputChange('TTS_VENDOR', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="microsoft">Microsoft</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="cartesia">Cartesia</option>
                  <option value="openai">OpenAI</option>
                  <option value="hume">Hume AI</option>
                </select>
              </div>
              
              {/* Vendor-specific settings */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {settings.TTS_VENDOR?.charAt(0).toUpperCase() + settings.TTS_VENDOR?.slice(1)} Settings
                </h3>
                {renderTTSVendorSettings()}
              </div>
            </div>
          </div>

          {/* ASR Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ASR Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ASR Vendor
                </label>
                <select
                  value={settings.ASR_VENDOR || 'agora'}
                  onChange={(e) => handleInputChange('ASR_VENDOR', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agora">Agora</option>
                  <option value="microsoft">Microsoft</option>
                  <option value="deepgram">Deepgram</option>
                </select>
              </div>
              
              {/* Vendor-specific settings */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {settings.ASR_VENDOR?.charAt(0).toUpperCase() + settings.ASR_VENDOR?.slice(1)} Settings
                </h3>
                {renderASRVendorSettings()}
              </div>
            </div>
          </div>

          {/* Bot Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bot Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={settings.BOT_NAME || ''}
                  onChange={(e) => handleInputChange('BOT_NAME', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter bot name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Personality
                </label>
                <textarea
                  value={settings.BOT_PERSONALITY || ''}
                  onChange={(e) => handleInputChange('BOT_PERSONALITY', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe bot personality"
                />
              </div>
            </div>
          </div>

          {/* Server Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Server Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agora Customer ID
                </label>
                <input
                  type="password"
                  value={settings.AGORA_CUSTOMER_ID || ''}
                  onChange={(e) => handleInputChange('AGORA_CUSTOMER_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Agora Customer ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agora Customer Secret
                </label>
                <input
                  type="password"
                  value={settings.AGORA_CUSTOMER_SECRET || ''}
                  onChange={(e) => handleInputChange('AGORA_CUSTOMER_SECRET', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Agora Customer Secret"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agora API Base URL
                </label>
                <input
                  type="text"
                  value={settings.AGORA_API_BASE_URL || ''}
                  onChange={(e) => handleInputChange('AGORA_API_BASE_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.agora.io/api/conversational-ai-agent/v2"
                />
              </div>
            </div>
          </div>

          {/* OpenAI Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">OpenAI Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.OPENAI_API_KEY || ''}
                  onChange={(e) => handleInputChange('OPENAI_API_KEY', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter OpenAI API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API URL
                </label>
                <input
                  type="text"
                  value={settings.OPENAI_API_URL || ''}
                  onChange={(e) => handleInputChange('OPENAI_API_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={settings.OPENAI_MODEL || 'gpt-4o-mini'}
                  onChange={(e) => handleInputChange('OPENAI_MODEL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={settings.OPENAI_MAX_TOKENS || ''}
                    onChange={(e) => handleInputChange('OPENAI_MAX_TOKENS', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={settings.OPENAI_TEMPERATURE || ''}
                    onChange={(e) => handleInputChange('OPENAI_TEMPERATURE', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.7"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Avatar Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Avatar Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar Vendor
                </label>
                <select
                  value={settings.AVATAR_VENDOR || 'agora'}
                  onChange={(e) => handleInputChange('AVATAR_VENDOR', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agora">Agora</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar API Key
                </label>
                <input
                  type="password"
                  value={settings.AVATAR_API_KEY || ''}
                  onChange={(e) => handleInputChange('AVATAR_API_KEY', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Avatar API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar ID
                </label>
                <input
                  type="text"
                  value={settings.AVATAR_ID || ''}
                  onChange={(e) => handleInputChange('AVATAR_ID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Avatar ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar RTC UID
                </label>
                <input
                  type="text"
                  value={settings.AVATAR_RTC_UID || ''}
                  onChange={(e) => handleInputChange('AVATAR_RTC_UID', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8888"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={settings.AVATAR_IMAGE_URL || ''}
                  onChange={(e) => handleInputChange('AVATAR_IMAGE_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/avatar.png"
                />
              </div>
            </div>
          </div>

          {/* Onboarding Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.ONBOARDING_FORM_FIELDS || ''}
                  onChange={(e) => handleInputChange('ONBOARDING_FORM_FIELDS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name,birthday,interests,bio,experienceLevel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.REQUIRED_FIELDS || ''}
                  onChange={(e) => handleInputChange('REQUIRED_FIELDS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.OPTIONAL_FIELDS || ''}
                  onChange={(e) => handleInputChange('OPTIONAL_FIELDS', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="birthday,interests,bio,experienceLevel,location,phone,email"
                />
              </div>
            </div>
          </div>

          {/* Platform Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Features</h2>
            <div className="space-y-4">
              {[
                { key: 'ENABLE_PLATFORM_OVERVIEW', label: 'Enable Platform Overview' },
                { key: 'ENABLE_ONBOARDING_FORM', label: 'Enable Onboarding Form' },
                { key: 'ENABLE_ADDITIONAL_CONVERSATION', label: 'Enable Additional Conversation' },
                { key: 'COLLECT_USER_PREFERENCES', label: 'Collect User Preferences' },
                { key: 'COLLECT_SKILL_ASSESSMENT', label: 'Collect Skill Assessment' },
                { key: 'COLLECT_CONVERSATION_ANALYTICS', label: 'Collect Conversation Analytics' },
                { key: 'ENABLE_VOICE_INPUT', label: 'Enable Voice Input' },
                { key: 'ENABLE_TEXT_INPUT', label: 'Enable Text Input' },
                { key: 'ENABLE_AVATAR_DISPLAY', label: 'Enable Avatar Display' },
                { key: 'ENABLE_CONVERSATION_LOGGING', label: 'Enable Conversation Logging' },
                { key: 'ENABLE_USER_ANALYTICS', label: 'Enable User Analytics' },
                { key: 'ENABLE_PERFORMANCE_METRICS', label: 'Enable Performance Metrics' },
                { key: 'ENABLE_AI_AVATAR', label: 'Enable AI Avatar' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type="checkbox"
                    checked={settings[key] || false}
                    onChange={(e) => handleInputChange(key, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Development Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Development Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Node Environment
                </label>
                <select
                  value={settings.NODE_ENV || 'development'}
                  onChange={(e) => handleInputChange('NODE_ENV', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                  <option value="test">Test</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={settings.PORT || ''}
                  onChange={(e) => handleInputChange('PORT', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Environment Variables Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Environment Variables</h3>
          <p className="text-blue-800 text-sm">
            These settings override environment variables for testing purposes. 
            Changes are saved to localStorage and applied immediately. 
            For production deployment, configure these values in your environment variables.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings; 