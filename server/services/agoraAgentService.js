const axios = require('axios');

class AgoraAgentService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID;
    this.customerId = process.env.AGORA_CUSTOMER_ID;
    this.customerSecret = process.env.AGORA_CUSTOMER_SECRET;
    this.baseUrl = process.env.AGORA_API_BASE_URL || 'https://api.agora.io/api/conversational-ai-agent/v2';
    
    this.activeAgents = new Map(); // Track active agents
  }

  // Get authentication headers
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

  // Create an Agora Conversational AI agent
  async createAgent(agentConfig) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/join`;

    try {
      const response = await axios.post(url, agentConfig, { headers });
      
      console.log('🔍 Agora API Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.agent_id) {
        console.log(`✅ Created Agora agent ${response.data.agent_id}`);
        return response.data;
      } else if (response.data && response.data.agentId) {
        console.log(`✅ Created Agora agent ${response.data.agentId}`);
        return response.data;
      } else {
        console.error('❌ No agent ID in response:', response.data);
        throw new Error('Failed to create agent - no agentId in response');
      }
    } catch (error) {
      console.error('Error creating Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to create agent: ${error.response?.data?.message || error.message}`);
    }
  }

  // Update an existing agent
  async updateAgent(agentId, updatePayload) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}/update`;

    try {
      const response = await axios.post(url, updatePayload, { headers });
      console.log(`✅ Updated Agora agent ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Error updating Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to update agent: ${error.response?.data?.message || error.message}`);
    }
  }

  // Stop an agent
  async stopAgent(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${agentId}/leave`;

    try {
      const response = await axios.post(url, {}, { headers });
      console.log(`✅ Stopped Agora agent ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Error stopping Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to stop agent: ${error.response?.data?.message || error.message}`);
    }
  }

  // Query agent status
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
      console.error('Error querying Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to query agent: ${error.response?.data?.message || error.message}`);
    }
  }

  // List all agents
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
      console.error('Error listing Agora agents:', error.response?.data || error.message);
      throw new Error(`Failed to list agents: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get agent history
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
      console.error('Error getting Agora agent history:', error.response?.data || error.message);
      throw new Error(`Failed to get agent history: ${error.response?.data?.message || error.message}`);
    }
  }

  // Broadcast message to agent
  // Send text message to agent
  async sendTextMessage(agentId, text, priority = 'INTERRUPT', interruptable = true, uuid = null) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const messageUuid = uuid || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${encodeURIComponent(agentId)}/chat`;

    const body = {
      messageType: 'text',
      text,
      priority,
      interruptable,
      uuid: messageUuid
    };

    try {
      const response = await axios.post(url, body, { headers });
      console.log(`✅ Sent text message to agent ${agentId}: ${text}`);
      return response.data;
    } catch (error) {
      console.error('Error sending text message to Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to send text message: ${error.response?.data?.message || error.message}`);
    }
  }

  // Send image message to agent
  async sendImageMessage(agentId, imageUrl, uuid = null) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const messageUuid = uuid || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${encodeURIComponent(agentId)}/chat`;

    const body = {
      messageType: 'image',
      url: imageUrl,
      uuid: messageUuid
    };

    try {
      const response = await axios.post(url, body, { headers });
      console.log(`✅ Sent image message to agent ${agentId}: ${imageUrl}`);
      return response.data;
    } catch (error) {
      console.error('Error sending image message to Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to send image message: ${error.response?.data?.message || error.message}`);
    }
  }

  // Legacy broadcast method for backward compatibility
  async broadcastMessage(agentId, text, priority = 'INTERRUPT', interruptable = true) {
    return this.sendTextMessage(agentId, text, priority, interruptable);
  }

  // Interrupt agent
  async interruptAgent(agentId) {
    if (!this.appId) {
      throw new Error('Agora App ID is required');
    }

    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/projects/${this.appId}/agents/${encodeURIComponent(agentId)}/interrupt`;

    try {
      const response = await axios.post(url, {}, { headers });
      console.log(`✅ Interrupted agent ${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Error interrupting Agora agent:', error.response?.data || error.message);
      throw new Error(`Failed to interrupt agent: ${error.response?.data?.message || error.message}`);
    }
  }

  // Generate agent configuration for onboarding
  generateOnboardingAgentConfig(channelName, agentUid, clientUid, prompt) {
    return {
      agent: {
        name: "Welcome Bot",
        avatar: process.env.AVATAR_IMAGE_URL || "",
        prompt: prompt,
        llm: {
          provider: "openai",
          model: process.env.OPENAI_MODEL || "gpt-4",
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000
        },
        voice: {
          provider: process.env.TTS_VENDOR || "microsoft",
          voice: process.env.MICROSOFT_TTS_VOICE || "en-US-JennyNeural"
        },
        asr: {
          provider: process.env.ASR_VENDOR || "agora",
          language: process.env.AGORA_ASR_LANGUAGE || "en-US"
        }
      },
      user: {
        name: `User_${clientUid}`,
        avatar: ""
      },
      conversation: {
        id: `conv_${channelName}_${Date.now()}`,
        title: "User Onboarding Session"
      },
      properties: {
        channel_name: channelName,
        agent_rtc_uid: agentUid,
        remote_rtc_uids: [clientUid],
        idle_timeout: 30
      }
    };
  }

  // Track active agent
  trackAgent(userId, agentId) {
    this.activeAgents.set(userId, agentId);
  }

  // Get tracked agent
  getTrackedAgent(userId) {
    return this.activeAgents.get(userId);
  }

  // Remove tracked agent
  removeTrackedAgent(userId) {
    this.activeAgents.delete(userId);
  }

  // Get all tracked agents
  getTrackedAgents() {
    return Array.from(this.activeAgents.entries());
  }

  // Validate configuration
  validateConfig() {
    const errors = [];
    
    if (!this.appId) {
      errors.push('AGORA_APP_ID is required');
    }
    
    if (!this.customerId) {
      errors.push('AGORA_CUSTOMER_ID is required');
    }
    
    if (!this.customerSecret) {
      errors.push('AGORA_CUSTOMER_SECRET is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get configuration status
  getConfigStatus() {
    const validation = this.validateConfig();
    return {
      configured: validation.isValid,
      errors: validation.errors,
      activeAgents: this.activeAgents.size
    };
  }
}

module.exports = new AgoraAgentService(); 