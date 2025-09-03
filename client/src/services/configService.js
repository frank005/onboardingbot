import clientConfigService from './clientConfigService';

class ConfigService {
  constructor() {
    this.config = null;
  }

  async getConfig() {
    try {
      // Use client-side config service instead of server API
      this.config = await clientConfigService.getConfig();
      return this.config;
    } catch (error) {
      console.error('Error getting config:', error);
      // Return default config if client service fails
      return this.getDefaultConfig();
    }
  }

  // Get environment variable (prioritizes client config, falls back to process.env)
  getEnvVar(key) {
    // First try client config
    if (this.config && this.config.clientConfig && this.config.clientConfig[key] !== undefined) {
      return this.config.clientConfig[key];
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
    return !!this.config;
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

  // Get default config for fallback
  getDefaultConfig() {
    return {
      botName: 'Welcome Bot',
      botPersonality: 'friendly and helpful',
      enableVoiceInput: true,
      enableTextInput: true,
      enableAvatarDisplay: false,
      avatarImageUrl: null,
      onboardingFields: ['name', 'birthday', 'interests', 'bio', 'experienceLevel'],
      requiredFields: ['name'],
      optionalFields: ['birthday', 'interests', 'bio', 'experienceLevel', 'location', 'phone', 'email', 'website', 'socialHandles'],
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
      }
    };
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;
