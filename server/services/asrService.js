const axios = require('axios');
const FormData = require('form-data');

class ASRService {
  constructor() {
    this.provider = process.env.ASR_PROVIDER || 'agora';
    this.streaming = process.env.ASR_STREAMING === 'true';
    this.language = process.env.ASR_LANGUAGE || 'en-US';
    this.model = process.env.ASR_MODEL || 'base';
    
    // Initialize provider-specific configurations
    this.initializeProviders();
  }

  // Initialize all ASR providers
  initializeProviders() {
    this.providers = {
      agora: {
        model: process.env.AGORA_ASR_MODEL || 'base',
        language: process.env.AGORA_ASR_LANGUAGE || 'en-US',
        vad: process.env.AGORA_ASR_VAD === 'true',
        punctuation: process.env.AGORA_ASR_PUNCTUATION === 'true'
      },
      microsoft: {
        apiKey: process.env.MICROSOFT_ASR_API_KEY,
        region: process.env.MICROSOFT_ASR_REGION || 'eastus',
        language: process.env.MICROSOFT_ASR_LANGUAGE || 'en-US',
        model: process.env.MICROSOFT_ASR_MODEL || 'base'
      },
      deepgram: {
        apiKey: process.env.DEEPGRAM_ASR_API_KEY,
        model: process.env.DEEPGRAM_ASR_MODEL || 'nova-2',
        language: process.env.DEEPGRAM_ASR_LANGUAGE || 'en-US'
      }
    };
  }

  // Get ASR status
  getASRStatus() {
    const currentProvider = this.providers[this.provider];
    return {
      provider: this.provider,
      configured: this.isProviderConfigured(this.provider),
      streaming: this.streaming,
      language: this.language,
      model: this.model,
      providerConfig: currentProvider
    };
  }

  // Check if provider is configured
  isProviderConfigured(provider) {
    const config = this.providers[provider];
    
    switch (provider) {
      case 'agora':
        return true; // Agora ASR is built-in
      case 'microsoft':
        return !!config.apiKey;
      case 'deepgram':
        return !!config.apiKey;
      default:
        return false;
    }
  }

  // Convert speech to text using configured provider
  async speechToText(audioBuffer, options = {}) {
    const provider = options.provider || this.provider;
    const config = this.providers[provider];

    if (!this.isProviderConfigured(provider)) {
      throw new Error(`${provider} ASR is not properly configured`);
    }

    switch (provider) {
      case 'agora':
        return this.agoraASR(audioBuffer, config);
      case 'microsoft':
        return this.microsoftASR(audioBuffer, config);
      case 'deepgram':
        return this.deepgramASR(audioBuffer, config);
      default:
        throw new Error(`Unsupported ASR provider: ${provider}`);
    }
  }

  // Agora ASR (built-in)
  async agoraASR(audioBuffer, config) {
    try {
      // For Agora ASR, we'll use a simplified approach
      // In a real implementation, you'd use Agora's ASR SDK
      const url = `${process.env.AGORA_API_BASE_URL}/asr`;
      
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('language', config.language);
      formData.append('model', config.model);
      formData.append('vad', config.vad);
      formData.append('punctuation', config.punctuation);

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Basic ${Buffer.from(`${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`).toString('base64')}`
        }
      });

      return {
        text: response.data.text,
        confidence: response.data.confidence,
        language: response.data.language
      };
    } catch (error) {
      console.error('Error in Agora ASR:', error.response?.data || error.message);
      throw new Error('Failed to convert speech to text with Agora ASR');
    }
  }

  // Microsoft ASR
  async microsoftASR(audioBuffer, config) {
    try {
      const url = `https://${config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
      
      const response = await axios.post(url, audioBuffer, {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey,
          'Content-Type': 'audio/wav',
          'Accept': 'application/json'
        },
        params: {
          language: config.language,
          model: config.model
        }
      });

      return {
        text: response.data.DisplayText,
        confidence: response.data.NBest?.[0]?.Confidence || 0,
        language: response.data.Language
      };
    } catch (error) {
      console.error('Error in Microsoft ASR:', error.response?.data || error.message);
      throw new Error('Failed to convert speech to text with Microsoft ASR');
    }
  }

  // Deepgram ASR
  async deepgramASR(audioBuffer, config) {
    try {
      const url = `https://api.deepgram.com/v1/listen`;
      
      const response = await axios.post(url, audioBuffer, {
        headers: {
          'Authorization': `Token ${config.apiKey}`,
          'Content-Type': 'audio/wav'
        },
        params: {
          model: config.model,
          language: config.language,
          punctuate: true,
          diarize: false,
          smart_format: true
        }
      });

      const result = response.data.results?.channels?.[0]?.alternatives?.[0];
      
      return {
        text: result.transcript,
        confidence: result.confidence,
        language: response.data.metadata?.language
      };
    } catch (error) {
      console.error('Error in Deepgram ASR:', error.response?.data || error.message);
      throw new Error('Failed to convert speech to text with Deepgram ASR');
    }
  }

  // Stream ASR (for real-time applications)
  async streamASR(audioStream, options = {}) {
    if (!this.streaming) {
      // Collect the stream into a buffer and process
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      return this.speechToText(audioBuffer, options);
    }

    // For streaming ASR, we'll return a readable stream
    const { Readable } = require('stream');
    const resultStream = new Readable({
      objectMode: true,
      read() {}
    });

    // Process audio chunks in real-time
    audioStream.on('data', async (chunk) => {
      try {
        const result = await this.speechToText(chunk, options);
        resultStream.push(result);
      } catch (error) {
        resultStream.emit('error', error);
      }
    });

    audioStream.on('end', () => {
      resultStream.push(null);
    });

    return resultStream;
  }

  // Get ASR configuration for agent
  getASRConfig() {
    const validation = this.isProviderConfigured(this.provider);
    if (!validation) {
      return null;
    }

    const config = this.providers[this.provider];
    
    switch (this.provider) {
      case 'agora':
        return {
          asr_vendor: 'agora',
          asr_model: config.model,
          asr_language: config.language,
          asr_vad: config.vad,
          asr_punctuation: config.punctuation
        };
      
      case 'microsoft':
        return {
          asr_vendor: 'microsoft',
          asr_api_key: config.apiKey,
          asr_region: config.region,
          asr_language: config.language,
          asr_model: config.model
        };
      
      case 'deepgram':
        return {
          asr_vendor: 'deepgram',
          asr_api_key: config.apiKey,
          asr_model: config.model,
          asr_language: config.language
        };
      
      default:
        return null;
    }
  }

  // Validate ASR configuration
  validateConfig() {
    if (!this.isProviderConfigured(this.provider)) {
      return { valid: false, reason: `${this.provider} ASR is not properly configured` };
    }

    return { valid: true };
  }

  // Update ASR configuration
  updateASRConfig(config) {
    if (config.asr_vendor) {
      this.provider = config.asr_vendor;
    }

    // Update environment variables (in a real app, you'd persist these)
    Object.keys(config).forEach(key => {
      if (key.startsWith('asr_') && key !== 'asr_vendor') {
        const envKey = key.toUpperCase();
        process.env[envKey] = config[key];
      }
    });

    // Reinitialize providers with new config
    this.initializeProviders();

    return this.getASRConfig();
  }
}

module.exports = new ASRService();
