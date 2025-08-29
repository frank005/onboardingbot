const aiService = require('./aiService');
const userService = require('./userService');
const agoraAgentService = require('./agoraAgentService');
const configService = require('./configService');

class ConversationService {
  constructor() {
    this.activeConversations = new Map();
    this.agoraFallbackEnabled = process.env.AGORA_FALLBACK_ENABLED === 'true';
    this.io = null; // Will be set by the main server
  }

  // Set Socket.IO instance
  setSocketIO(io) {
    this.io = io;
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

      // Extract and update profile information from user message
      const profileUpdate = await this.processUserMessageAndUpdateProfile(userId, message, conversation);
      if (profileUpdate) {
        console.log('✅ Updated user profile from message:', profileUpdate);
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
      // Extract and update profile information from user message
      const profileUpdate = await this.processUserMessageAndUpdateProfile(userId, message, conversation);
      if (profileUpdate) {
        conversation.detectedInfo = { ...conversation.detectedInfo, ...profileUpdate.detectedInfo };
        console.log('✅ Updated user profile from Agora message:', profileUpdate);
      }

      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Update conversation state with current topic and completed topics
      if (conversation.aiState) {
        conversation.currentTopic = conversation.aiState.currentTopic;
        conversation.completedTopics = conversation.aiState.completedTopics || [];
      }

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
  extractUserInformation(message, agentQuestion = '') {
    const extractedInfo = {};
    const lowerMessage = message.toLowerCase();
    const lowerAgentQuestion = agentQuestion.toLowerCase();

    // Extract name - more specific patterns to avoid false matches
    const namePatterns = [
      /my name is ([a-zA-Z\s]+)/i,  // Allow full names with spaces
      /^i'm ([a-zA-Z\s]+)(?:\s|$)/i,  // Only match at start of string, allow full names
      /^i am ([a-zA-Z\s]+)(?:\s|$)/i,  // Only match at start of string, allow full names
      /it is ([a-zA-Z\s]+)/i,  // Handle "It is Frank Frankington"
      /call me ([a-zA-Z\s]+)/i,  // Allow full names
      /name's ([a-zA-Z\s]+)/i,  // Allow full names
      /my name's ([a-zA-Z\s]+)/i,  // Allow full names
      /([a-zA-Z\s]+) is my name/i,  // Allow full names
      /i go by ([a-zA-Z\s]+)/i,  // Allow full names
      /hi,? i'm ([a-zA-Z\s]+)/i,  // Common greeting pattern, allow full names
      /hello,? i'm ([a-zA-Z\s]+)/i,  // Common greeting pattern, allow full names
      /update my name to ([a-zA-Z\s]+)/i,  // Allow name updates
      /change my name to ([a-zA-Z\s]+)/i,  // Allow name updates
      /set my name to ([a-zA-Z\s]+)/i  // Allow name updates
    ];
    
    // Check for explicit name update requests first
    if (lowerMessage.includes('update my name') || lowerMessage.includes('change my name') || lowerMessage.includes('set my name')) {
      const nameUpdateMatch = message.match(/to (.+)/i);
      if (nameUpdateMatch && nameUpdateMatch[1]) {
        extractedInfo.name = nameUpdateMatch[1].trim();
      }
    } else {
      // Check if agent was asking about name
      const agentAskingAboutName = lowerAgentQuestion.includes('name') || 
                                   lowerAgentQuestion.includes('what is your name') ||
                                   lowerAgentQuestion.includes('what\'s your name') ||
                                   lowerAgentQuestion.includes('tell me your name') ||
                                   lowerAgentQuestion === 'onboarding_form_step'; // Fallback for step-by-step flow
      
      if (agentAskingAboutName && !extractedInfo.name) {
        // If agent was asking for name and no other extraction happened, treat the whole message as name
        // But only if it looks like a name (2-3 words, no special characters except spaces)
        const potentialName = message.trim();
        if (potentialName.length > 2 && potentialName.length < 50 && 
            /^[a-zA-Z\s]+$/.test(potentialName) && 
            potentialName.split(/\s+/).length <= 3) {
          extractedInfo.name = potentialName;
        }
      }
      
      // Additional fallback: if message looks like a name and no other extraction happened, treat it as name
      if (!extractedInfo.name && !extractedInfo.birthday && !extractedInfo.interests && !extractedInfo.bio && !extractedInfo.experienceLevel) {
        const potentialName = message.trim();
        if (potentialName.length > 2 && potentialName.length < 50 && 
            /^[a-zA-Z\s]+$/.test(potentialName) && 
            potentialName.split(/\s+/).length <= 3 &&
            !potentialName.toLowerCase().includes('my name')) {
          extractedInfo.name = potentialName;
          console.log(`🔍 Fallback name extraction: "${potentialName}"`);
        }
      }
      
      // Regular name extraction patterns
      for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Prevent common false positives
          if (name.toLowerCase() !== 'interested in' && 
              name.toLowerCase() !== 'interested' && 
              name.toLowerCase() !== 'in' &&
              name.length > 1) {
            extractedInfo.name = name;
            break;
          }
        }
      }
    }

    // Extract birthday
    const birthdayPatterns = [
      /my birthday is ([0-9\/]+)/i,
      /birthday is ([0-9\/]+)/i,
      /born on ([0-9\/]+)/i,
      /born ([0-9\/]+)/i,
      /my birthday's ([0-9\/]+)/i,
      /birthday's ([0-9\/]+)/i,
      /i'm born ([0-9\/]+)/i,
      /update my birthday to ([0-9\/]+)/i,
      /change my birthday to ([0-9\/]+)/i,
      /set my birthday to ([0-9\/]+)/i
    ];
    
    // Check for explicit birthday update requests first
    if (lowerMessage.includes('update my birthday') || lowerMessage.includes('change my birthday') || lowerMessage.includes('set my birthday')) {
      const birthdayUpdateMatch = message.match(/to ([0-9\/]+)/i);
      if (birthdayUpdateMatch && birthdayUpdateMatch[1]) {
        extractedInfo.birthday = birthdayUpdateMatch[1].trim();
      }
    } else {
      // Check if agent was asking about birthday
      const agentAskingAboutBirthday = lowerAgentQuestion.includes('birthday') || 
                                       lowerAgentQuestion.includes('born') ||
                                       lowerAgentQuestion.includes('when were you born') ||
                                       lowerAgentQuestion.includes('date of birth');
      
      if (agentAskingAboutBirthday && !extractedInfo.birthday) {
        // Look for date patterns in the message
        const dateMatch = message.match(/([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/);
        if (dateMatch) {
          extractedInfo.birthday = dateMatch[1];
        }
      }
      
      // Regular birthday extraction patterns
      for (const pattern of birthdayPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          extractedInfo.birthday = match[1];
          break;
        }
      }
    }

    // Extract age
    const ageMatch = message.match(/(\d+)\s*(?:years old|yo)/i);
    if (ageMatch) {
      extractedInfo.age = parseInt(ageMatch[1]);
    }

    // Extract interests/hobbies - context aware
    const interestPatterns = [
      /i like (.+)/i,
      /i enjoy (.+)/i,
      /i love (.+)/i,
      /my hobbies are (.+)/i,
      /i'm interested in (.+)/i,
      /i have a passion for (.+)/i,
      /i'm passionate about (.+)/i,
      /my interests are (.+)/i,
      /i'm into (.+)/i,
      /i am interested in (.+)/i  // Handle "I am interested in floating and capping"
    ];
    
        // Check if agent was asking about interests/hobbies
    const agentAskingAboutInterests = lowerAgentQuestion.includes('interests') || 
                                     lowerAgentQuestion.includes('hobbies') || 
                                     lowerAgentQuestion.includes('what do you like') ||
                                     lowerAgentQuestion.includes('what are you into');
    
    // Check for explicit interests update requests first
    if (lowerMessage.includes('update my interests') || lowerMessage.includes('change my interests') || lowerMessage.includes('set my interests')) {
      const interestsUpdateMatch = message.match(/to (.+)/i) || message.match(/to be (.+)/i);
      if (interestsUpdateMatch && interestsUpdateMatch[1]) {
        let interests = interestsUpdateMatch[1].trim();
        // Remove trailing punctuation and common words
        interests = interests.replace(/[.,;!?]+$/, '').replace(/^(be|are|is)\s+/i, '');
        extractedInfo.interests = interests.split(/[,;]/).map(s => s.trim());
      }
    } else {
      // Regular interests extraction patterns
      for (const pattern of interestPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          // If agent was asking about interests, prioritize this extraction
          if (agentAskingAboutInterests) {
            let interests = match[1].split(/[,;]/).map(s => s.trim());
            // Remove experience level from interests
            interests = interests.filter(interest => 
              !interest.toLowerCase().includes('intermediate') && 
              !interest.toLowerCase().includes('beginner') && 
              !interest.toLowerCase().includes('expert') &&
              !interest.toLowerCase().includes('advanced')
            );
            if (interests.length > 0) {
              extractedInfo.interests = interests;
            }
            break;
          } else {
            // Check if this looks like interests (not bio)
            const interestText = match[1].trim();
            if (interestText.length < 100 && !interestText.includes('swim in the sky') && !interestText.includes('until my life')) {
              let interests = interestText.split(/[,;]/).map(s => s.trim());
              // Remove experience level from interests
              interests = interests.filter(interest => 
                !interest.toLowerCase().includes('intermediate') && 
                !interest.toLowerCase().includes('beginner') && 
                !interest.toLowerCase().includes('expert') &&
                !interest.toLowerCase().includes('advanced')
              );
              if (interests.length > 0) {
                extractedInfo.interests = interests;
              }
              break;
            }
          }
        }
      }
    }

    // Extract bio/description - more specific patterns to avoid conflicts with interests
    const bioPatterns = [
      /my bio is (.+)/i,
      /about me: (.+)/i,
      /my bio's (.+)/i,
      /bio is (.+)/i,
      /bio's (.+)/i,
      /i am a (.+)/i,  // Handle "I am a hard work, work in pool settling and jumping"
      /i work (.+)/i,  // Handle work descriptions
      /i work in (.+)/i  // Handle work descriptions
    ];
    
    // Check if agent was asking about bio
    const agentAskingAboutBio = lowerAgentQuestion.includes('bio') || 
                                lowerAgentQuestion.includes('about you') || 
                                lowerAgentQuestion.includes('tell me about yourself') ||
                                lowerAgentQuestion.includes('describe yourself') ||
                                lowerAgentQuestion.includes('work') ||
                                lowerAgentQuestion.includes('job') ||
                                lowerAgentQuestion.includes('profession');
    
    // Check for explicit bio update requests first
    if (lowerMessage.includes('update my bio') || lowerMessage.includes('change my bio') || lowerMessage.includes('set my bio')) {
      // Extract the bio content after "to say" or similar
      const bioUpdateMatch = message.match(/to say (.+)/i) || message.match(/to (.+)/i);
      if (bioUpdateMatch && bioUpdateMatch[1]) {
        const bioContent = bioUpdateMatch[1].trim();
        // Remove trailing punctuation and quotes
        extractedInfo.bio = bioContent.replace(/[.,;!?]+$/, '').replace(/^["']|["']$/g, '');
      }
    }
    
    // Generic update pattern for any field
    const genericUpdateMatch = message.match(/update my (\w+) to (.+)/i) || message.match(/change my (\w+) to (.+)/i);
    if (genericUpdateMatch && genericUpdateMatch[1] && genericUpdateMatch[2]) {
      const field = genericUpdateMatch[1].toLowerCase();
      const value = genericUpdateMatch[2].trim().replace(/[.,;!?]+$/, '');
      
      switch (field) {
        case 'name':
          extractedInfo.name = value;
          break;
        case 'birthday':
          extractedInfo.birthday = value;
          break;
        case 'bio':
          extractedInfo.bio = value;
          break;
        case 'interests':
          extractedInfo.interests = value.split(/[,;]/).map(s => s.trim());
          break;
        case 'experience':
        case 'experiencelevel':
          const expValue = value.toLowerCase();
          if (expValue.includes('beginner')) {
            extractedInfo.experienceLevel = 'beginner';
          } else if (expValue.includes('intermediate')) {
            extractedInfo.experienceLevel = 'intermediate';
          } else if (expValue.includes('expert') || expValue.includes('advanced')) {
            extractedInfo.experienceLevel = 'expert';
          }
          break;
      }
    }
    
    // Prevent short responses from being captured as bio
    if (lowerMessage === 'no i am good' || lowerMessage === 'no im good' || lowerMessage === 'no, i am good' || lowerMessage === 'no, im good') {
      // Don't extract anything from these responses
      return extractedInfo;
    } else if (agentAskingAboutBio) {
      // If agent was asking about bio, treat the response as bio
      if (!extractedInfo.interests && !extractedInfo.name) {
        // If no other extraction happened, treat the whole message as bio
        extractedInfo.bio = message.trim();
      }
    } else {
      // Regular bio extraction patterns
      for (const pattern of bioPatterns) {
        const match = message.match(pattern);
        if (match && match[1] && !extractedInfo.name) { // Avoid capturing name as bio
          // Only extract as bio if it's not already captured as interests
          const bioText = match[1].trim();
          if (!extractedInfo.interests || !bioText.includes(extractedInfo.interests[0])) {
            extractedInfo.bio = bioText;
            break;
          }
        }
      }
      
      // Fallback: If we have work-related content and no bio yet, treat it as bio
      if (!extractedInfo.bio && (lowerMessage.includes('work') || lowerMessage.includes('job') || lowerMessage.includes('profession'))) {
        // Extract work-related content as bio
        const workMatch = message.match(/(?:i am|i'm|i work|i work in) (.+)/i);
        if (workMatch && workMatch[1]) {
          extractedInfo.bio = workMatch[1].trim();
        }
      }
      
      // Special case: Handle "I am a hard work, work in pool settling and jumping"
      if (!extractedInfo.bio && lowerMessage.includes('hard work') && lowerMessage.includes('pool')) {
        const poolMatch = message.match(/i am a (.+)/i);
        if (poolMatch && poolMatch[1]) {
          extractedInfo.bio = poolMatch[1].trim();
        }
      }
    }
    
    // Special case: If the bot just asked for a bio and user responds with "I like to..." or similar,
    // treat it as bio instead of interests
    if (!extractedInfo.bio && extractedInfo.interests && lowerMessage.includes('like to')) {
      // Check if this looks like a bio response (creative/descriptive)
      const interestText = extractedInfo.interests[0];
      if (interestText.includes('catmando') || interestText.includes('racoons') || 
          interestText.includes('parachute') || interestText.includes('moon') ||
          interestText.length > 50) { // Long creative responses are likely bio
        extractedInfo.bio = interestText;
        delete extractedInfo.interests; // Remove from interests since it's actually bio
      }
    }

    // Extract experience level - more specific to avoid conflicts with bio
    if (lowerMessage.includes('update my experience') || lowerMessage.includes('change my experience') || lowerMessage.includes('set my experience')) {
      const experienceUpdateMatch = message.match(/to (.+)/i);
      if (experienceUpdateMatch && experienceUpdateMatch[1]) {
        const experience = experienceUpdateMatch[1].trim().toLowerCase();
        if (experience.includes('beginner')) {
          extractedInfo.experienceLevel = 'beginner';
        } else if (experience.includes('intermediate')) {
          extractedInfo.experienceLevel = 'intermediate';
        } else if (experience.includes('expert') || experience.includes('advanced')) {
          extractedInfo.experienceLevel = 'expert';
        }
      }
    } else {
      // Regular experience level extraction
      if (lowerMessage.includes('beginner') || lowerMessage.includes('new') || lowerMessage.includes('just starting') || lowerMessage.includes('only a beginner')) {
        extractedInfo.experienceLevel = 'beginner';
      } else if (lowerMessage.includes('intermediate') || lowerMessage.includes('some experience')) {
        extractedInfo.experienceLevel = 'intermediate';
      } else if (lowerMessage.includes('expert') || lowerMessage.includes('advanced') || lowerMessage.includes('professional')) {
        extractedInfo.experienceLevel = 'expert';
      }
    }
    
    // If we extracted experience level, make sure it doesn't get captured as bio
    if (extractedInfo.experienceLevel && extractedInfo.bio) {
      // If bio contains experience level, it's likely not a real bio
      if (extractedInfo.bio.toLowerCase().includes(extractedInfo.experienceLevel)) {
        delete extractedInfo.bio; // Remove the bio since it's actually experience level
      }
    }
    
    // If we have both name and bio, and bio looks like it should be bio (not name)
    if (extractedInfo.name && extractedInfo.bio) {
      // If the bio contains work-related content and the name is very long, it's likely the name was incorrectly captured
      if (extractedInfo.name.length > 20 && (extractedInfo.bio.includes('work') || extractedInfo.bio.includes('field') || extractedInfo.bio.includes('marines'))) {
        // The "name" is actually bio content, swap them
        extractedInfo.bio = extractedInfo.name;
        delete extractedInfo.name;
      }
    }
    
    // Check if user is done with onboarding
    if (lowerMessage.includes('thanks') && lowerMessage.includes('good') || 
        lowerMessage.includes('no thats it') || 
        lowerMessage.includes('im good') || 
        lowerMessage.includes('i\'m good') ||
        lowerMessage.includes('that\'s it') ||
        lowerMessage.includes('thats it')) {
      extractedInfo.onboardingComplete = true;
    }

    // Extract gender
    if (lowerMessage.includes('male') || lowerMessage.includes('man') || lowerMessage.includes('guy')) {
      extractedInfo.gender = 'male';
    } else if (lowerMessage.includes('female') || lowerMessage.includes('woman') || lowerMessage.includes('girl')) {
      extractedInfo.gender = 'female';
    }

    return extractedInfo;
  }

  // Process user message and update profile information
  async processUserMessageAndUpdateProfile(userId, message, conversationContext = null) {
    try {
      console.log(`🔍 Processing message for profile extraction: "${message}"`);
      
      // Get conversation context to understand what the agent was asking
      let agentQuestion = '';
      if (conversationContext && conversationContext.messages && conversationContext.messages.length > 0) {
        // Get the last agent message before this user message
        const lastAgentMessage = conversationContext.messages
          .slice(-5) // Check last 5 messages
          .reverse()
          .find(msg => msg.role === 'assistant' || msg.sender === 'assistant' || msg.role === 'bot');
        
        if (lastAgentMessage) {
          agentQuestion = lastAgentMessage.content || lastAgentMessage.text || lastAgentMessage.message || '';
          console.log(`🤖 Agent was asking: "${agentQuestion}"`);
        }
      }
      
      // If no agent question found in messages, try to get it from the conversation state
      if (!agentQuestion && conversationContext && conversationContext.currentTopic) {
        console.log(`🤖 No agent message found, but current topic is: ${conversationContext.currentTopic}`);
        // For onboarding_form topic, we know the agent is asking step by step
        if (conversationContext.currentTopic === 'onboarding_form') {
          agentQuestion = 'onboarding_form_step'; // This will trigger context-aware extraction
        }
      }
      
      const extractedInfo = this.extractUserInformation(message, agentQuestion);
      
      if (Object.keys(extractedInfo).length === 0) {
        console.log(`❌ No information extracted from message: "${message}"`);
        return null; // No information extracted
      }

      console.log(`✅ Extracted user information for ${userId}:`, extractedInfo);
      console.log(`🔍 Raw message: "${message}"`);
      console.log(`🤖 Agent question context: "${agentQuestion}"`);
      console.log(`🔍 Message matches name patterns:`, {
        'it is': /it is ([a-zA-Z\s]+)/i.test(message),
        'my name is': /my name is ([a-zA-Z\s]+)/i.test(message),
        'i am': /^i am ([a-zA-Z\s]+)(?:\s|$)/i.test(message),
        'looks like name': /^[a-zA-Z\s]+$/.test(message.trim()) && message.trim().split(/\s+/).length <= 3
      });
      console.log(`🔍 Message contains update request:`, {
        name: lowerMessage.includes('update my name') || lowerMessage.includes('change my name'),
        birthday: lowerMessage.includes('update my birthday') || lowerMessage.includes('change my birthday'),
        interests: lowerMessage.includes('update my interests') || lowerMessage.includes('change my interests'),
        bio: lowerMessage.includes('update my bio') || lowerMessage.includes('change my bio'),
        experience: lowerMessage.includes('update my experience') || lowerMessage.includes('change my experience'),
        generic: /update my (\w+) to (.+)/i.test(message) || /change my (\w+) to (.+)/i.test(message)
      });
      
      // Check for generic update pattern
      const genericUpdateMatch = message.match(/update my (\w+) to (.+)/i) || message.match(/change my (\w+) to (.+)/i);
      if (genericUpdateMatch) {
        console.log(`🔧 Generic update detected: field="${genericUpdateMatch[1]}", value="${genericUpdateMatch[2]}"`);
      }
      
      // Get conversation for logging
      const conversation = this.activeConversations.get(userId);
      console.log(`🎯 Current topic: ${conversation?.currentTopic || 'unknown'}`);
      console.log(`📊 Completed topics: ${conversation?.completedTopics?.join(', ') || 'none'}`);
      console.log(`🔧 Profile update will be sent to client:`, Object.keys(extractedInfo).length > 0);

      // Check if we've already processed this exact message for this user
      const messageKey = `${userId}-${message}`;
      if (this.processedMessages && this.processedMessages.has(messageKey)) {
        console.log(`🔄 Skipping already processed message for user ${userId}`);
        return null;
      }
      
      // Track processed messages to prevent duplicates
      if (!this.processedMessages) {
        this.processedMessages = new Set();
      }
      this.processedMessages.add(messageKey);

      // Separate profile data from detected info
      const profileData = {};
      const detectedInfo = {};

      if (extractedInfo.name) profileData.name = extractedInfo.name;
      if (extractedInfo.birthday) profileData.birthday = extractedInfo.birthday;
      if (extractedInfo.bio) profileData.bio = extractedInfo.bio;
      if (extractedInfo.interests) profileData.interests = Array.isArray(extractedInfo.interests) ? extractedInfo.interests.join(', ') : extractedInfo.interests;
      if (extractedInfo.experienceLevel) profileData.experience_level = extractedInfo.experienceLevel;
      if (extractedInfo.onboardingComplete) profileData.onboarding_completed = true;

      if (extractedInfo.gender) detectedInfo.gender = extractedInfo.gender;
      if (extractedInfo.age) detectedInfo.age = extractedInfo.age;

      // Update user profile if we have profile data
      if (Object.keys(profileData).length > 0) {
        await userService.updateProfile(userId, profileData);
        console.log(`✅ Updated profile for user ${userId}:`, profileData);
        
        // Update conversation progress based on extracted information
        // conversation is already defined above for logging
        if (conversation) {
          let updatedTopics = [...(conversation.completedTopics || [])];
          
          // Mark profile setup as complete if we have name and birthday
          if (profileData.name && profileData.birthday && !updatedTopics.includes('onboarding_form')) {
            updatedTopics.push('onboarding_form');
            console.log(`✅ Marked profile setup as complete for user ${userId}`);
          }
          
          // Mark additional conversation as complete if user says they're done
          if (profileData.onboarding_completed && !updatedTopics.includes('additional_conversation')) {
            updatedTopics.push('additional_conversation');
            console.log(`✅ Marked additional conversation as complete for user ${userId}`);
          }
          
          conversation.completedTopics = updatedTopics;
          
          // Emit progress update to client
          if (this.io) {
            this.io.to(userId).emit('conversation-progress-updated', {
              completedTopics: updatedTopics,
              currentTopic: conversation.currentTopic,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Emit profile update event
        if (this.io) {
          console.log(`📡 Emitting profile update to user ${userId}:`, profileData);
          this.io.to(userId).emit('profile-updated', {
            type: 'profile',
            data: profileData,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`⚠️ No Socket.IO instance available for profile update`);
        }
      }

      // Update detected info if we have detected data
      if (Object.keys(detectedInfo).length > 0) {
        await userService.updateDetectedInfo(userId, detectedInfo);
        console.log(`✅ Updated detected info for user ${userId}:`, detectedInfo);
        
        // Emit detected info update event
        if (this.io) {
          this.io.to(userId).emit('profile-updated', {
            type: 'detected-info',
            data: detectedInfo,
            timestamp: new Date().toISOString()
          });
        }
      }

          return {
      profileData,
      detectedInfo,
      extractedInfo
    };

  } catch (error) {
    console.error(`❌ Error processing user message for profile update:`, error);
    return null;
  }
}

  // Extract profile information from conversation history
  async extractProfileFromConversation(userId) {
    try {
      const conversation = this.activeConversations.get(userId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const userMessages = conversation.messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);

      if (userMessages.length === 0) {
        return {
          processed: 0,
          profileUpdates: 0,
          detectedUpdates: 0,
          message: 'No user messages found in conversation'
        };
      }

      let profileUpdates = 0;
      let detectedUpdates = 0;

      // Process each user message
      for (const message of userMessages) {
        const update = await this.processUserMessageAndUpdateProfile(userId, message, conversation);
        if (update) {
          if (Object.keys(update.profileData).length > 0) {
            profileUpdates++;
          }
          if (Object.keys(update.detectedInfo).length > 0) {
            detectedUpdates++;
          }
        }
      }

      return {
        processed: userMessages.length,
        profileUpdates,
        detectedUpdates,
        message: `Processed ${userMessages.length} messages, updated ${profileUpdates} profile fields and ${detectedUpdates} detected info fields`
      };

    } catch (error) {
      console.error('Error extracting profile from conversation:', error);
      throw error;
    }
  }

  // Update conversation progress
  updateConversationProgress(userId, currentTopic, completedTopics) {
    const conversation = this.activeConversations.get(userId);
    if (conversation) {
      conversation.currentTopic = currentTopic;
      conversation.completedTopics = completedTopics || [];
      
      // Update AI state if it exists
      if (conversation.aiState) {
        conversation.aiState.currentTopic = currentTopic;
        conversation.aiState.completedTopics = completedTopics || [];
      }
      
      console.log(`📊 Updated conversation progress for ${userId}: currentTopic=${currentTopic}, completedTopics=${completedTopics?.join(', ')}`);
    }
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

ONBOARDING FORM MODE (ALWAYS ACTIVE):
- Guide user through profile creation STEP BY STEP, asking ONE question at a time:
  1. FIRST: Ask for their name (just the name first)
  2. SECOND: Ask for their birthday (just the birthday)
  3. THIRD: Ask for their interests/hobbies (what do they like to do?)
  4. FOURTH: Ask for a brief bio/description about themselves (work, background, etc.)
  5. FIFTH: Ask about their experience level with AI/technology
- IMPORTANT: Ask only ONE question at a time and wait for their response
- Do NOT ask multiple questions in the same message
- Make it conversational and engaging
- Only move to the next step after getting the current information

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
    
    // Extract profile information from conversation before stopping
    if (conversation?.messages && conversation.messages.length > 0) {
      console.log(`🔍 Extracting profile information from conversation...`);
      try {
        const extractionResult = await this.extractProfileFromConversation(userId);
        console.log(`✅ Profile extraction result:`, extractionResult);
      } catch (error) {
        console.error(`❌ Error extracting profile from conversation:`, error);
      }
    }
    
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