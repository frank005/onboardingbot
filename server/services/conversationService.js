const aiService = require('./aiService');
const userService = require('./userService');
const agoraAgentService = require('./agoraAgentService');
const configService = require('./configService');

class ConversationService {
  constructor() {
    this.activeConversations = new Map();
    this.agoraFallbackEnabled = process.env.AGORA_FALLBACK_ENABLED === 'true';
  }

  // Start a new conversation
  async startConversation(userId) {
    try {
      // Initialize AI conversation
      const aiState = aiService.initializeConversation(userId);
      
      // Create user record
      const user = await userService.createUser(userId);
      
      // Store conversation state
      this.activeConversations.set(userId, {
        userId,
        startTime: new Date(),
        aiState,
        user,
        status: 'active',
        useAgora: true, // Always use Agora - no OpenAI fallback
        messages: []
      });

      // Only use Agora - no OpenAI fallback
      if (this.isAgoraConfigured()) {
        try {
          const response = await this.startAgoraConversation(userId);
          console.log('✅ Using Agora ConvoAI for conversation');
          return response;
        } catch (agoraError) {
          console.error('❌ Agora ConvoAI failed:', agoraError.message);
          throw new Error('Agora ConvoAI failed to start conversation. Please check your configuration.');
        }
      } else {
        console.error('❌ Agora not configured');
        throw new Error('Agora ConvoAI is not configured. Please check your environment variables.');
      }

    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }

  // Check if Agora is properly configured
  isAgoraConfigured() {
    return !!(configService.agora.appId && 
              configService.agora.customerId && 
              configService.agora.customerSecret);
  }

  // Start conversation with Agora ConvoAI
  async startAgoraConversation(userId) {
    try {
      // Check for existing conversation but don't automatically stop agents
      const existingConversation = this.activeConversations.get(userId);
      console.log(`🔍 Checking for existing conversation for userId: ${userId}`);
      console.log(`🔍 Existing conversation:`, existingConversation ? 'Found' : 'Not found');
      
      if (existingConversation?.agoraAgentId) {
        console.log(`ℹ️ Found existing agent ${existingConversation.agoraAgentId} for userId: ${userId}`);
        console.log(`ℹ️ Reusing existing conversation instead of creating new agent`);
        
        // Return the existing conversation instead of creating a new agent
        return {
          success: true,
          message: existingConversation.aiState?.greeting || "Welcome back! How can I help you?",
          conversationId: userId,
          currentTopic: existingConversation.aiState?.currentTopic || 'platform_overview',
          user: existingConversation?.user,
          agoraAgentId: existingConversation.agoraAgentId,
          useAgora: true,
          provider: 'Agora ConvoAI (existing)'
        };
      } else {
        console.log(`✅ No existing conversation found for userId: ${userId}, creating new agent`);
      }

      // Create Agora agent configuration using the correct format from the demo
      const agentConfig = {
        name: `agent-${userId}-${Date.now()}`,
        properties: {
          channel: configService.agora.channel,
          token: "",
          agent_rtc_uid: "8888",
          remote_rtc_uids: ["*"],
          enable_string_uid: false,
          idle_timeout: 300,
          agent_rtm_uid: "8888",
          advanced_features: {
            enable_rtm: true
          },
          asr: configService.getASRConfig(),
          parameters: {
            audio_scenario: "chorus",
            data_channel: "rtm",
            enable_metrics: true,
            enable_error_message: true,
            transcript: {
              enable: true
            }
          },
          llm: {
            url: "https://api.openai.com/v1/chat/completions",
            api_key: configService.openai.apiKey,
            system_messages: [
              {
                role: "system",
                content: this.generateAgoraSystemMessage()
              }
            ],
            greeting_message: "Hi! I'm your Welcome Bot. I'm here to help you get started with our platform. Let me guide you through the onboarding process.",
            failure_message: "I'm having trouble connecting right now. Please try again in a moment.",
            max_history: 32,
            input_modalities: ["text"],
            output_modalities: ["text"],
            params: {
              model: configService.openai.model,
              temperature: configService.openai.temperature,
              max_tokens: configService.openai.maxTokens
            }
          },
          tts: configService.getTTSConfig()
        }
      };

      // Create Agora agent with retry logic for conflicts
      let agentResponse;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          agentResponse = await agoraAgentService.createAgent(agentConfig);
          console.log('✅ Created Agora agent:', agentResponse.agent_id || agentResponse.agentId);
          break;
        } catch (error) {
          if (error.message.includes('409') || error.message.includes('TaskConflict')) {
            retryCount++;
            console.warn(`⚠️ Agent conflict detected, retry ${retryCount}/${maxRetries}...`);
            
            if (retryCount < maxRetries) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try to stop any existing agents with the same name
              try {
                console.log('🔄 Attempting to stop conflicting agents...');
                // Note: This would require an additional API call to list and stop agents
                // For now, we'll just retry with a delay
              } catch (stopError) {
                console.warn('⚠️ Could not stop conflicting agents:', stopError.message);
              }
            } else {
              throw new Error(`Failed to create agent after ${maxRetries} retries due to conflicts`);
            }
          } else {
            throw error;
          }
        }
      }
      
      // Store agent ID in conversation state
      const conversation = this.activeConversations.get(userId);
      if (conversation) {
        conversation.agoraAgentId = agentResponse.agent_id || agentResponse.agentId;
        conversation.useAgora = true;
      }

      return {
        success: true,
        message: agentConfig.properties.llm.greeting_message,
        conversationId: userId,
        currentTopic: 'platform_overview',
        user: conversation?.user,
        agoraAgentId: agentResponse.agent_id || agentResponse.agentId,
        useAgora: true,
        provider: 'agora'
      };

    } catch (error) {
      console.error('Error starting Agora conversation:', error);
      throw error;
    }
  }

  // Start conversation with OpenAI (fallback)
  async startOpenAIConversation(userId) {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
      return {
        success: true,
        message: "Hi! I'm your Welcome Bot. I'm here to help you get started with our platform. However, I notice that the OpenAI API key isn't configured yet. Please set up your OPENAI_API_KEY in the .env file to enable full conversation capabilities.",
        conversationId: userId,
        currentTopic: 'platform_overview',
        user: this.activeConversations.get(userId)?.user,
        demoMode: true,
        useAgora: false
      };
    }

    // Generate welcome message using OpenAI
    const welcomeResponse = await aiService.processMessage(userId, 'Hello');
    
    // Update conversation state
    const conversation = this.activeConversations.get(userId);
    if (conversation) {
      conversation.aiState = {
        ...conversation.aiState,
        currentTopic: welcomeResponse.currentTopic,
        completedTopics: welcomeResponse.completedTopics || [],
        formData: welcomeResponse.formData || {},
        detectedInfo: welcomeResponse.detectedInfo || {}
      };
    }
    
    return {
      success: true,
      message: welcomeResponse.message,
      conversationId: userId,
      currentTopic: welcomeResponse.currentTopic,
      completedTopics: welcomeResponse.completedTopics || [],
      formData: welcomeResponse.formData || {},
      detectedInfo: welcomeResponse.detectedInfo || {},
      user: this.activeConversations.get(userId)?.user,
      useAgora: false
    };
  }

  // Process user message
  async processUserMessage(data) {
    const { userId, message, conversationId } = data;
    
    try {
      // Get conversation state
      const conversation = this.activeConversations.get(userId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Extract information from user message
      const extractedInfo = this.extractUserInformation(message);
      if (extractedInfo && Object.keys(extractedInfo).length > 0) {
        await userService.updateDetectedInfo(userId, extractedInfo);
        console.log('✅ Extracted user information:', extractedInfo);
      }

      // Try Agora first if available
      if (conversation.useAgora && conversation.agoraAgentId) {
        try {
          const response = await this.processAgoraMessage(userId, message);
          return response;
        } catch (agoraError) {
          console.warn('⚠️ Agora message processing failed, falling back to OpenAI:', agoraError.message);
          
          if (this.agoraFallbackEnabled) {
            return await this.processOpenAIMessage(userId, message);
          } else {
            throw new Error('Agora ConvoAI is required but failed to process message');
          }
        }
      } else {
        // Use OpenAI directly
        return await this.processOpenAIMessage(userId, message);
      }

    } catch (error) {
      console.error('Error processing user message:', error);
      throw error;
    }
  }

  // Process message with Agora ConvoAI
  async processAgoraMessage(userId, message) {
    const conversation = this.activeConversations.get(userId);
    if (!conversation?.agoraAgentId) {
      throw new Error('No Agora agent available');
    }

    try {
      // Extract user information from message
      const detectedInfo = this.extractUserInformation(message);
      if (Object.keys(detectedInfo).length > 0) {
        // Update user profile with detected information
        await userService.updateDetectedInfo(userId, detectedInfo);
        conversation.detectedInfo = { ...conversation.detectedInfo, ...detectedInfo };
      }

      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // For Agora ConvoAI, messages are sent via RTM on the client side
      // The server just needs to acknowledge the message and let the client handle RTM
      return {
        success: true,
        message: "Message sent successfully. Waiting for agent response...",
        currentTopic: conversation.currentTopic,
        completedTopics: conversation.completedTopics,
        formData: conversation.formData,
        detectedInfo: conversation.detectedInfo,
        useAgora: true,
        agoraAgentId: conversation.agoraAgentId,
        rtmEnabled: true
      };

    } catch (error) {
      console.error('Error processing Agora message:', error);
      throw error;
    }
  }

  // Process message with OpenAI (fallback) - DISABLED
  async processOpenAIMessage(userId, message) {
    throw new Error('OpenAI processing is disabled. Only Agora ConvoAI is supported.');
  }

  // Extract user information from conversational messages
  extractUserInformation(message) {
    const extractedInfo = {};
    const lowerMessage = message.toLowerCase();

    // Extract name
    const namePatterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i,
      /call me (\w+)/i,
      /name's (\w+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extractedInfo.name = match[1];
        break;
      }
    }

    // Extract birthday
    const birthdayPatterns = [
      /born on (\w+ \d{1,2},? \d{4})/i,
      /birthday is (\w+ \d{1,2},? \d{4})/i,
      /born (\w+ \d{1,2},? \d{4})/i,
      /(\w+ \d{1,2},? \d{4})/i
    ];
    
    for (const pattern of birthdayPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extractedInfo.birthday = match[1];
        break;
      }
    }

    // Extract age
    const ageMatch = message.match(/(\d+)\s*(?:years old|yo)/i);
    if (ageMatch) {
      extractedInfo.age = parseInt(ageMatch[1]);
    }

    // Extract interests/hobbies
    const interestPatterns = [
      /i like (.+)/i,
      /i enjoy (.+)/i,
      /i love (.+)/i,
      /my hobbies are (.+)/i,
      /i'm interested in (.+)/i
    ];
    
    for (const pattern of interestPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extractedInfo.interests = match[1].split(/[,;]/).map(s => s.trim());
        break;
      }
    }

    // Extract experience level
    if (lowerMessage.includes('beginner') || lowerMessage.includes('new') || lowerMessage.includes('just starting')) {
      extractedInfo.experienceLevel = 'beginner';
    } else if (lowerMessage.includes('intermediate') || lowerMessage.includes('some experience')) {
      extractedInfo.experienceLevel = 'intermediate';
    } else if (lowerMessage.includes('expert') || lowerMessage.includes('advanced') || lowerMessage.includes('professional')) {
      extractedInfo.experienceLevel = 'expert';
    }

    // Extract gender
    if (lowerMessage.includes('male') || lowerMessage.includes('man') || lowerMessage.includes('guy')) {
      extractedInfo.gender = 'male';
    } else if (lowerMessage.includes('female') || lowerMessage.includes('woman') || lowerMessage.includes('girl')) {
      extractedInfo.gender = 'female';
    }

    return extractedInfo;
  }

  // Generate system message for Agora agent
  generateAgoraSystemMessage() {
    return `You are a friendly and helpful conversational AI assistant designed to help new users onboard to our platform. 

Your personality: friendly and helpful

IMPORTANT RULES:
1. Keep responses concise and natural
2. Always be helpful and encouraging
3. Collect user information when appropriate
4. Guide users through the onboarding process
5. Detect and note user preferences, interests, and skill levels
6. Respond in a conversational tone
7. Update user profile data during conversation
8. Extract and store detected information about the user

ONBOARDING FLOW:
1. Platform Overview: Ask if user wants platform overview, explain features briefly
2. Profile Setup: Collect name, birthday, bio, interests, experience level
3. Additional Conversation: Ask for other questions, engage naturally

DATA COLLECTION:
- Extract user information from conversations
- Update user profiles in real-time
- Store detected preferences and interests
- Note technical skill levels and experience`;
  }

  // Check if conversation is complete
  checkConversationComplete(response) {
    const { completedTopics, currentTopic } = response;
    const requiredTopics = ['platform_overview', 'onboarding_form', 'additional_conversation'];
    
    return requiredTopics.every(topic => completedTopics.includes(topic));
  }

  // Upgrade conversation to use Agora (when RTM is enabled)
  async upgradeToAgora(userId) {
    const conversation = this.activeConversations.get(userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.useAgora) {
      return { success: true, message: 'Already using Agora' };
    }

    if (!this.isAgoraConfigured()) {
      throw new Error('Agora is not properly configured');
    }

    try {
      // Create Agora agent using the same configuration as startAgoraConversation
      const agentConfig = {
        name: `agent-${userId}-${Date.now()}`,
        properties: {
          channel: configService.agora.channel,
          token: "",
          agent_rtc_uid: "8888",
          remote_rtc_uids: ["*"],
          enable_string_uid: false,
          idle_timeout: 300,
          agent_rtm_uid: "8888",
          advanced_features: {
            enable_rtm: true
          },
          asr: configService.getASRConfig(),
          parameters: {
            audio_scenario: "chorus",
            data_channel: "rtm",
            enable_metrics: true,
            enable_error_message: true,
            transcript: {
              enable: true
            }
          },
          llm: {
            url: "https://api.openai.com/v1/chat/completions",
            api_key: configService.openai.apiKey,
            system_messages: [
              {
                role: "system",
                content: this.generateAgoraSystemMessage()
              }
            ],
            greeting_message: "Hi! I'm your Welcome Bot. I'm here to help you get started with our platform. Let me guide you through the onboarding process.",
            failure_message: "I'm having trouble connecting right now. Please try again in a moment.",
            max_history: 32,
            input_modalities: ["text"],
            output_modalities: ["text"],
            params: {
              model: configService.openai.model,
              temperature: configService.openai.temperature,
              max_tokens: configService.openai.maxTokens
            }
          },
          tts: configService.getTTSConfig()
        }
      };

      const agentResponse = await agoraAgentService.createAgent(agentConfig);
      
      // Update conversation state
      conversation.agoraAgentId = agentResponse.agent_id || agentResponse.agentId;
      conversation.useAgora = true;

      return {
        success: true,
        message: 'Upgraded to Agora ConvoAI',
        agoraAgentId: agentResponse.agent_id || agentResponse.agentId,
        useAgora: true,
        provider: 'agora'
      };

    } catch (error) {
      console.error('Error upgrading to Agora:', error);
      throw error;
    }
  }

  // Stop conversation
  async stopConversation(userId) {
    console.log(`🛑 Stopping conversation for userId: ${userId}`);
    const conversation = this.activeConversations.get(userId);
    console.log(`🔍 Found conversation:`, conversation ? 'Yes' : 'No');
    
    if (conversation?.agoraAgentId) {
      try {
        console.log(`🔄 Stopping Agora agent ${conversation.agoraAgentId} for userId: ${userId}`);
        await agoraAgentService.stopAgent(conversation.agoraAgentId);
        console.log(`✅ Stopped Agora agent ${conversation.agoraAgentId} for userId: ${userId}`);
      } catch (error) {
        console.error(`❌ Error stopping Agora agent ${conversation.agoraAgentId} for userId: ${userId}:`, error);
      }
    } else {
      console.log(`ℹ️ No Agora agent to stop for userId: ${userId}`);
    }
    
    this.activeConversations.delete(userId);
    console.log(`🗑️ Deleted conversation for userId: ${userId}`);
    return { success: true };
  }

  // Get conversation status
  getConversationStatus(userId) {
    const conversation = this.activeConversations.get(userId);
    return conversation ? {
      status: conversation.status,
      useAgora: conversation.useAgora,
      agoraAgentId: conversation.agoraAgentId,
      startTime: conversation.startTime
    } : null;
  }

  // Get conversation summary
  async getConversationSummary(userId) {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const summary = aiService.getConversationSummary(userId);
      const user = await userService.getUser(userId);

      return {
        ...summary,
        user,
        conversationDuration: conversation.endTime ? 
          (conversation.endTime - conversation.startTime) / 1000 : null
      };

    } catch (error) {
      console.error('Error getting conversation summary:', error);
      throw new Error('Failed to get conversation summary');
    }
  }

  // Reset conversation
  async resetConversation(userId) {
    try {
      // Reset AI conversation
      aiService.resetConversation(userId);
      
      // Remove from active conversations
      this.activeConversations.delete(userId);
      
      // Reset user data
      await userService.resetUser(userId);
      
      return { success: true };

    } catch (error) {
      console.error('Error resetting conversation:', error);
      throw new Error('Failed to reset conversation');
    }
  }

  // Get all active conversations
  getActiveConversations() {
    const conversations = [];
    for (const [userId, conversation] of this.activeConversations) {
      conversations.push({
        userId,
        status: conversation.status,
        startTime: conversation.startTime,
        currentTopic: conversation.aiState.currentTopic,
        completedTopics: conversation.aiState.completedTopics
      });
    }
    return conversations;
  }

  // Get conversation analytics
  async getConversationAnalytics() {
    const conversations = this.getActiveConversations();
    const completedConversations = conversations.filter(c => c.status === 'completed');
    
    const analytics = {
      totalConversations: conversations.length,
      completedConversations: completedConversations.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      averageCompletionRate: conversations.length > 0 ? 
        (completedConversations.length / conversations.length) * 100 : 0,
      topicCompletionRates: {
        platform_overview: 0,
        onboarding_form: 0,
        additional_conversation: 0
      }
    };

    // Calculate topic completion rates
    conversations.forEach(conversation => {
      conversation.completedTopics.forEach(topic => {
        if (analytics.topicCompletionRates[topic] !== undefined) {
          analytics.topicCompletionRates[topic]++;
        }
      });
    });

    // Convert to percentages
    Object.keys(analytics.topicCompletionRates).forEach(topic => {
      analytics.topicCompletionRates[topic] = conversations.length > 0 ?
        (analytics.topicCompletionRates[topic] / conversations.length) * 100 : 0;
    });

    return analytics;
  }
}

module.exports = new ConversationService(); 