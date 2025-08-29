class ConfigService {
  constructor() {
    this.loadConfiguration();
  }

  loadConfiguration() {
    // TTS Configuration
    this.tts = {
      vendor: process.env.TTS_VENDOR || 'microsoft',
      microsoft: {
        key: process.env.MICROSOFT_TTS_API_KEY || process.env.MICROSOFT_TTS_KEY,
        region: process.env.MICROSOFT_TTS_REGION || 'eastus',
        voice: process.env.MICROSOFT_TTS_VOICE || 'en-US-AvaMultilingualNeural',
        sampleRate: 24000
      },
      openai: {
        key: process.env.OPENAI_API_KEY,
        voice: process.env.OPENAI_TTS_VOICE || 'alloy',
        speed: parseFloat(process.env.OPENAI_TTS_SPEED) || 1.0
      },
      elevenlabs: {
        key: process.env.ELEVENLABS_TTS_API_KEY,
        voiceId: process.env.ELEVENLABS_TTS_VOICE_ID,
        model: process.env.ELEVENLABS_TTS_MODEL || 'eleven_monolingual_v1',
        stability: parseFloat(process.env.ELEVENLABS_TTS_STABILITY) || 0.5,
        similarityBoost: parseFloat(process.env.ELEVENLABS_TTS_SIMILARITY_BOOST) || 0.75
      },
      cartesia: {
        key: process.env.CARTESIA_TTS_API_KEY,
        voiceId: process.env.CARTESIA_TTS_VOICE_ID,
        model: process.env.CARTESIA_TTS_MODEL || 'sonic-2'
      },
      hume: {
        key: process.env.HUME_TTS_API_KEY,
        voiceId: process.env.HUME_TTS_VOICE_ID,
        speed: parseFloat(process.env.HUME_TTS_SPEED) || 1.0
      }
    };

    // ASR Configuration
    this.asr = {
      vendor: process.env.ASR_VENDOR || 'agora',
      language: process.env.ASR_LANGUAGE || 'en-US',
      agora: {
        language: process.env.AGORA_ASR_LANGUAGE || 'en-US',
        model: process.env.AGORA_ASR_MODEL || 'base',
        vad: process.env.AGORA_ASR_VAD === 'true',
        punctuation: process.env.AGORA_ASR_PUNCTUATION === 'true'
      },
      microsoft: {
        key: process.env.MICROSOFT_ASR_API_KEY,
        region: process.env.MICROSOFT_ASR_REGION || 'eastus',
        language: process.env.MICROSOFT_ASR_LANGUAGE || 'en-US',
        model: process.env.MICROSOFT_ASR_MODEL || 'base'
      },
      deepgram: {
        key: process.env.DEEPGRAM_ASR_API_KEY,
        model: process.env.DEEPGRAM_ASR_MODEL || 'nova-2',
        language: process.env.DEEPGRAM_ASR_LANGUAGE || 'en-US'
      }
    };

    // Agora Configuration
    this.agora = {
      appId: process.env.AGORA_APP_ID,
      appCertificate: process.env.AGORA_APP_CERTIFICATE,
      customerId: process.env.AGORA_CUSTOMER_ID,
      customerSecret: process.env.AGORA_CUSTOMER_SECRET,
      apiBaseUrl: process.env.AGORA_API_BASE_URL || 'https://api.agora.io/api/conversational-ai-agent/v2',
      channel: process.env.AGORA_CHANNEL || 'onboarding_channel'
    };

    // OpenAI Configuration
    this.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
    };

    // Bot Configuration
    this.bot = {
      name: process.env.BOT_NAME || 'Welcome Bot',
      personality: process.env.BOT_PERSONALITY || 'friendly and helpful',
      language: process.env.BOT_LANGUAGE || 'en',
      voiceId: process.env.BOT_VOICE_ID || 'alloy'
    };
  }

  // Get TTS configuration for a specific vendor
  getTTSConfig(vendor = null) {
    const ttsVendor = vendor || this.tts.vendor;
    
    switch (ttsVendor.toLowerCase()) {
      case 'microsoft':
        return {
          vendor: 'microsoft',
          params: {
            key: this.tts.microsoft.key,
            region: this.tts.microsoft.region,
            voice_name: this.tts.microsoft.voice,
            sample_rate: this.tts.microsoft.sampleRate
          }
        };
      
      case 'openai':
        return {
          vendor: 'openai',
          params: {
            key: this.tts.openai.key,
            voice: this.tts.openai.voice,
            speed: this.tts.openai.speed
          }
        };
      
      case 'elevenlabs':
        return {
          vendor: 'elevenlabs',
          params: {
            key: this.tts.elevenlabs.key,
            voice_id: this.tts.elevenlabs.voiceId,
            model: this.tts.elevenlabs.model,
            stability: this.tts.elevenlabs.stability,
            similarity_boost: this.tts.elevenlabs.similarityBoost
          }
        };
      
      case 'cartesia':
        return {
          vendor: 'cartesia',
          params: {
            key: this.tts.cartesia.key,
            voice_id: this.tts.cartesia.voiceId,
            model: this.tts.cartesia.model
          }
        };
      
      case 'hume':
        return {
          vendor: 'hume',
          params: {
            key: this.tts.hume.key,
            voice_id: this.tts.hume.voiceId,
            speed: this.tts.hume.speed
          }
        };
      
      default:
        console.warn(`⚠️ Unknown TTS vendor: ${ttsVendor}, falling back to Microsoft`);
        return this.getTTSConfig('microsoft');
    }
  }

  // Get ASR configuration for a specific vendor
  getASRConfig(vendor = null) {
    const asrVendor = vendor || this.asr.vendor;
    
    switch (asrVendor.toLowerCase()) {
      case 'agora':
        return {
          vendor: 'agora',
          language: this.asr.agora.language,
          model: this.asr.agora.model,
          vad: this.asr.agora.vad,
          punctuation: this.asr.agora.punctuation
        };
      
      case 'microsoft':
        return {
          vendor: 'microsoft',
          key: this.asr.microsoft.key,
          region: this.asr.microsoft.region,
          language: this.asr.microsoft.language,
          model: this.asr.microsoft.model
        };
      
      case 'deepgram':
        return {
          vendor: 'deepgram',
          key: this.asr.deepgram.key,
          model: this.asr.deepgram.model,
          language: this.asr.deepgram.language
        };
      
      default:
        console.warn(`⚠️ Unknown ASR vendor: ${asrVendor}, falling back to Agora`);
        return this.getASRConfig('agora');
    }
  }

  // Validate configuration
  validate() {
    const errors = [];

    // Validate TTS configuration
    const ttsConfig = this.getTTSConfig();
    if (!ttsConfig.params.key) {
      errors.push(`TTS API key not configured for vendor: ${ttsConfig.vendor}`);
    }

    // Validate ASR configuration
    const asrConfig = this.getASRConfig();
    if (asrConfig.vendor !== 'agora' && !asrConfig.key) {
      errors.push(`ASR API key not configured for vendor: ${asrConfig.vendor}`);
    }

    // Validate OpenAI configuration
    if (!this.openai.apiKey) {
      errors.push('OpenAI API key not configured');
    }

    // Validate Agora configuration
    if (!this.agora.appId) {
      errors.push('Agora App ID not configured');
    }

    if (errors.length > 0) {
      console.warn('⚠️ Configuration validation errors:', errors);
      return false;
    }

    return true;
  }

  // Get full configuration object
  getConfig() {
    return {
      tts: this.tts,
      asr: this.asr,
      agora: this.agora,
      openai: this.openai,
      bot: this.bot
    };
  }
}

module.exports = new ConfigService();
