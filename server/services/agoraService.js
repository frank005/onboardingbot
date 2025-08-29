const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const axios = require('axios');

class AgoraService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE;
    this.customerId = process.env.AGORA_CUSTOMER_ID;
    this.customerSecret = process.env.AGORA_CUSTOMER_SECRET;
    this.baseUrl = process.env.AGORA_API_BASE_URL || 'https://api.agora.io/api/conversational-ai-agent/v2';
    
    if (!this.appId) {
      console.warn('⚠️  Agora App ID not configured. Voice features will be disabled.');
    }
    
    if (!this.customerId || !this.customerSecret) {
      console.warn('⚠️  Agora Customer ID and Secret not configured. Conversational AI features will be disabled.');
    }
  }

  // Get authentication headers for Agora API
  getAuthHeaders() {
    if (!this.customerId || !this.customerSecret) {
      throw new Error('Agora Customer ID and Secret are required');
    }
    const encoded = Buffer.from(`${this.customerId}:${this.customerSecret}`).toString('base64');
    return {
      "Content-Type": "application/json",
      "Authorization": `Basic ${encoded}`
    };
  }

  // Create Conversational AI Agent
  async createAgent(agentConfig) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/join`;

    try {
      const response = await axios.post(url, agentConfig, { headers });
      return response.data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create agent: ${error.response?.data || error.message}`);
    }
  }

  // Update Conversational AI Agent
  async updateAgent(agentId, updatePayload) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}/update`;

    try {
      const response = await axios.post(url, updatePayload, { headers });
      return response.data;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error(`Failed to update agent: ${error.response?.data || error.message}`);
    }
  }

  // Stop Conversational AI Agent
  async stopAgent(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}/leave`;

    try {
      const response = await axios.post(url, {}, { headers });
      return response.data;
    } catch (error) {
      console.error('Error stopping agent:', error);
      throw new Error(`Failed to stop agent: ${error.response?.data || error.message}`);
    }
  }

  // Query Agent Status
  async queryAgent(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Error querying agent:', error);
      throw new Error(`Failed to query agent: ${error.response?.data || error.message}`);
    }
  }

  // List All Agents
  async listAgents() {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Error listing agents:', error);
      throw new Error(`Failed to list agents: ${error.response?.data || error.message}`);
    }
  }

  // Get Agent History
  async getAgentHistory(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}/history`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting agent history:', error);
      throw new Error(`Failed to get agent history: ${error.response?.data || error.message}`);
    }
  }

  // Broadcast Message to Agent
  async broadcastMessage(agentId, text, priority = 'INTERRUPT', interruptable = true) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${encodeURIComponent(agentId)}/speak`;
    const body = { text, priority, interruptable };

    try {
      const response = await axios.post(url, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw new Error(`Failed to broadcast message: ${error.response?.data || error.message}`);
    }
  }

  // Interrupt Agent
  async interruptAgent(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${encodeURIComponent(agentId)}/interrupt`;

    try {
      const response = await axios.post(url, {}, { headers });
      return response.data;
    } catch (error) {
      console.error('Error interrupting agent:', error);
      throw new Error(`Failed to interrupt agent: ${error.response?.data || error.message}`);
    }
  }

  // Generate Agora token for voice communication
  generateToken(channelName, uid, role = RtcRole.PUBLISHER, privilegeExpiredTs = 3600) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expirationTime = currentTimestamp + privilegeExpiredTs;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      expirationTime
    );

    return {
      token,
      appId: this.appId,
      channelName,
      uid,
      role,
      privilegeExpiredTs: expirationTime
    };
  }

  // Generate token for bot voice
  generateBotToken(channelName, botUid = 0) {
    return this.generateToken(channelName, botUid, RtcRole.PUBLISHER);
  }

  // Generate token for user voice
  generateUserToken(channelName, uid) {
    return this.generateToken(channelName, uid, RtcRole.PUBLISHER);
  }

  // Validate Agora configuration
  validateConfig() {
    const required = ['AGORA_APP_ID', 'AGORA_APP_CERTIFICATE', 'AGORA_CUSTOMER_ID', 'AGORA_CUSTOMER_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing Agora configuration: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  }

  // Get Agora configuration
  getConfig() {
    return {
      appId: this.appId,
      customerId: this.customerId,
      baseUrl: this.baseUrl,
      isConfigured: this.validateConfig(),
      voiceEnabled: this.validateConfig()
    };
  }

  // Create voice channel for conversation
  createVoiceChannel(userId, conversationId) {
    const channelName = `conversation_${conversationId}`;
    const userToken = this.generateUserToken(channelName, userId);
    const botToken = this.generateBotToken(channelName);
    
    return {
      channelName,
      userToken,
      botToken,
      userId,
      conversationId
    };
  }

  // Join voice channel
  async joinVoiceChannel(userId, channelName) {
    try {
      const token = this.generateUserToken(channelName, userId);
      
      return {
        success: true,
        channelName,
        token: token.token,
        uid: userId
      };
    } catch (error) {
      console.error('Error joining voice channel:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Leave voice channel
  async leaveVoiceChannel(userId, channelName) {
    try {
      // In a real implementation, you would handle the actual leaving logic
      // For now, we just return success
      return {
        success: true,
        channelName,
        userId
      };
    } catch (error) {
      console.error('Error leaving voice channel:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process voice input (placeholder for voice-to-text)
  async processVoiceInput(audioData, userId) {
    try {
      // In a real implementation, this would:
      // 1. Convert audio to text using speech recognition
      // 2. Process the text through the AI service
      // 3. Return the response
      
      // For demo purposes, we'll return a placeholder
      return {
        success: true,
        text: 'Voice input processed successfully',
        userId
      };
    } catch (error) {
      console.error('Error processing voice input:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate voice response (placeholder for text-to-speech)
  async generateVoiceResponse(text, userId) {
    try {
      // In a real implementation, this would:
      // 1. Convert text to speech
      // 2. Stream the audio back to the user
      // 3. Handle voice synthesis
      
      // For demo purposes, we'll return a placeholder
      return {
        success: true,
        audioUrl: null, // Would be the generated audio URL
        text,
        userId
      };
    } catch (error) {
      console.error('Error generating voice response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get voice analytics
  getVoiceAnalytics(channelName) {
    // In a real implementation, this would fetch analytics from Agora
    return {
      channelName,
      participants: 0,
      audioLevel: 0,
      quality: 'good',
      timestamp: new Date().toISOString()
    };
  }

  // Mute/unmute user
  async toggleMute(userId, channelName, muted) {
    try {
      // In a real implementation, this would control the actual mute state
      return {
        success: true,
        userId,
        channelName,
        muted
      };
    } catch (error) {
      console.error('Error toggling mute:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get voice settings
  getVoiceSettings() {
    return {
      enabled: this.validateConfig(),
      sampleRate: 48000,
      channels: 1,
      bitrate: 128,
      codec: 'opus'
    };
  }

  // Update voice settings
  updateVoiceSettings(settings) {
    // In a real implementation, this would update the voice configuration
    return {
      success: true,
      settings: {
        ...this.getVoiceSettings(),
        ...settings
      }
    };
  }
}

module.exports = new AgoraService(); 