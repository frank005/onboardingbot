const WebSocket = require('ws');
const axios = require('axios');

class MLLMService {
  constructor() {
    this.provider = process.env.MLLM_PROVIDER || 'openai';
    this.model = process.env.MLLM_MODEL || 'gpt-4o';
    this.streaming = process.env.MLLM_STREAMING === 'true';
    this.turnDetection = process.env.MLLM_TURN_DETECTION === 'true';
    this.vadType = process.env.MLLM_VAD_TYPE || 'semantic';
    this.interruptMode = process.env.MLLM_INTERRUPT_MODE || 'interrupt';
    this.silenceDuration = parseInt(process.env.MLLM_SILENCE_DURATION) || 640;
    this.prefixPadding = parseInt(process.env.MLLM_PREFIX_PADDING) || 800;
    this.conversationHistory = parseInt(process.env.MLLM_CONVERSATION_HISTORY) || 32;
    this.eagerness = process.env.MLLM_EAGERNESS || 'auto';
    
    this.activeConnections = new Map();
    this.conversationStates = new Map();
  }

  // Get MLLM status
  getMLLMStatus() {
    return {
      provider: this.provider,
      model: this.model,
      streaming: this.streaming,
      turnDetection: this.turnDetection,
      vadType: this.vadType,
      interruptMode: this.interruptMode,
      silenceDuration: this.silenceDuration,
      prefixPadding: this.prefixPadding,
      conversationHistory: this.conversationHistory,
      eagerness: this.eagerness,
      configured: this.isConfigured()
    };
  }

  // Check if MLLM is configured
  isConfigured() {
    switch (this.provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      default:
        return false;
    }
  }

  // Initialize conversation state
  initializeConversation(conversationId) {
    const state = {
      conversationId,
      messages: [],
      currentTurn: null,
      isListening: false,
      isSpeaking: false,
      lastActivity: Date.now(),
      vadState: {
        isActive: false,
        lastVoiceActivity: null,
        silenceStart: null
      }
    };
    
    this.conversationStates.set(conversationId, state);
    return state;
  }

  // Get conversation state
  getConversationState(conversationId) {
    if (!this.conversationStates.has(conversationId)) {
      return this.initializeConversation(conversationId);
    }
    return this.conversationStates.get(conversationId);
  }

  // Start multimodal conversation
  async startConversation(conversationId, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('MLLM is not properly configured');
    }

    try {
      switch (this.provider) {
        case 'openai':
          return await this.startOpenAIConversation(conversationId, options);
        default:
          throw new Error(`Unsupported MLLM provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('Error starting MLLM conversation:', error);
      throw error;
    }
  }

  // Start OpenAI Realtime conversation
  async startOpenAIConversation(conversationId, options = {}) {
    try {
      const ws = new WebSocket('wss://api.openai.com/v1/audio/speech', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const connection = {
        ws,
        conversationId,
        status: 'connecting',
        options
      };

      this.activeConnections.set(conversationId, connection);

      // Set up WebSocket event handlers
      ws.on('open', () => {
        console.log(`✅ MLLM WebSocket connected for conversation ${conversationId}`);
        connection.status = 'connected';
        
        // Send initial configuration
        this.sendOpenAIConfig(conversationId, options);
      });

      ws.on('message', (data) => {
        this.handleOpenAIMessage(conversationId, data);
      });

      ws.on('error', (error) => {
        console.error(`❌ MLLM WebSocket error for conversation ${conversationId}:`, error);
        connection.status = 'error';
      });

      ws.on('close', () => {
        console.log(`🔌 MLLM WebSocket closed for conversation ${conversationId}`);
        connection.status = 'closed';
        this.activeConnections.delete(conversationId);
      });

      return {
        conversationId,
        status: 'connecting',
        provider: 'openai'
      };

    } catch (error) {
      console.error('Error starting OpenAI conversation:', error);
      throw error;
    }
  }

  // Send OpenAI configuration
  sendOpenAIConfig(conversationId, options) {
    const connection = this.activeConnections.get(conversationId);
    if (!connection || connection.status !== 'connected') {
      return;
    }

    const config = {
      type: 'config',
      model: this.model,
      turn_detection: this.turnDetection,
      vad_type: this.vadType,
      interrupt_mode: this.interruptMode,
      silence_duration: this.silenceDuration,
      prefix_padding: this.prefixPadding,
      conversation_history: this.conversationHistory,
      eagerness: this.eagerness,
      ...options
    };

    connection.ws.send(JSON.stringify(config));
  }

  // Handle OpenAI messages
  handleOpenAIMessage(conversationId, data) {
    try {
      const message = JSON.parse(data);
      const state = this.getConversationState(conversationId);

      switch (message.type) {
        case 'start':
          console.log(`🎤 MLLM started listening for conversation ${conversationId}`);
          state.isListening = true;
          state.vadState.isActive = true;
          break;

        case 'stop':
          console.log(`🔇 MLLM stopped listening for conversation ${conversationId}`);
          state.isListening = false;
          state.vadState.isActive = false;
          break;

        case 'transcript':
          this.handleTranscript(conversationId, message);
          break;

        case 'response':
          this.handleResponse(conversationId, message);
          break;

        case 'error':
          console.error(`❌ MLLM error for conversation ${conversationId}:`, message.error);
          break;

        default:
          console.log(`📨 Unknown MLLM message type: ${message.type}`);
      }

      state.lastActivity = Date.now();
    } catch (error) {
      console.error('Error handling MLLM message:', error);
    }
  }

  // Handle transcript from MLLM
  handleTranscript(conversationId, message) {
    const state = this.getConversationState(conversationId);
    
    // Add transcript to conversation history
    state.messages.push({
      role: 'user',
      content: message.transcript,
      timestamp: Date.now(),
      type: 'transcript'
    });

    // Emit transcript event
    this.emit('transcript', {
      conversationId,
      transcript: message.transcript,
      isFinal: message.is_final || false
    });

    console.log(`📝 MLLM transcript for conversation ${conversationId}: ${message.transcript}`);
  }

  // Handle response from MLLM
  handleResponse(conversationId, message) {
    const state = this.getConversationState(conversationId);
    
    // Add response to conversation history
    state.messages.push({
      role: 'assistant',
      content: message.response,
      timestamp: Date.now(),
      type: 'response'
    });

    // Emit response event
    this.emit('response', {
      conversationId,
      response: message.response,
      audio: message.audio,
      isFinal: message.is_final || false
    });

    console.log(`🤖 MLLM response for conversation ${conversationId}: ${message.response}`);
  }

  // Send audio to MLLM
  async sendAudio(conversationId, audioBuffer) {
    const connection = this.activeConnections.get(conversationId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('MLLM connection not available');
    }

    try {
      const audioMessage = {
        type: 'audio',
        data: audioBuffer.toString('base64'),
        format: 'wav',
        sample_rate: 16000
      };

      connection.ws.send(JSON.stringify(audioMessage));
      console.log(`🎵 Sent audio to MLLM for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error sending audio to MLLM:', error);
      throw error;
    }
  }

  // Send image to MLLM
  async sendImage(conversationId, imageBuffer) {
    const connection = this.activeConnections.get(conversationId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('MLLM connection not available');
    }

    try {
      const imageMessage = {
        type: 'image',
        data: imageBuffer.toString('base64'),
        format: 'jpeg'
      };

      connection.ws.send(JSON.stringify(imageMessage));
      console.log(`🖼️ Sent image to MLLM for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error sending image to MLLM:', error);
      throw error;
    }
  }

  // Send text to MLLM
  async sendText(conversationId, text) {
    const connection = this.activeConnections.get(conversationId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('MLLM connection not available');
    }

    try {
      const textMessage = {
        type: 'text',
        content: text
      };

      connection.ws.send(JSON.stringify(textMessage));
      console.log(`📝 Sent text to MLLM for conversation ${conversationId}: ${text}`);
    } catch (error) {
      console.error('Error sending text to MLLM:', error);
      throw error;
    }
  }

  // Stop conversation
  async stopConversation(conversationId) {
    const connection = this.activeConnections.get(conversationId);
    if (connection) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      this.activeConnections.delete(conversationId);
    }

    this.conversationStates.delete(conversationId);
    console.log(`🛑 Stopped MLLM conversation ${conversationId}`);
  }

  // Get conversation status
  getConversationStatus(conversationId) {
    const connection = this.activeConnections.get(conversationId);
    const state = this.conversationStates.get(conversationId);

    return {
      conversationId,
      status: connection?.status || 'not_found',
      isListening: state?.isListening || false,
      isSpeaking: state?.isSpeaking || false,
      messageCount: state?.messages?.length || 0,
      lastActivity: state?.lastActivity || null
    };
  }

  // Event emitter for MLLM events
  emit(event, data) {
    // In a real implementation, you'd use a proper event emitter
    // For now, we'll just log the events
    console.log(`📡 MLLM Event: ${event}`, data);
  }

  // Get MLLM configuration for agent
  getMLLMConfig() {
    if (!this.isConfigured()) {
      return null;
    }

    return {
      mllm_provider: this.provider,
      mllm_model: this.model,
      mllm_streaming: this.streaming,
      mllm_turn_detection: this.turnDetection,
      mllm_vad_type: this.vadType,
      mllm_interrupt_mode: this.interruptMode,
      mllm_silence_duration: this.silenceDuration,
      mllm_prefix_padding: this.prefixPadding,
      mllm_conversation_history: this.conversationHistory,
      mllm_eagerness: this.eagerness
    };
  }
}

module.exports = new MLLMService();
