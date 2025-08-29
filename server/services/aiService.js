const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
    
    this.botName = process.env.BOT_NAME || 'Welcome Bot';
    this.botPersonality = process.env.BOT_PERSONALITY || 'friendly and helpful';
    
    // Conversation state management
    this.conversationStates = new Map();
  }

  // Initialize conversation state for a user
  initializeConversation(userId) {
    const state = {
      userId,
      currentTopic: 'onboarding_form', // Start directly with onboarding form for step-by-step questioning
      completedTopics: [],
      formData: {},
      detectedInfo: {},
      conversationHistory: [],
      step: 0
    };
    
    this.conversationStates.set(userId, state);
    return state;
  }

  // Get conversation state
  getConversationState(userId) {
    if (!this.conversationStates.has(userId)) {
      return this.initializeConversation(userId);
    }
    return this.conversationStates.get(userId);
  }

  // Update conversation state
  updateConversationState(userId, updates) {
    const state = this.getConversationState(userId);
    Object.assign(state, updates);
    this.conversationStates.set(userId, state);
    return state;
  }

  // Generate system prompt based on current topic and state
  generateSystemPrompt(state) {
    const basePrompt = `You are ${this.botName}, a ${this.botPersonality} conversational AI assistant designed to help new users onboard to our platform. 

Your personality: ${this.botPersonality}
Current topic: ${state.currentTopic}
Completed topics: ${state.completedTopics.join(', ')}

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
- Only move to the next step after getting the current information`;

    switch (state.currentTopic) {
      case 'platform_overview':
        return basePrompt + `

PLATFORM OVERVIEW MODE:
- Ask if the user wants a platform overview
- If yes, explain key features briefly
- If no, provide onboarding guide link
- Move to onboarding form topic when appropriate
- Detect user's technical comfort level
- Update user profile with detected information

ONBOARDING FORM MODE (when ready):
- Guide user through profile creation STEP BY STEP, asking ONE question at a time:
  1. FIRST: Ask for their name (just the name first)
  2. SECOND: Ask for their birthday (just the birthday)
  3. THIRD: Ask for their interests/hobbies (what do they like to do?)
  4. FOURTH: Ask for a brief bio/description about themselves (work, background, etc.)
  5. FIFTH: Ask about their experience level with AI/technology
- IMPORTANT: Ask only ONE question at a time and wait for their response
- Do NOT ask multiple questions in the same message`;

      case 'onboarding_form':
        return basePrompt + `

ONBOARDING FORM MODE:
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
- When asking for bio, say something like "Now, could you please share a brief bio? It could be about your work, your background, your passions, or anything else you think is relevant."
- Store responses in formData
- Update user profile in real-time
- Move to additional conversation when form is complete
- Extract and store detected information`;

      case 'additional_conversation':
        return basePrompt + `

ADDITIONAL CONVERSATION MODE:
- Ask if user has other questions
- Engage in natural conversation
- Detect and note:
  * User interests and hobbies
  * Technical skill level
  * Communication preferences
  * Any upcoming events or plans
  * Gender (if mentioned)
  * Experience level in various subjects
- Update user profile with all detected information
- Store conversation insights for analytics`;

      default:
        return basePrompt + `

DEFAULT ONBOARDING MODE:
- Guide user through profile creation STEP BY STEP, asking ONE question at a time:
  1. FIRST: Ask for their name (just the name first)
  2. SECOND: Ask for their birthday (just the birthday)
  3. THIRD: Ask for their interests/hobbies (what do they like to do?)
  4. FOURTH: Ask for a brief bio/description about themselves (work, background, etc.)
  5. FIFTH: Ask about their experience level with AI/technology
- IMPORTANT: Ask only ONE question at a time and wait for their response
- Do NOT ask multiple questions in the same message
- Make it conversational and engaging
- Only move to the next step after getting the current information`;
    }
  }

  // Process user message and generate response
  async processMessage(userId, userMessage, context = {}) {
    const state = this.getConversationState(userId);
    
    // Add user message to history
    state.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    // Generate system prompt
    const systemPrompt = this.generateSystemPrompt(state);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...state.conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false
      });

      const botResponse = completion.choices[0].message.content;
      
      // Add bot response to history
      state.conversationHistory.push({
        role: 'assistant',
        content: botResponse,
        timestamp: new Date().toISOString()
      });

      // Analyze response for topic transitions and data extraction
      const analysis = this.analyzeResponse(botResponse, state, userMessage);
      
      // Update state based on analysis
      this.updateConversationState(userId, {
        ...analysis.stateUpdates,
        conversationHistory: state.conversationHistory
      });

      return {
        message: botResponse,
        currentTopic: analysis.stateUpdates.currentTopic || state.currentTopic,
        completedTopics: analysis.stateUpdates.completedTopics || state.completedTopics,
        formData: analysis.stateUpdates.formData || state.formData,
        detectedInfo: analysis.stateUpdates.detectedInfo || state.detectedInfo,
        nextAction: analysis.nextAction
      };

    } catch (error) {
      console.error('Error processing AI message:', error);
      throw new Error('Failed to generate response');
    }
  }

  // Analyze bot response for topic transitions and data extraction
  analyzeResponse(botResponse, state, userMessage) {
    const analysis = {
      stateUpdates: {},
      nextAction: null
    };

    // Detect topic transitions
    if (botResponse.toLowerCase().includes('platform overview') || 
        botResponse.toLowerCase().includes('features')) {
      if (!state.completedTopics.includes('platform_overview')) {
        analysis.stateUpdates.completedTopics = [...state.completedTopics, 'platform_overview'];
      }
      analysis.stateUpdates.currentTopic = 'onboarding_form';
    }

    if (botResponse.toLowerCase().includes('profile') || 
        botResponse.toLowerCase().includes('form') ||
        botResponse.toLowerCase().includes('bio')) {
      analysis.stateUpdates.currentTopic = 'onboarding_form';
    }

    if (botResponse.toLowerCase().includes('other questions') ||
        botResponse.toLowerCase().includes('anything else')) {
      analysis.stateUpdates.currentTopic = 'additional_conversation';
      if (!state.completedTopics.includes('onboarding_form')) {
        analysis.stateUpdates.completedTopics = [...state.completedTopics, 'onboarding_form'];
      }
    }

    // Extract form data from user message
    const formData = this.extractFormData(userMessage, state.currentTopic);
    if (Object.keys(formData).length > 0) {
      analysis.stateUpdates.formData = { ...state.formData, ...formData };
    }

    // Extract detected information
    const detectedInfo = this.extractDetectedInfo(userMessage, botResponse);
    if (Object.keys(detectedInfo).length > 0) {
      analysis.stateUpdates.detectedInfo = { ...state.detectedInfo, ...detectedInfo };
    }

    return analysis;
  }

  // Extract form data from user messages
  extractFormData(userMessage, currentTopic) {
    const formData = {};
    
    if (currentTopic === 'onboarding_form') {
      // Extract name
      const nameMatch = userMessage.match(/my name is (\w+)/i) || 
                       userMessage.match(/i'm (\w+)/i) ||
                       userMessage.match(/i am (\w+)/i);
      if (nameMatch) {
        formData.name = nameMatch[1];
      }

      // Extract birthday
      const birthdayMatch = userMessage.match(/(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                           userMessage.match(/(\d{1,2}-\d{1,2}-\d{4})/i);
      if (birthdayMatch) {
        formData.birthday = birthdayMatch[1];
      }

      // Extract bio
      if (userMessage.toLowerCase().includes('bio') || userMessage.toLowerCase().includes('biography')) {
        const bioMatch = userMessage.match(/bio[:\s]+(.+)/i) ||
                        userMessage.match(/biography[:\s]+(.+)/i);
        if (bioMatch) {
          formData.bio = bioMatch[1].trim();
        }
      }

      // Extract interests
      const interests = [];
      const interestKeywords = ['like', 'love', 'enjoy', 'interested in', 'hobby', 'hobbies'];
      interestKeywords.forEach(keyword => {
        if (userMessage.toLowerCase().includes(keyword)) {
          const match = userMessage.match(new RegExp(`${keyword}[^.!?]*`, 'i'));
          if (match) {
            interests.push(match[0]);
          }
        }
      });
      if (interests.length > 0) {
        formData.interests = interests.join(', ');
      }
    }

    return formData;
  }

  // Extract detected information from conversation
  extractDetectedInfo(userMessage, botResponse) {
    const detectedInfo = {};

    // Detect gender
    const genderKeywords = {
      male: ['he', 'him', 'his', 'guy', 'man', 'male'],
      female: ['she', 'her', 'hers', 'girl', 'woman', 'female']
    };

    Object.entries(genderKeywords).forEach(([gender, keywords]) => {
      if (keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        detectedInfo.gender = gender;
      }
    });

    // Detect experience level
    const experienceKeywords = {
      low: ['beginner', 'new', 'started', 'learning', 'novice'],
      medium: ['some experience', 'intermediate', 'moderate'],
      high: ['expert', 'experienced', 'advanced', 'professional']
    };

    Object.entries(experienceKeywords).forEach(([level, keywords]) => {
      if (keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        detectedInfo.experienceLevel = level;
      }
    });

    // Detect interests
    const interests = [];
    const interestKeywords = ['hockey', 'cooking', 'hiking', 'travel', 'music', 'sports', 'reading'];
    interestKeywords.forEach(interest => {
      if (userMessage.toLowerCase().includes(interest)) {
        interests.push(interest);
      }
    });
    if (interests.length > 0) {
      detectedInfo.interests = interests.join(', ');
    }

    // Detect upcoming events
    const eventMatch = userMessage.match(/(trip|vacation|visit|going to|planning).*?(france|paris|europe)/i);
    if (eventMatch) {
      detectedInfo.upcomingEvents = eventMatch[0];
    }

    return detectedInfo;
  }

  // Get conversation summary
  getConversationSummary(userId) {
    const state = this.getConversationState(userId);
    return {
      userId,
      completedTopics: state.completedTopics,
      formData: state.formData,
      detectedInfo: state.detectedInfo,
      conversationLength: state.conversationHistory.length
    };
  }

  // Reset conversation for a user
  resetConversation(userId) {
    this.conversationStates.delete(userId);
    return this.initializeConversation(userId);
  }
}

module.exports = new AIService(); 