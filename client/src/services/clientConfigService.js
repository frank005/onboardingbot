/**
 * Client-side configuration service - replaces server API calls
 * All configuration is now handled client-side for deployment compatibility
 */

// Default configuration values
const DEFAULT_CONFIG = {
  // Bot configuration
  botName: 'Welcome Bot',
  botPersonality: 'friendly and helpful',
  enableVoiceInput: true,
  enableTextInput: true,
  enableAvatarDisplay: false,
  avatarImageUrl: null,
  onboardingFields: ['name', 'birthday', 'interests', 'bio', 'experienceLevel'],
  requiredFields: ['name'],
  optionalFields: ['birthday', 'interests', 'bio', 'experienceLevel', 'location', 'phone', 'email', 'website', 'socialHandles'],
  
  // Client-side environment variables
  clientConfig: {
    REACT_APP_AGORA_APP_ID: process.env.REACT_APP_AGORA_APP_ID,
    REACT_APP_AGORA_CHANNEL: process.env.REACT_APP_AGORA_CHANNEL || 'onboarding_channel',
    REACT_APP_TTS_VENDOR: process.env.REACT_APP_TTS_VENDOR || 'microsoft',
    REACT_APP_ASR_VENDOR: process.env.REACT_APP_ASR_VENDOR || 'agora',
    REACT_APP_ENABLE_RTM: process.env.REACT_APP_ENABLE_RTM === 'true',
    REACT_APP_ENABLE_RTC_VIDEO: process.env.REACT_APP_ENABLE_RTC_VIDEO === 'true',
    REACT_APP_ENABLE_RTC_AUDIO: process.env.REACT_APP_ENABLE_RTC_AUDIO === 'true',
    REACT_APP_AVATAR_ENABLED: process.env.REACT_APP_AVATAR_ENABLED === 'true',
    REACT_APP_AGORA_FALLBACK_ENABLED: process.env.REACT_APP_AGORA_FALLBACK_ENABLED === 'true'
  },
  
  // Service status (simplified for client-side)
  agoraConfig: {
    appId: process.env.REACT_APP_AGORA_APP_ID,
    channel: process.env.REACT_APP_AGORA_CHANNEL || 'onboarding_channel',
    enabled: !!process.env.REACT_APP_AGORA_APP_ID
  },
  agoraAgentStatus: {
    enabled: !!process.env.REACT_APP_AGORA_APP_ID,
    status: 'client-side'
  },
  avatarStatus: {
    enabled: process.env.REACT_APP_AVATAR_ENABLED === 'true',
    status: 'client-side'
  },
  ttsStatus: {
    enabled: true,
    vendor: process.env.REACT_APP_TTS_VENDOR || 'microsoft',
    status: 'client-side'
  },
  asrStatus: {
    enabled: true,
    vendor: process.env.REACT_APP_ASR_VENDOR || 'agora',
    status: 'client-side'
  },
  mllmStatus: {
    enabled: false,
    status: 'client-side'
  },
  rtmEnabled: process.env.REACT_APP_ENABLE_RTM === 'true',
  rtcVideoEnabled: process.env.REACT_APP_ENABLE_RTC_VIDEO === 'true',
  rtcAudioEnabled: process.env.REACT_APP_ENABLE_RTC_AUDIO === 'true'
};

class ClientConfigService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadFromLocalStorage();
  }

  // Load configuration from localStorage if available
  loadFromLocalStorage() {
    try {
      const savedConfig = localStorage.getItem('onboardingBotConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
  }

  // Save configuration to localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('onboardingBotConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save config to localStorage:', error);
    }
  }

  // Get full configuration
  async getConfig() {
    return this.config;
  }

  // Update configuration
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.saveToLocalStorage();
    return this.config;
  }

  // Get specific configuration section
  getBotConfig() {
    return {
      botName: this.config.botName,
      botPersonality: this.config.botPersonality,
      enableVoiceInput: this.config.enableVoiceInput,
      enableTextInput: this.config.enableTextInput,
      enableAvatarDisplay: this.config.enableAvatarDisplay,
      avatarImageUrl: this.config.avatarImageUrl,
      onboardingFields: this.config.onboardingFields,
      requiredFields: this.config.requiredFields,
      optionalFields: this.config.optionalFields
    };
  }

  getClientConfig() {
    return this.config.clientConfig;
  }

  getAgoraConfig() {
    return this.config.agoraConfig;
  }

  getServiceStatus() {
    return {
      agoraConfig: this.config.agoraConfig,
      agoraAgentStatus: this.config.agoraAgentStatus,
      avatarStatus: this.config.avatarStatus,
      ttsStatus: this.config.ttsStatus,
      asrStatus: this.config.asrStatus,
      mllmStatus: this.config.mllmStatus,
      rtmEnabled: this.config.rtmEnabled,
      rtcVideoEnabled: this.config.rtcVideoEnabled,
      rtcAudioEnabled: this.config.rtcAudioEnabled
    };
  }

  // Check if required services are configured
  isServiceReady() {
    return {
      agora: !!this.config.agoraConfig.appId,
      tts: true, // Always available client-side
      asr: true, // Always available client-side
      avatar: this.config.avatarStatus.enabled
    };
  }

  // Validate configuration
  validateConfig() {
    const errors = [];
    
    if (!this.config.agoraConfig.appId) {
      errors.push('AGORA_APP_ID is required for Agora services');
    }
    
    if (!this.config.onboardingFields || this.config.onboardingFields.length === 0) {
      errors.push('At least one onboarding field must be configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export default new ClientConfigService();
