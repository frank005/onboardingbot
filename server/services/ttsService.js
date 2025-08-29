const axios = require('axios');

class TTSService {
  constructor() {
    this.vendor = process.env.TTS_VENDOR || 'microsoft';
    this.config = this.getVendorConfig();
  }

  // Get vendor-specific configuration
  getVendorConfig() {
    switch (this.vendor) {
      case 'microsoft':
        return {
          apiKey: process.env.MICROSOFT_TTS_API_KEY,
          region: process.env.MICROSOFT_TTS_REGION || 'eastus',
          voice: process.env.MICROSOFT_TTS_VOICE || 'en-US-JennyNeural',
          rate: process.env.MICROSOFT_TTS_RATE || '1.0',
          speed: process.env.MICROSOFT_TTS_SPEED || '1.0',
          volume: process.env.MICROSOFT_TTS_VOLUME || '100',
          sampleRate: process.env.MICROSOFT_TTS_SAMPLE_RATE || '24000'
        };
      
      case 'elevenlabs':
        return {
          apiKey: process.env.ELEVENLABS_API_KEY,
          modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
          voiceId: process.env.ELEVENLABS_VOICE_ID,
          sampleRate: process.env.ELEVENLABS_SAMPLE_RATE || '24000',
          stability: process.env.ELEVENLABS_STABILITY || '0.5',
          similarityBoost: process.env.ELEVENLABS_SIMILARITY_BOOST || '0.5',
          style: process.env.ELEVENLABS_STYLE || '0.0',
          useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST === 'true'
        };
      
      case 'cartesia':
        return {
          apiKey: process.env.CARTESIA_API_KEY,
          modelId: process.env.CARTESIA_MODEL_ID || 'sonic-2',
          voiceId: process.env.CARTESIA_VOICE_ID
        };
      
      case 'openai':
        return {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
          voice: process.env.OPENAI_TTS_VOICE || 'coral',
          speed: process.env.OPENAI_TTS_SPEED || '1.0',
          instructions: process.env.OPENAI_TTS_INSTRUCTIONS || ''
        };
      
      case 'hume':
        return {
          apiKey: process.env.HUME_API_KEY,
          voiceId: process.env.HUME_VOICE_ID,
          provider: process.env.HUME_PROVIDER || 'HUME_AI',
          speed: process.env.HUME_SPEED || '1.0',
          trailingSilence: process.env.HUME_TRAILING_SILENCE || '0.35'
        };
      
      default:
        return {};
    }
  }

  // Validate TTS configuration
  validateConfig() {
    const config = this.getVendorConfig();
    
    if (!config.apiKey) {
      return { valid: false, reason: `${this.vendor} API key is required` };
    }

    // Vendor-specific validations
    switch (this.vendor) {
      case 'microsoft':
        if (!config.region || !config.voice) {
          return { valid: false, reason: 'Microsoft TTS region and voice are required' };
        }
        break;
      
      case 'elevenlabs':
        if (!config.voiceId) {
          return { valid: false, reason: 'ElevenLabs voice ID is required' };
        }
        break;
      
      case 'cartesia':
        if (!config.voiceId) {
          return { valid: false, reason: 'Cartesia voice ID is required' };
        }
        break;
      
      case 'openai':
        if (!config.voice) {
          return { valid: false, reason: 'OpenAI TTS voice is required' };
        }
        break;
      
      case 'hume':
        if (!config.voiceId) {
          return { valid: false, reason: 'Hume voice ID is required' };
        }
        break;
    }

    return { valid: true };
  }

  // Get TTS configuration for agent
  getTTSConfig() {
    const validation = this.validateConfig();
    if (!validation.valid) {
      return null;
    }

    const config = this.getVendorConfig();
    
    switch (this.vendor) {
      case 'microsoft':
        return {
          tts_vendor: 'microsoft',
          tts_api_key: config.apiKey,
          tts_region: config.region,
          tts_language: config.voice.split('-')[0] + '-' + config.voice.split('-')[1],
          tts_voice: config.voice,
          tts_rate: config.rate,
          tts_speed: config.speed,
          tts_volume: config.volume,
          tts_sample_rate: config.sampleRate
        };
      
      case 'elevenlabs':
        return {
          tts_vendor: 'elevenlabs',
          tts_api_key: config.apiKey,
          tts_model_id: config.modelId,
          tts_voice_id: config.voiceId,
          tts_sample_rate: config.sampleRate,
          tts_stability: config.stability,
          tts_similarity_boost: config.similarityBoost,
          tts_style: config.style,
          tts_use_speaker_boost: config.useSpeakerBoost
        };
      
      case 'cartesia':
        return {
          tts_vendor: 'cartesia',
          tts_api_key: config.apiKey,
          tts_model_id: config.modelId,
          tts_voice_id: config.voiceId
        };
      
      case 'openai':
        return {
          tts_vendor: 'openai',
          tts_api_key: config.apiKey,
          tts_model: config.model,
          tts_voice: config.voice,
          tts_speed: config.speed,
          tts_instructions: config.instructions
        };
      
      case 'hume':
        return {
          tts_vendor: 'hume',
          tts_api_key: config.apiKey,
          tts_voice_id: config.voiceId,
          tts_provider: config.provider,
          tts_speed: config.speed,
          tts_trailing_silence: config.trailingSilence
        };
      
      default:
        return null;
    }
  }

  // Get available voices for vendor
  async getAvailableVoices() {
    switch (this.vendor) {
      case 'microsoft':
        return this.getMicrosoftVoices();
      case 'elevenlabs':
        return this.getElevenLabsVoices();
      case 'openai':
        return this.getOpenAIVoices();
      default:
        return [];
    }
  }

  // Get Microsoft voices
  async getMicrosoftVoices() {
    const config = this.getVendorConfig();
    if (!config.apiKey || !config.region) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': config.apiKey
          }
        }
      );

      const voices = response.data;
      return voices.map(voice => ({
        id: voice.ShortName,
        name: voice.LocalName,
        language: voice.Locale,
        gender: voice.Gender,
        style: voice.Style
      }));
    } catch (error) {
      console.error('Error fetching Microsoft voices:', error);
      return [];
    }
  }

  // Get ElevenLabs voices
  async getElevenLabsVoices() {
    const config = this.getVendorConfig();
    if (!config.apiKey) {
      return [];
    }

    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': config.apiKey
        }
      });

      const data = response.data;
      return data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.labels?.description || ''
      }));
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return [];
    }
  }

  // Get OpenAI voices
  getOpenAIVoices() {
    return [
      { id: 'alloy', name: 'Alloy', description: 'A neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'A warm, friendly voice' },
      { id: 'fable', name: 'Fable', description: 'A clear, professional voice' },
      { id: 'onyx', name: 'Onyx', description: 'A deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'A bright, energetic voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'A soft, gentle voice' }
    ];
  }

  // Get TTS status
  getTTSStatus() {
    const validation = this.validateConfig();
    return {
      vendor: this.vendor,
      valid: validation.valid,
      reason: validation.reason,
      config: this.getTTSConfig()
    };
  }

  // Update TTS configuration
  updateTTSConfig(config) {
    if (config.tts_vendor) {
      this.vendor = config.tts_vendor;
    }

    // Update environment variables (in a real app, you'd persist these)
    Object.keys(config).forEach(key => {
      if (key.startsWith('tts_') && key !== 'tts_vendor') {
        const envKey = key.toUpperCase();
        process.env[envKey] = config[key];
      }
    });

    return this.getTTSConfig();
  }

  // Convert text to speech using configured vendor
  async textToSpeech(text, options = {}) {
    const vendor = options.vendor || this.vendor;
    const config = this.getVendorConfig();

    if (!config.apiKey) {
      throw new Error(`${vendor} TTS API key not configured`);
    }

    switch (vendor) {
      case 'microsoft':
        return this.microsoftTTS(text, config);
      case 'elevenlabs':
        return this.elevenLabsTTS(text, config);
      case 'cartesia':
        return this.cartesiaTTS(text, config);
      case 'openai':
        return this.openaiTTS(text, config);
      case 'hume':
        return this.humeTTS(text, config);
      default:
        throw new Error(`Unsupported TTS vendor: ${vendor}`);
    }
  }

  // Microsoft TTS
  async microsoftTTS(text, config) {
    try {
      const url = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      // Create SSML with advanced options
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="${config.voice}">
            <prosody rate="${config.rate}" volume="${config.volume}">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;
      
      const response = await axios.post(url, ssml, {
        headers: {
          'Ocp-Apim-Subscription-Key': config.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error in Microsoft TTS:', error.response?.data || error.message);
      throw new Error('Failed to convert text to speech with Microsoft TTS');
    }
  }

  // ElevenLabs TTS
  async elevenLabsTTS(text, config) {
    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`;
      
      const response = await axios.post(url, {
        text,
        model_id: config.modelId,
        voice_settings: {
          stability: parseFloat(config.stability),
          similarity_boost: parseFloat(config.similarityBoost),
          style: parseFloat(config.style),
          use_speaker_boost: config.useSpeakerBoost
        }
      }, {
        headers: {
          'xi-api-key': config.apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error in ElevenLabs TTS:', error.response?.data || error.message);
      throw new Error('Failed to convert text to speech with ElevenLabs TTS');
    }
  }

  // Cartesia TTS
  async cartesiaTTS(text, config) {
    try {
      const url = `https://api.cartesia.ai/v1/audio/speech`;
      
      const response = await axios.post(url, {
        text,
        model: config.modelId,
        voice_id: config.voiceId
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error in Cartesia TTS:', error.response?.data || error.message);
      throw new Error('Failed to convert text to speech with Cartesia TTS');
    }
  }

  // OpenAI TTS
  async openaiTTS(text, config) {
    try {
      const url = 'https://api.openai.com/v1/audio/speech';
      
      const response = await axios.post(url, {
        model: 'tts-1',
        input: text,
        voice: config.voice,
        speed: parseFloat(config.speed)
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      console.error('Error in OpenAI TTS:', error.response?.data || error.message);
      throw new Error('Failed to convert text to speech with OpenAI TTS');
    }
  }

  // Hume AI TTS
  async humeTTS(text, config) {
    try {
      const url = `https://api.hume.ai/v0/batch/jobs`;
      
      const response = await axios.post(url, {
        model: {
          name: 'Hume-1.0'
        },
        input: [{
          data: text,
          mime_type: 'text/plain'
        }],
        voice: {
          id: config.voiceId
        },
        speed: parseFloat(config.speed)
      }, {
        headers: {
          'X-Hume-Api-Key': config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Hume returns a job ID, we need to poll for completion
      const jobId = response.data.job_id;
      return await this.pollHumeJob(jobId, config.apiKey);
    } catch (error) {
      console.error('Error in Hume TTS:', error.response?.data || error.message);
      throw new Error('Failed to convert text to speech with Hume TTS');
    }
  }

  // Poll Hume job for completion
  async pollHumeJob(jobId, apiKey) {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`https://api.hume.ai/v0/batch/jobs/${jobId}`, {
          headers: {
            'X-Hume-Api-Key': apiKey
          }
        });

        if (response.data.status === 'completed') {
          // Download the audio file
          const audioUrl = response.data.results[0].audio_url;
          const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer'
          });
          return audioResponse.data;
        } else if (response.data.status === 'failed') {
          throw new Error('Hume TTS job failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error polling Hume job:', error);
        throw error;
      }
    }

    throw new Error('Hume TTS job timed out');
  }

  // Stream TTS (for real-time applications)
  async streamTTS(text, options = {}) {
    const streaming = process.env.TTS_STREAMING === 'true';
    
    if (!streaming) {
      return this.textToSpeech(text, options);
    }

    // For streaming, we'll return a readable stream
    const { Readable } = require('stream');
    const audioBuffer = await this.textToSpeech(text, options);
    const stream = new Readable();
    stream.push(audioBuffer);
    stream.push(null);
    return stream;
  }
}

module.exports = new TTSService(); 