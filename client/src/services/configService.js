class ClientConfigService {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      
      const data = await response.json();
      this.config = data;
      this.loaded = true;
      
      // Set environment variables for client-side use
      this.setClientEnvironmentVariables(data.clientConfig);
      
      console.log('✅ Client configuration loaded successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to load client configuration:', error);
      // Fallback to default values
      this.setDefaultEnvironmentVariables();
      return null;
    }
  }

  setClientEnvironmentVariables(clientConfig) {
    // Set environment variables that the client needs
    if (clientConfig.REACT_APP_AGORA_APP_ID) {
      window.REACT_APP_AGORA_APP_ID = clientConfig.REACT_APP_AGORA_APP_ID;
    }
    if (clientConfig.REACT_APP_AGORA_CHANNEL) {
      window.REACT_APP_AGORA_CHANNEL = clientConfig.REACT_APP_AGORA_CHANNEL;
    }
    if (clientConfig.REACT_APP_TTS_VENDOR) {
      window.REACT_APP_TTS_VENDOR = clientConfig.REACT_APP_TTS_VENDOR;
    }
    if (clientConfig.REACT_APP_ASR_VENDOR) {
      window.REACT_APP_ASR_VENDOR = clientConfig.REACT_APP_ASR_VENDOR;
    }
    if (clientConfig.REACT_APP_ENABLE_RTM !== undefined) {
      window.REACT_APP_ENABLE_RTM = clientConfig.REACT_APP_ENABLE_RTM;
    }
    if (clientConfig.REACT_APP_ENABLE_RTC_VIDEO !== undefined) {
      window.REACT_APP_ENABLE_RTC_VIDEO = clientConfig.REACT_APP_ENABLE_RTC_VIDEO;
    }
    if (clientConfig.REACT_APP_ENABLE_RTC_AUDIO !== undefined) {
      window.REACT_APP_ENABLE_RTC_AUDIO = clientConfig.REACT_APP_ENABLE_RTC_AUDIO;
    }
    if (clientConfig.REACT_APP_AVATAR_ENABLED !== undefined) {
      window.REACT_APP_AVATAR_ENABLED = clientConfig.REACT_APP_AVATAR_ENABLED;
    }
    if (clientConfig.REACT_APP_AGORA_FALLBACK_ENABLED !== undefined) {
      window.REACT_APP_AGORA_FALLBACK_ENABLED = clientConfig.REACT_APP_AGORA_FALLBACK_ENABLED;
    }
  }

  setDefaultEnvironmentVariables() {
    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('agoraSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        Object.entries(settings).forEach(([key, value]) => {
          window[key] = value;
        });
        console.log('✅ Loaded settings from localStorage');
        return;
      } catch (error) {
        console.warn('⚠️ Failed to parse saved settings:', error);
      }
    }
    
    // Set default values if config loading fails
    window.REACT_APP_AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;
    window.REACT_APP_AGORA_CHANNEL = process.env.REACT_APP_AGORA_CHANNEL || 'onboarding_channel';
    window.REACT_APP_TTS_VENDOR = process.env.REACT_APP_TTS_VENDOR || 'microsoft';
    window.REACT_APP_ASR_VENDOR = process.env.REACT_APP_ASR_VENDOR || 'agora';
    window.REACT_APP_ENABLE_RTM = process.env.REACT_APP_ENABLE_RTM === 'true';
    window.REACT_APP_ENABLE_RTC_VIDEO = process.env.REACT_APP_ENABLE_RTC_VIDEO === 'true';
    window.REACT_APP_ENABLE_RTC_AUDIO = process.env.REACT_APP_ENABLE_RTC_AUDIO === 'true';
    window.REACT_APP_AVATAR_ENABLED = process.env.REACT_APP_AVATAR_ENABLED === 'true';
    window.REACT_APP_AGORA_FALLBACK_ENABLED = process.env.REACT_APP_AGORA_FALLBACK_ENABLED === 'true';
  }

  // Get environment variable (prioritizes server config, falls back to process.env)
  getEnvVar(key) {
    // First try window variables (from server config)
    if (window[key] !== undefined) {
      return window[key];
    }
    
    // Fall back to process.env (for build-time variables)
    return process.env[key];
  }

  // Get Agora App ID
  getAgoraAppId() {
    return this.getEnvVar('REACT_APP_AGORA_APP_ID');
  }

  // Get Agora Channel
  getAgoraChannel() {
    return this.getEnvVar('REACT_APP_AGORA_CHANNEL') || 'onboarding_channel';
  }

  // Get TTS Vendor
  getTTSVendor() {
    return this.getEnvVar('REACT_APP_TTS_VENDOR') || 'microsoft';
  }

  // Get ASR Vendor
  getASRVendor() {
    return this.getEnvVar('REACT_APP_ASR_VENDOR') || 'agora';
  }

  // Check if RTM is enabled
  isRTMEnabled() {
    return this.getEnvVar('REACT_APP_ENABLE_RTM') === true;
  }

  // Check if RTC Video is enabled
  isRTCVideoEnabled() {
    return this.getEnvVar('REACT_APP_ENABLE_RTC_VIDEO') === true;
  }

  // Check if RTC Audio is enabled
  isRTCAudioEnabled() {
    return this.getEnvVar('REACT_APP_ENABLE_RTC_AUDIO') === true;
  }

  // Check if Avatar is enabled
  isAvatarEnabled() {
    return this.getEnvVar('REACT_APP_AVATAR_ENABLED') === true;
  }

  // Check if Agora Fallback is enabled
  isAgoraFallbackEnabled() {
    return this.getEnvVar('REACT_APP_AGORA_FALLBACK_ENABLED') === true;
  }

  // Get full configuration
  getConfig() {
    return this.config;
  }

  // Check if config is loaded
  isLoaded() {
    return this.loaded;
  }

  // Validate required configuration
  validate() {
    const errors = [];
    
    if (!this.getAgoraAppId()) {
      errors.push('REACT_APP_AGORA_APP_ID is required');
    }
    
    if (errors.length > 0) {
      console.warn('⚠️ Configuration validation errors:', errors);
      return false;
    }
    
    return true;
  }
}

// Create singleton instance
const clientConfigService = new ClientConfigService();

export default clientConfigService;
