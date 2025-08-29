import ConversationalAIAPI from './conversationalAIAPI';

// RTC and RTM SDKs are loaded via CDN and available globally
// We'll use wait functions to ensure they're loaded before using them

// Function to wait for RTC SDK to load
const waitForAgoraRTC = () => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 100;
    let attempts = 0;
    
    const checkRTC = () => {
      attempts++;
      console.log(`🔍 Attempt ${attempts}: Checking for AgoraRTC...`);
      
      if (window.AgoraRTC && typeof window.AgoraRTC.createClient === 'function') {
        console.log('✅ AgoraRTC loaded successfully');
        resolve(window.AgoraRTC);
      } else if (attempts >= maxAttempts) {
        console.error('❌ AgoraRTC failed to load after 100 attempts');
        console.error('Available window properties:', Object.keys(window).filter(key => key.includes('Agora')));
        reject(new Error('AgoraRTC failed to load after 100 attempts'));
      } else {
        setTimeout(checkRTC, 200);
      }
    };
    
    checkRTC();
  });
};

// Function to wait for RTM SDK to load
const waitForAgoraRTM = () => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 100;
    let attempts = 0;
    
    const checkRTM = () => {
      attempts++;
      console.log(`🔍 Attempt ${attempts}: Checking for AgoraRTM...`);
      
      if (window.AgoraRTM) {
        console.log('🔍 AgoraRTM object found:', window.AgoraRTM);
        console.log('🔍 AgoraRTM properties:', Object.getOwnPropertyNames(window.AgoraRTM));
        
        // Check for different possible RTM SDK structures
        if (typeof window.AgoraRTM.createInstance === 'function') {
          console.log('✅ AgoraRTM.createInstance found');
          resolve(window.AgoraRTM);
        } else if (window.AgoraRTM.default && typeof window.AgoraRTM.default.createInstance === 'function') {
          console.log('✅ AgoraRTM.default.createInstance found');
          resolve(window.AgoraRTM.default);
        } else if (typeof window.AgoraRTM === 'function') {
          console.log('✅ AgoraRTM is a function (constructor)');
          resolve(window.AgoraRTM);
        } else if (window.AgoraRTM.RTM && typeof window.AgoraRTM.RTM === 'function') {
          console.log('✅ AgoraRTM.RTM found (RTM v2.x structure)');
          resolve(window.AgoraRTM.RTM);
        } else {
          console.log('🔍 AgoraRTM structure:', typeof window.AgoraRTM, window.AgoraRTM);
          if (attempts >= maxAttempts) {
            console.error('❌ AgoraRTM failed to load after 100 attempts');
            console.error('Available window properties:', Object.keys(window).filter(key => key.includes('Agora')));
            reject(new Error('AgoraRTM failed to load after 100 attempts'));
          } else {
            setTimeout(checkRTM, 200);
          }
        }
      } else if (attempts >= maxAttempts) {
        console.error('❌ AgoraRTM failed to load after 100 attempts');
        console.error('Available window properties:', Object.keys(window).filter(key => key.includes('Agora')));
        reject(new Error('AgoraRTM failed to load after 100 attempts'));
      } else {
        setTimeout(checkRTM, 200);
      }
    };
    
    checkRTM();
  });
};

class AgoraService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.currentAgentId = null;
    this.currentChannelName = null;
    this.isConnected = false;
    this.rtcEngine = null;
    this.rtmClient = null;
    this.localAudioTrack = null;
    this.remoteAudioTrack = null;
    this.conversationalAI = new ConversationalAIAPI();
  }

  // Initialize RTC and Signaling clients
  async initializeClients(appId, uid) {
    try {
      // Wait for both SDKs to load
      const [AgoraRTCInstance, AgoraRTMInstance] = await Promise.all([
        waitForAgoraRTC(),
        waitForAgoraRTM()
      ]);
      
      console.log('🔍 AgoraRTC loaded successfully:', typeof AgoraRTCInstance);
      console.log('🔍 AgoraRTM loaded successfully:', typeof AgoraRTMInstance);
      console.log('🔍 AgoraRTM.createInstance:', typeof AgoraRTMInstance.createInstance);
      
      // Store SDK instances for later use
      this.agoraRTC = AgoraRTCInstance;
      this.agoraRTM = AgoraRTMInstance;
      
      // Initialize RTC Engine
      this.rtcEngine = AgoraRTCInstance.createClient({ mode: 'rtc', codec: 'vp8' });
      
      // Initialize Signaling Client (RTM) - RTM v2.x style
      const clientUid = uid || Math.floor(Math.random() * 1000000) + 1000;
      console.log('🔍 Creating RTM client with UID:', clientUid);
      console.log('🔍 RTM App ID being used:', appId);
      console.log('🔍 RTM App ID length:', appId.length);
      console.log('🔍 RTM App ID type:', typeof appId);
      console.log('🔍 RTM App ID hex:', Array.from(appId).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
      console.log('🔍 RTM App ID trimmed:', appId.trim());
      
      this.rtmClient = new AgoraRTMInstance(appId.trim(), clientUid.toString(), {
        token: null, // No token for testing
        logUpload: false,
        logLevel: 'INFO'
      });
      
      console.log('✅ RTM v2.x client created:', this.rtmClient);
      
      // Login to RTM
      console.log('🔍 Logging into RTM...');
      await this.rtmClient.login({token: null});
      console.log('✅ RTM login successful');
      
      // Initialize ConversationalAIAPI using the proper init method
      this.conversationalAI = ConversationalAIAPI.init({
        rtcEngine: this.rtcEngine,
        rtmEngine: this.rtmClient,
        renderMode: 'text',
        enableLog: true,
        expectedAgentId: '8888'
      });
      
      console.log('✅ ConversationalAIAPI initialized successfully');
      
      console.log('✅ RTC, Signaling, and ConversationalAI clients initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing clients:', error);
      return false;
    }
  }

  // Join RTC channel
  async joinRTCChannel(channelName, uid, token = null) {
    if (!this.rtcEngine) {
      throw new Error('RTC Engine not initialized');
    }

    try {
      // For testing without tokens, pass null as token
      const appId = window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID || 'your_agora_app_id';
      console.log('🔍 Using App ID:', appId);
      await this.rtcEngine.join(
        appId,
        channelName,
        null, // Always pass null for token to disable token authentication
        uid
      );

      console.log(`✅ Joined RTC channel: ${channelName} with UID: ${uid}`);
      
      // Set up RTC event listeners
      this.setupRTCEventListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Error joining RTC channel:', error);
      return false;
    }
  }

  // Join Signaling channel
  async joinSignalingChannel(channelName) {
    if (!this.rtmClient) {
      throw new Error('Signaling client not initialized');
    }

    try {
      await this.rtmClient.login({ uid: `user_${Date.now()}` });
      const channel = this.rtmClient.createChannel(channelName);
      await channel.join();
      
      console.log(`✅ Joined Signaling channel: ${channelName}`);
      
      // Set up Signaling event listeners
      this.setupSignalingEventListeners(channel);
      
      return channel;
    } catch (error) {
      console.error('❌ Error joining Signaling channel:', error);
      return null;
    }
  }

  // Send RTM message
  async sendRTMMessage(channel, message, type = 'text') {
    if (!channel) {
      throw new Error('Channel not available');
    }

    try {
      const messageData = {
        type,
        content: message,
        timestamp: Date.now(),
        sender: 'user'
      };

      await channel.sendMessage({ text: JSON.stringify(messageData) });
      console.log('✅ RTM message sent:', messageData);
      return true;
    } catch (error) {
      console.error('❌ Error sending RTM message:', error);
      return false;
    }
  }

  // Send message to Agora agent via ConversationalAIAPI
  async sendMessageToAgent(message) {
    if (!this.conversationalAI.isReady()) {
      throw new Error('ConversationalAIAPI not ready');
    }

    try {
      const result = await this.conversationalAI.chat('8888', { 
        messageType: 'TEXT',
        text: message 
      });
      console.log('✅ Message sent to agent:', message);
      return result;
    } catch (error) {
      console.error('❌ Error sending message to agent:', error);
      throw error;
    }
  }

  // Subscribe to agent responses
  onAgentResponse(callback) {
    console.log('🔗 Setting up onAgentResponse callback');
    // Set up the event listener on the CovSubRenderController instance, not the main ConversationalAIAPI instance
    this.conversationalAI.covSubRenderController.on('transcription-updated', callback);
    console.log('🔗 Event listener registered for transcription-updated');
  }

  // Subscribe to user transcriptions
  onUserTranscription(callback) {
    this.conversationalAI.on('transcription-updated', callback);
  }

  // Send image via RTM
  async sendRTMImage(channel, imageData) {
    if (!channel) {
      throw new Error('Channel not available');
    }

    try {
      const messageData = {
        type: 'image',
        content: imageData,
        timestamp: Date.now(),
        sender: 'user'
      };

      await channel.sendMessage({ text: JSON.stringify(messageData) });
      console.log('✅ RTM image sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending RTM image:', error);
      return false;
    }
  }

  // Set up RTC event listeners
  setupRTCEventListeners() {
    if (!this.rtcEngine) return;

    // Handle user published
    this.rtcEngine.on('user-published', async (user, mediaType) => {
      console.log('👤 User published:', user.uid, mediaType);
      
      if (mediaType === 'audio') {
        // Store the remote user for potential audio control
        this.remoteUser = user;
        
        // Subscribe to audio by default
        await this.subscribeToAudio(user);
      }
    });

    // Handle user unpublished
    this.rtcEngine.on('user-unpublished', (user) => {
      console.log('👤 User unpublished:', user.uid);
      if (this.remoteAudioTrack && user.uid === this.remoteAudioTrack.getUserId()) {
        this.remoteAudioTrack.stop();
        this.remoteAudioTrack = null;
      }
    });
  }

  // Set up Signaling event listeners
  setupSignalingEventListeners(channel) {
    if (!channel) return;

    // Handle channel messages
    channel.on('ChannelMessage', (message, memberId) => {
      console.log('📨 Received channel message:', message, 'from:', memberId);
      
      // Parse message data
      try {
        const data = JSON.parse(message.text);
        this.handleChannelMessage(data, memberId);
      } catch (error) {
        console.error('Error parsing channel message:', error);
      }
    });

    // Handle member joined
    channel.on('MemberJoined', (memberId) => {
      console.log('👤 Member joined:', memberId);
      this.onMemberJoined?.(memberId);
    });

    // Handle member left
    channel.on('MemberLeft', (memberId) => {
      console.log('👤 Member left:', memberId);
      this.onMemberLeft?.(memberId);
    });
  }

  // Handle different types of channel messages
  handleChannelMessage(data, memberId) {
    switch (data.type) {
      case 'agent_response':
        this.onAgentResponse?.(data);
        break;
      case 'agent_audio':
        this.onAgentAudio?.(data);
        break;
      case 'agent_video':
        this.onAgentVideo?.(data);
        break;
      case 'transcription':
        this.onTranscription?.(data);
        break;
      case 'avatar_stream':
        this.onAvatarStream?.(data);
        break;
      case 'system_message':
        this.onSystemMessage?.(data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Subscribe to remote audio
  async subscribeToAudio(user) {
    if (!this.rtcEngine || !user) return false;
    
    try {
      await this.rtcEngine.subscribe(user, 'audio');
      console.log('✅ Subscribed to remote audio');
      
      this.remoteAudioTrack = user.audioTrack;
      this.remoteAudioTrack.play();
      return true;
    } catch (error) {
      console.error('❌ Error subscribing to audio:', error);
      return false;
    }
  }

  // Unsubscribe from remote audio
  async unsubscribeFromAudio() {
    if (!this.rtcEngine || !this.remoteUser) return false;
    
    try {
      await this.rtcEngine.unsubscribe(this.remoteUser, 'audio');
      console.log('✅ Unsubscribed from remote audio');
      
      if (this.remoteAudioTrack) {
        this.remoteAudioTrack.stop();
        this.remoteAudioTrack = null;
      }
      return true;
    } catch (error) {
      console.error('❌ Error unsubscribing from audio:', error);
      return false;
    }
  }

  // Toggle audio subscription
  async toggleAudioSubscription(enabled) {
    if (enabled) {
      return await this.subscribeToAudio(this.remoteUser);
    } else {
      return await this.unsubscribeFromAudio();
    }
  }

  // Publish local audio
  async publishAudio() {
    if (!this.rtcEngine) {
      throw new Error('RTC Engine not initialized');
    }

    try {
      this.localAudioTrack = await this.agoraRTC.createMicrophoneAudioTrack();
      await this.rtcEngine.publish(this.localAudioTrack);
      console.log('✅ Published local audio');
      return true;
    } catch (error) {
      console.error('❌ Error publishing audio:', error);
      return false;
    }
  }

  // Enable/disable local microphone
  async setMicrophoneEnabled(enabled) {
    if (!this.localAudioTrack) {
      console.warn('⚠️ No local audio track available');
      return false;
    }

    try {
      if (enabled) {
        await this.localAudioTrack.setEnabled(true);
        console.log('✅ Microphone enabled');
      } else {
        await this.localAudioTrack.setEnabled(false);
        console.log('✅ Microphone disabled');
      }
      return true;
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      return false;
    }
  }

  // Get microphone enabled state
  isMicrophoneEnabled() {
    return this.localAudioTrack ? this.localAudioTrack.enabled : false;
  }

  // Toggle microphone
  async toggleMicrophone() {
    const currentState = this.isMicrophoneEnabled();
    return await this.setMicrophoneEnabled(!currentState);
  }

  // Publish local video
  async publishVideo() {
    if (!this.rtcEngine) {
      throw new Error('RTC Engine not initialized');
    }

    try {
      this.localVideoTrack = await this.agoraRTC.createCameraVideoTrack();
      await this.rtcEngine.publish(this.localVideoTrack);
      console.log('✅ Published local video');
      return true;
    } catch (error) {
      console.error('❌ Error publishing video:', error);
      return false;
    }
  }

  // Publish both audio and video
  async publishMedia() {
    const audioResult = await this.publishAudio();
    const videoResult = await this.publishVideo();
    return audioResult && videoResult;
  }

  // Create an Agora agent via REST API
  async createAgent(channelName, agentUid, clientUid, prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/api/agora/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName,
          agentUid,
          clientUid,
          prompt,
          userId: clientUid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      const data = await response.json();
      console.log('✅ Agora agent created:', data);
      
      // Store current agent info
      this.currentAgentId = data.data.agentId;
      this.currentChannelName = channelName;
      this.isConnected = true;
      
      return data.data;
    } catch (error) {
      console.error('❌ Error creating Agora agent:', error);
      throw error;
    }
  }

                // Send text message to agent via chat API
              async sendTextMessage(text, priority = 'INTERRUPT', interruptable = true) {
                if (!this.currentAgentId) {
                  throw new Error('No active agent. Please create an agent first.');
                }

                try {
                  const response = await fetch(`${this.baseUrl}/api/agora/agents/${this.currentAgentId}/chat`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messageType: 'text',
                      text,
                      priority,
                      interruptable,
                      uuid: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to send text message');
                  }

                  const data = await response.json();
                  console.log('✅ Text message sent:', data);
                  return data.data;
                } catch (error) {
                  console.error('❌ Error sending text message:', error);
                  throw error;
                }
              }

              // Send image message to agent via chat API
              async sendImageMessage(imageUrl, uuid = null) {
                if (!this.currentAgentId) {
                  throw new Error('No active agent. Please create an agent first.');
                }

                const messageUuid = uuid || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                try {
                  const response = await fetch(`${this.baseUrl}/api/agora/agents/${this.currentAgentId}/chat`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messageType: 'image',
                      url: imageUrl,
                      uuid: messageUuid
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to send image message');
                  }

                  const data = await response.json();
                  console.log('✅ Image message sent:', data);
                  return data.data;
                } catch (error) {
                  console.error('❌ Error sending image message:', error);
                  throw error;
                }
              }

              // Legacy method for backward compatibility
              async sendBroadcastMessage(text, priority = 'INTERRUPT', interruptable = true) {
                return this.sendTextMessage(text, priority, interruptable);
              }

  // Interrupt agent
  async interruptAgent(agentId = null) {
    const agentToInterrupt = agentId || this.currentAgentId;
    if (!agentToInterrupt) {
      throw new Error('No agent to interrupt');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agora/agents/${agentToInterrupt}/interrupt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to interrupt agent');
      }

      const data = await response.json();
      console.log('✅ Agent interrupted:', data);
      return data.data;
    } catch (error) {
      console.error('❌ Error interrupting agent:', error);
      throw error;
    }
  }

  // Stop agent
  async stopAgent(agentId = null) {
    const agentToStop = agentId || this.currentAgentId;
    if (!agentToStop) {
      console.warn('No agent to stop');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agora/agents/${agentToStop}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop agent');
      }

      const data = await response.json();
      console.log('✅ Agora agent stopped:', data);
      
      // Clear current agent info
      if (agentId === this.currentAgentId || !agentId) {
        this.currentAgentId = null;
        this.currentChannelName = null;
        this.isConnected = false;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error stopping Agora agent:', error);
      throw error;
    }
  }

  // Leave RTC channel
  async leaveRTCChannel() {
    if (!this.rtcEngine) return;

    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      
      await this.rtcEngine.leave();
      console.log('✅ Left RTC channel');
      return true;
    } catch (error) {
      console.error('❌ Error leaving RTC channel:', error);
      return false;
    }
  }

  // Leave Signaling channel
  async leaveSignalingChannel() {
    if (!this.rtmClient) return;

    try {
      await this.rtmClient.logout();
      console.log('✅ Left Signaling channel');
      return true;
    } catch (error) {
      console.error('❌ Error leaving Signaling channel:', error);
      return false;
    }
  }

  // Complete disconnect
  async disconnect() {
    try {
      await this.leaveRTCChannel();
      await this.leaveSignalingChannel();
      await this.stopAgent();
      
      this.rtcEngine = null;
      this.rtmClient = null;
      this.localAudioTrack = null;
      this.remoteAudioTrack = null;
      
      console.log('✅ Disconnected from all channels');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  // Get current agent info
  getCurrentAgent() {
    return {
      agentId: this.currentAgentId,
      channelName: this.currentChannelName,
      isConnected: this.isConnected
    };
  }

  // Get Agora configuration status
  async getConfigStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/agora/config`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get config status');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('❌ Error getting config status:', error);
      throw error;
    }
  }

  // Generate onboarding prompt
  generateOnboardingPrompt(currentTopic, completedTopics) {
    const basePrompt = `You are a friendly and helpful conversational AI assistant designed to help new users onboard to our platform. 

Your personality: friendly and helpful
Current topic: ${currentTopic}
Completed topics: ${completedTopics.join(', ')}

IMPORTANT RULES:
1. Keep responses concise and natural
2. Always be helpful and encouraging
3. Collect user information when appropriate
4. Guide users through the onboarding process
5. Detect and note user preferences, interests, and skill levels
6. Respond in a conversational tone
7. Update user profile data during conversation
8. Extract and store detected information about the user`;

    switch (currentTopic) {
      case 'platform_overview':
        return basePrompt + `

PLATFORM OVERVIEW MODE:
- Ask if the user wants a platform overview
- If yes, explain key features briefly
- If no, provide onboarding guide link
- Move to onboarding form topic when appropriate
- Detect user's technical comfort level
- Update user profile with detected information`;

      case 'onboarding_form':
        return basePrompt + `

ONBOARDING FORM MODE:
- Guide user through profile creation
- Collect: name, birthday, bio, interests, experience level
- Make it conversational and engaging
- Validate required fields (name, birthday)
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
        return basePrompt;
    }
  }
}

export default new AgoraService(); 