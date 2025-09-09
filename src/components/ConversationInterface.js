import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Volume2, VolumeX, User, Bot, Database, Mic, MicOff, Camera, Square } from 'lucide-react';
import toast from 'react-hot-toast';

import MessageBubble from './MessageBubble';
import VoiceRecorder from './VoiceRecorder';
import UserProfileCard from './UserProfileCard';
// import ConversationProgress from './ConversationProgress'; // Removed due to tracking issues
import agoraService from '../services/agoraService';
import SubtitleDisplay from './SubtitleDisplay';
import AgoraSetup from './AgoraSetup';
import CameraPreview from './CameraPreview';
import { 
  wireConvoToProfile
} from '../utils/profile-sync';
import { normalizeAssistant } from '../utils/normalizeAssistant';
import { useSessionTimer } from '../hooks/useSessionTimer';

const ConversationInterface = ({ 
  config, 
  conversation, 
  onStartConversation, 
  onSendMessage, 
  onUpgradeToAgora,
  user, 
  onUserUpdate,
  ttsEnabled,
  onTtsToggle,
  setConversation
}) => {
  const [message, setMessage] = useState('');
  // isTyping state removed - no longer used
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUpdates, setProfileUpdates] = useState([]);
  const lastProcessedMessageCountRef = useRef(0);
  const [useAgora, setUseAgora] = useState(false);
  const [agoraAgentId, setAgoraAgentId] = useState(null);
  const [agoraConnected, setAgoraConnected] = useState(false);
  const [agoraError, setAgoraError] = useState(null);
  const [showAgoraSetup, setShowAgoraSetup] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 });
  const [audioEnabled, setAudioEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Session timer hook
  const { isExpired } = useSessionTimer();


  const processedMessages = useRef(new Set()); // Track processed messages to prevent duplicates
  
  // Profile subscription for updates
  const profileUnsubscribe = useRef(null);
  
  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // Handle Agora errors
  useEffect(() => {
    if (agoraError) {
      toast.error(`Agora Error: ${agoraError}`);
      setAgoraError(null);
    }
  }, [agoraError]);

  // Handle session expiry
  useEffect(() => {
    if (isExpired) {
      console.log('🔄 Session expired - cleaning up conversation');
      
      // Disconnect from Agora
      if (agoraConnected) {
        agoraService.disconnect().catch(console.error);
        setAgoraConnected(false);
        setAgoraAgentId(null);
      }
      
      // Reset conversation state
      setConversation(prev => ({
        ...prev,
        status: 'expired',
        messages: prev.messages.map(msg => ({
          ...msg,
          isExpired: true
        }))
      }));
      
      // Show session expired message
      toast.error('Your session has expired. Please log in again.');
    }
  }, [isExpired, agoraConnected, setConversation]);

  // Handle page visibility changes to reset conversation when user navigates away and back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && agoraConnected) {
        // Page became visible and we have an active Agora connection
        // This means user navigated back to the conversation tab
        console.log('🔄 Page became visible - resetting conversation state');
        
        // Disconnect from Agora to clean up
        agoraService.disconnect().catch(console.error);
        setAgoraConnected(false);
        setAgoraAgentId(null);
        
        // Reset conversation to allow fresh start
        setConversation(prev => ({
          ...prev,
          status: 'idle',
          messages: []
        }));
        
        // Clear any pending profile updates
        setProfileUpdates([]);
        
        toast.info('Conversation reset. You can start a new conversation.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [agoraConnected, setConversation]);

  // Cleanup Agora connection only on unmount (no automatic conversation stopping)
  useEffect(() => {
    return () => {
      // Only disconnect Agora clients, don't stop the conversation
      if (agoraConnected) {
        console.log('🔄 Disconnecting Agora clients on component unmount');
        agoraService.disconnect();
      }
      
      // Cleanup profile subscription
      if (profileUnsubscribe.current) {
        profileUnsubscribe.current();
        profileUnsubscribe.current = null;
      }
    };
  }, [agoraConnected]);

  // Sync microphone state with agoraService
  useEffect(() => {
    if (agoraConnected) {
      const isEnabled = agoraService.isMicrophoneEnabled();
      setUseAgora(isEnabled);
    }
  }, [agoraConnected]);

  // Direct profile updates (no more Socket.IO)
  useEffect(() => {
    if (user?.id) {
      // console.log('🔍 User ID available for profile updates:', user.id);
    }
  }, [user?.id]);

  // Handle camera image capture
  const handleImageCapture = async (imageData) => {
    if (agoraConnected && agoraAgentId) {
      try {
        // Send image via RTM
        await agoraService.sendRTMImage(agoraService.currentChannel, imageData);
        console.log('✅ Image sent to Agora agent');
      } catch (error) {
        console.error('❌ Error sending image:', error);
      }
    }
  };

  // Handle camera error
  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    toast.error('Camera access failed. Please check permissions.');
  };

  const handleStartConversation = async () => {
    try {
      // Check if session is expired
      if (isExpired) {
        toast.error('Your session has expired. Please log in again.');
        return;
      }
      
      const userId = user?.id || `user_${Date.now()}`;
      
      console.log('🔄 Starting new conversation - cleaning up previous state');
      
      // Clean up any existing Agora connection first
      if (agoraConnected) {
        console.log('🔄 Disconnecting from previous Agora connection');
        await agoraService.disconnect();
        setAgoraConnected(false);
        setAgoraAgentId(null);
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Reset processed message count for new conversation
      lastProcessedMessageCountRef.current = 0;
      processedMessages.current.clear();
      
      // Clear any existing live/temp messages and profile updates
      setProfileUpdates([]);
      
      // console.log('🔍 Starting conversation with userId:', userId);
      
      // Always use Agora for now - no server fallback
      setUseAgora(true);
      
      // Initialize conversation with active status
      setConversation(prev => ({
        id: `conversation-${Date.now()}`,
        messages: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        completedTopics: [],
        currentTopic: 'platform_overview',
        provider: 'agora'
      }));
      
      // Connect to Agora RTM channel directly
      try {
        await connectToAgoraRTM(null, userId); // agentId will be created in connectToAgoraRTM
        console.log('✅ Connected to Agora RTM channel');
        
        // Wire the conversation to profile updates using user data directly
        if (profileUnsubscribe.current) {
          profileUnsubscribe.current();
        }
        
        profileUnsubscribe.current = wireConvoToProfile(agoraService, (profile, update) => {
          console.log('📝 Profile update received:', update);
          
          // Update local state for UI
          setProfileUpdates(prev => [...prev, update]);
          
          // Handle profile updates directly with user data
          if (update && onUserUpdate && user?.id) {
            // Create updated user profile
            const updatedProfile = { ...user.profile };
            updatedProfile[update.fieldName] = update.value;
            
            // Update user data
            onUserUpdate({
              ...user,
              profile: updatedProfile
            });
          }
        }, user);
        
        console.log('🔍 Profile store wired to agoraService');
      } catch (rtmError) {
        console.warn('⚠️ Failed to connect to Agora RTM:', rtmError);
        toast.error('Failed to connect to Agora RTM');
        return;
      }
      
      toast.success('Conversation started!');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Connect to Agora RTM channel
  const connectToAgoraRTM = async (agentId, userId) => {
    try {
      console.log('🔗 Connecting to Agora RTM...');
      
      // console.log('🔍 Connecting to Agora RTM with user data:', user?.id);
      
      const appId = window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID || 'your_agora_app_id';
      const clientUid = Math.floor(Math.random() * 10000);
      // Generate unique channel name for each session to allow multiple users
      const baseChannelName = window.REACT_APP_AGORA_CHANNEL || process.env.REACT_APP_AGORA_CHANNEL || "onboarding_channel";
      const channelName = `${baseChannelName}_${userId}_${Date.now()}`;
      
      // console.log('🔍 Environment variable REACT_APP_AGORA_APP_ID:', window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID);
      // console.log('🔍 Using App ID:', appId);
      // console.log('🔍 App ID length:', appId.length);
      // console.log('🔍 App ID type:', typeof appId);
      // console.log('🔍 Using Channel Name:', channelName);
      // console.log('🔍 Using Client UID:', clientUid);
      
      // Initialize Agora clients
      await agoraService.initializeClients(appId, clientUid);
      
      // Join RTC channel
      await agoraService.joinRTCChannel(channelName, clientUid);
      
      // Publish local audio (microphone)
      await agoraService.publishAudio();
      
      // Initialize microphone as muted by default
      await agoraService.setMicrophoneEnabled(false);
      
      // Create Agora agent if not provided
      let finalAgentId = agentId;
      if (!finalAgentId) {
        try {
          const prompt = agoraService.generateOnboardingPrompt('platform_overview', []);
          console.log('🔗 Creating Agora agent via REST API...');
          
          // Build profile context from user data
          const profileContext = user?.profile ? {
            name: user.profile.name || '',
            birthday: user.profile.birthday || '',
            interests: user.profile.interests || '',
            bio: user.profile.bio || '',
            experience: user.profile.experience || user.profile.experienceLevel || ''
          } : null;
          
          const agent = await agoraService.createAgent(channelName, 8888, clientUid, prompt, profileContext);
          if (agent && agent.agentId) {
            finalAgentId = agent.agentId;
            setAgoraAgentId(finalAgentId);
            console.log('✅ Created Agora agent via REST API:', finalAgentId);
          } else {
            throw new Error('Failed to create Agora agent');
          }
        } catch (agentError) {
          console.error('❌ Error creating Agora agent:', agentError);
          throw agentError;
        }
      }
      
      // Subscribe to transcription updates - SINGLE SOURCE OF TRUTH
      // Remove any existing listeners first to prevent duplicates
      agoraService.conversationalAI.covSubRenderController.removeAllListeners('transcription-updated');
      
      const transcriptionHandler = async (chatHistory) => {
        const eventId = Math.random().toString(36).substr(2, 9);
        const seenDigests = new Set();
        
        try {
          console.log(`🎤 [${eventId}] TRANSCRIPTION_UPDATED event received with`, chatHistory?.length || 0, 'messages');
        
          if (chatHistory && chatHistory.length > 0) {
            console.log(`🔍 [${eventId}] Chat history length:`, chatHistory.length, 'Last processed count:', lastProcessedMessageCountRef.current);
            
            // Only process new messages since the last event
            const newMessages = chatHistory.slice(lastProcessedMessageCountRef.current);
            console.log(`🔍 [${eventId}] Processing`, newMessages.length, 'new messages');
            
            // If no new messages, skip processing
            if (newMessages.length === 0) {
              console.log(`🔄 [${eventId}] No new messages to process, skipping`);
              return;
            }
            
            // Process messages first, then update the count to prevent race conditions
            for (const message of newMessages) {
              if (message && message.data) {
                const messageId = message.data.messageId || message.data.message_id || message.id;
                const isFinal = message.data.isFinal || message.data.final || false;
                const fullText = message.data.text || message.data.content || '';
                
                // Only process messages with actual content
                if (!fullText) continue;
                
                // Create digest for deduplication
                const digest = `${message.data.speaker}|${isFinal}|${fullText}`;
                if (seenDigests.has(digest)) {
                  console.log('🔄 Skipping duplicate message digest:', digest.substring(0, 50) + '...');
                  continue;
                }
                seenDigests.add(digest);
                
                // Determine if this is a user or assistant message
                const isUserMessage = message.data.speaker && (
                  message.data.speaker.toLowerCase().includes('user') || 
                  message.data.speaker.toLowerCase().includes('user (') ||
                  message.data.speaker.toLowerCase().includes('user(') ||
                  message.data.speaker.toLowerCase().includes('user ') ||
                  message.data.speaker.toLowerCase().startsWith('user')
                );
                const isAssistantMessage = message.data.speaker && (
                  message.data.speaker.toLowerCase().includes('assistant') || 
                  message.data.speaker.toLowerCase().includes('assistant (')
                );
                
                // Process user messages (both final and partial)
                if (isUserMessage) {
                  const messageObj = {
                    id: messageId || `msg-${Date.now()}`,
                    role: 'user',
                    content: fullText,
                    rawContent: fullText,
                    timestamp: new Date().toLocaleTimeString(),
                    source: 'agora-rtm',
                    isFinal: isFinal,
                    speaker: message.data.speaker,
                    turnId: message.data.turn_id || message.data.turnId,
                    messageId: messageId,
                    isTemp: !isFinal
                  };
                  
                  // Update conversation state for user messages
                  setConversation(prev => {
                    if (!prev) {
                      return {
                        id: `conversation-${Date.now()}`,
                        messages: [messageObj],
                        createdAt: new Date().toISOString(),
                        completedTopics: [],
                        currentTopic: 'platform_overview'
                      };
                    }
                    
                    // Check for duplicates
                    const isDuplicate = prev.messages.some(m => 
                      m.messageId === messageObj.messageId ||
                      (m.role === 'user' && m.rawContent === messageObj.rawContent && m.speaker === messageObj.speaker)
                    );
                    
                    if (isDuplicate) {
                      console.log('🔄 Skipping duplicate user message:', messageObj.content.substring(0, 50) + '...');
                      return prev;
                    }
                    
                    // Handle user message (replace live or add new)
                    if (messageObj.isFinal) {
                      const existingLiveIndex = prev.messages.findIndex(m => 
                        m.role === 'user' && !m.isFinal && (m.turnId === messageObj.turnId || m.isTemp)
                      );
                      
                      if (existingLiveIndex >= 0) {
                        const updatedMessages = [...prev.messages];
                        updatedMessages[existingLiveIndex] = { ...messageObj, isTemp: false };
                        return { ...prev, messages: updatedMessages };
                      } else {
                        return { ...prev, messages: [...prev.messages, messageObj] };
                      }
                    } else {
                      const existingLiveIndex = prev.messages.findIndex(m => 
                        m.role === 'user' && !m.isFinal && (m.turnId === messageObj.turnId || m.isTemp)
                      );
                      
                      const liveMessage = { ...messageObj, timestamp: '(live)', isTemp: true };
                      
                      if (existingLiveIndex >= 0) {
                        const updatedMessages = [...prev.messages];
                        updatedMessages[existingLiveIndex] = liveMessage;
                        return { ...prev, messages: updatedMessages };
                      } else {
                        return { ...prev, messages: [...prev.messages, liveMessage] };
                      }
                    }
                  });
                }
                
                // Process assistant messages - ONLY FINAL MESSAGES
                if (isAssistantMessage && isFinal) {
                  // Normalize assistant message
                  const normalized = normalizeAssistant(fullText);
                  
                  // Update profile if field update detected
                  if (normalized.fieldUpdate && onUserUpdate && user?.id) {
                    console.log('🔍 Profile update detected:', normalized.fieldUpdate);
                    onUserUpdate({ [normalized.fieldUpdate.field]: normalized.fieldUpdate.value });
                    
                    setProfileUpdates(prev => [...prev, {
                      field: normalized.fieldUpdate.field,
                      value: normalized.fieldUpdate.value,
                      timestamp: Date.now(),
                      type: 'detected-info'
                    }]);
                  }
                  
                  // Only add message if there's visible text
                  if (normalized.visibleText) {
                    const messageObj = {
                      id: messageId || `msg-${Date.now()}`,
                      role: 'assistant',
                      content: normalized.visibleText,
                      rawContent: fullText,
                      timestamp: new Date().toLocaleTimeString(),
                      source: 'agora-rtm',
                      isFinal: isFinal,
                      speaker: message.data.speaker,
                      turnId: message.data.turn_id || message.data.turnId,
                      messageId: messageId,
                      isTemp: !isFinal
                    };
                    
                    // Update conversation state for assistant messages
                    setConversation(prev => {
                      if (!prev) {
                        return {
                          id: `conversation-${Date.now()}`,
                          messages: [messageObj],
                          createdAt: new Date().toISOString(),
                          completedTopics: [],
                          currentTopic: 'platform_overview'
                        };
                      }
                      
                      // Check for duplicates
                      const isDuplicate = prev.messages.some(m => 
                        m.messageId === messageObj.messageId ||
                        (m.role === 'assistant' && m.rawContent === messageObj.rawContent && m.speaker === messageObj.speaker && m.isFinal === messageObj.isFinal)
                      );
                      
                      if (isDuplicate) {
                        console.log('🔄 Skipping duplicate assistant message:', messageObj.content.substring(0, 50) + '...');
                        return prev;
                      }
                      
                      console.log('✅ Adding assistant message:', messageObj.content.substring(0, 50) + '...', 'isFinal:', messageObj.isFinal);
                      return { ...prev, messages: [...prev.messages, messageObj] };
                    });
                  }
                }
              }
            }
            
            // Update the last processed message count after all messages are processed
            lastProcessedMessageCountRef.current = chatHistory.length;
          }
        } catch (error) {
          console.error('❌ Error in transcription event handler:', error);
        }
      };
      
      // Add the listener
      agoraService.conversationalAI.covSubRenderController.on('transcription-updated', transcriptionHandler);
      
      // Subscribe to RTM messages using ConversationalAIAPI - this is needed for transcription data
      await agoraService.conversationalAI.subscribeMessage(channelName);
      
      console.log('🔍 RTM subscription completed for channel:', channelName);
      console.log('🔍 onAgentResponse callback is set:', !!agoraService.onAgentResponse);
      console.log('🔍 Waiting for agent responses...');
      
      setAgoraConnected(true);
      
      console.log('✅ Successfully connected to Agora RTM');
      
      // Return cleanup function for StrictMode
      return () => {
        agoraService.conversationalAI.covSubRenderController.removeListener('transcription-updated', transcriptionHandler);
      };
      
    } catch (error) {
      console.error('❌ Error connecting to Agora RTM:', error);
      throw error;
    }
  };

  // eslint-disable-next-line no-unused-vars
  const startAgoraConversation = async (userId) => {
    try {
      // Generate unique channel name for each session to allow multiple users
      const baseChannelName = window.REACT_APP_AGORA_CHANNEL || process.env.REACT_APP_AGORA_CHANNEL || "onboarding_channel";
      const channelName = `${baseChannelName}_${userId}_${Date.now()}`;
      // setAgoraChannelName(channelName); // Removed - no longer needed
      
      // Initialize RTC and Signaling clients
      const appId = window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID || 'your_agora_app_id';
      const clientUid = Math.floor(Math.random() * 10000);
      
      await agoraService.initializeClients(appId, clientUid);
      
      // Join RTC channel
      await agoraService.joinRTCChannel(channelName, clientUid);
      
      // Join Signaling channel
      await agoraService.joinSignalingChannel(channelName);
      
      // Publish local audio
      await agoraService.publishAudio();
      
      // Initialize microphone as muted by default
      await agoraService.setMicrophoneEnabled(false);
      setUseAgora(false);
      
      // Create Agora agent via REST API
      const prompt = agoraService.generateOnboardingPrompt('platform_overview', []);
      
      // Build profile context from user data
      const profileContext = user?.profile ? {
        name: user.profile.name || '',
        birthday: user.profile.birthday || '',
        interests: user.profile.interests || '',
        bio: user.profile.bio || '',
        experience: user.profile.experience || user.profile.experienceLevel || ''
      } : null;
      
      const agent = await agoraService.createAgent(channelName, 8888, clientUid, prompt, profileContext);
      
      if (agent && agent.agentId) {
        setAgoraAgentId(agent.agentId);
        setAgoraConnected(true);
        toast.success('Agora agent created and joined channel!');
      } else {
        throw new Error('Failed to create Agora agent');
      }
    } catch (error) {
      console.error('Error starting Agora conversation:', error);
      setAgoraError(error.message);
      toast.error('Failed to start Agora conversation');
      throw error;
    }
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // Check if session is expired
    if (isExpired) {
      toast.error('Your session has expired. Please log in again.');
      return;
    }

    // Send via Agora RTM if connected
    if (agoraConnected && agoraAgentId) {
      console.log('📤 Sending message via Agora RTM:', text);
      agoraService.sendMessageToAgent(text);
    } else {
      console.log('📤 No Agora connection available');
    }

    // Clear the message input after sending
    setMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(message);
  };

  // eslint-disable-next-line no-unused-vars
  const handleVoiceToggle = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    toast.success(isVoiceEnabled ? 'Voice disabled' : 'Voice enabled');
  };

  const handleVoiceInput = async (audioData) => {
    // In a real implementation, this would process voice input
    // For demo purposes, we'll simulate voice-to-text
    const simulatedText = "Hello, I'd like to learn more about the platform";
    handleSendMessage(simulatedText);
  };

  const handleStopConversation = async () => {
    try {
      console.log('🛑 Stopping conversation...');
      
      // Disconnect from Agora
      if (agoraConnected) {
        console.log('🔄 Disconnecting from Agora...');
        
        // Remove all event listeners to prevent memory leaks and duplicate processing
        if (agoraService.conversationalAI?.covSubRenderController) {
          agoraService.conversationalAI.covSubRenderController.removeAllListeners('transcription-updated');
          console.log('🧹 Removed all transcription-updated event listeners');
        }
        
        await agoraService.disconnect();
        setAgoraConnected(false);
        setAgoraAgentId(null);
      }
      
      // Stop the conversation on the server
      if (user?.id) {
        console.log('🛑 Stopping conversation on server...');
        const response = await fetch(`/api/conversation/stop/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log('✅ Conversation stopped on server');
        } else {
          console.warn('⚠️ Failed to stop conversation on server');
        }
      }
      
      // Reset conversation state completely
      setConversation(null);
      setUseAgora(false);
      setMessage('');
      setProfileUpdates([]);
      lastProcessedMessageCountRef.current = 0;
      processedMessages.current.clear();
      
      toast.success('Conversation stopped');
      console.log('✅ Conversation stopped successfully');
      
    } catch (error) {
      console.error('❌ Error stopping conversation:', error);
      toast.error('Failed to stop conversation');
    }
  };

  const isConversationStarted = conversation?.status === 'active' || conversation?.messages?.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {config?.botName || 'Welcome Bot'}
              </h1>
                                        <p className="text-sm text-gray-600">
                            {config?.botPersonality || 'Friendly and helpful'}
                          </p>
                          {/* Provider Status */}
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${
                              isExpired ? 'bg-red-500' : 
                              useAgora ? 'bg-blue-500' : 'bg-green-500'
                            }`}></div>
                            <span className="text-xs text-gray-500">
                              {isExpired ? 'Session Expired' :
                               agoraConnected && agoraAgentId ? 'Agora ConvoAI' : 'Connecting...'}
                            </span>
                            {agoraAgentId && !isExpired && (
                              <span className="text-xs text-blue-600">
                                (Agent: {agoraAgentId.slice(0, 8)}...)
                              </span>
                            )}
                            {conversation?.provider && !isExpired && (
                              <span className="text-xs text-gray-400">
                                via {conversation.provider}
                              </span>
                            )}
                          </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="View User Profile & Settings"
            >
              <User className="w-5 h-5" />
            </button>
            

            
            <button
              onClick={() => setProfileUpdates([])}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
              title={`Profile Updates (${profileUpdates.length}) - Click to clear`}
            >
              <Database className="w-5 h-5" />
              {profileUpdates.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                  {profileUpdates.length}
                </span>
              )}
            </button>
            

            

            
            <button
              onClick={async () => {
                if (agoraConnected) {
                  try {
                    const success = await agoraService.toggleMicrophone();
                    if (success) {
                      const isEnabled = agoraService.isMicrophoneEnabled();
                      setUseAgora(isEnabled);
                      toast.success(isEnabled ? 'Microphone enabled' : 'Microphone muted');
                    } else {
                      toast.error('Failed to toggle microphone');
                    }
                  } catch (error) {
                    console.error('Error toggling microphone:', error);
                    toast.error('Failed to toggle microphone');
                  }
                } else {
                  toast.error('Please start a conversation first');
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                useAgora
                  ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={useAgora ? 'Microphone: ON - Click to unmute' : 'Microphone: OFF - Click to enable'}
            >
              {useAgora ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            

            
            {/* Stop button - only show when conversation is active */}
            {isConversationStarted && (
              <button
                onClick={handleStopConversation}
                disabled={!agoraConnected}
                className={`p-2 rounded-lg transition-colors ${
                  agoraConnected
                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={agoraConnected ? "Stop Conversation & Leave Channel" : "No active conversation to stop"}
              >
                <Square className="w-5 h-5" />
              </button>
            )}
            
            {/* Reset Conversation Button */}
            <button
              onClick={async () => {
                console.log('🔄 Manual conversation reset triggered');
                
                // Disconnect from Agora
                if (agoraConnected) {
                  await agoraService.disconnect();
                  setAgoraConnected(false);
                  setAgoraAgentId(null);
                }
                
                // Reset conversation state
                setConversation(prev => ({
                  ...prev,
                  status: 'idle',
                  messages: []
                }));
                
                // Clear any pending profile updates
                setProfileUpdates([]);
                
                toast.success('Conversation reset successfully');
              }}
              className={`p-2 rounded-lg transition-colors ${
                'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
              title="Reset Conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={async () => {
                const newAudioEnabled = !audioEnabled;
                setAudioEnabled(newAudioEnabled);
                
                if (agoraConnected) {
                  try {
                    await agoraService.toggleAudioSubscription(newAudioEnabled);
                    toast.success(newAudioEnabled ? 'Agent audio enabled' : 'Agent audio muted');
                  } catch (error) {
                    console.error('Error toggling audio:', error);
                    toast.error('Failed to toggle audio');
                  }
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                audioEnabled
                  ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={audioEnabled ? 'Agent Audio: ON - Click to mute agent' : 'Agent Audio: OFF - Click to hear agent'}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                cameraEnabled
                  ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={cameraEnabled ? 'Camera: ON - Click to disable' : 'Camera: OFF - Click to enable visual input'}
            >
              <Camera className="w-5 h-5" />
            </button>
            

          </div>
        </div>

        {/* Conversation Progress - Removed due to tracking issues */}

        {/* Messages */}
        <div className="h-96 overflow-y-auto mb-6 p-4 bg-gray-50 rounded-lg">
          <AnimatePresence>
            {!isConversationStarted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {isExpired ? "Session Expired" : "Welcome to the Platform!"}
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isExpired ? "Your session has expired. Please log in again to continue." : "I'm here to help you get started. Let's begin your onboarding journey together."}
                </p>
                <button
                  onClick={handleStartConversation}
                  className="btn-primary"
                  disabled={isExpired}
                >
                  {isExpired ? "Session Expired" : "Start Conversation"}
                </button>
              </motion.div>
            ) : (
              (() => {
                console.log('🎯 Rendering conversation with', conversation?.messages?.length || 0, 'messages:', conversation?.messages);
                return conversation?.messages?.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MessageBubble
                      message={msg}
                      isUser={msg.role === 'user'}
                      config={config}
                    />
                  </motion.div>
                ));
              })()
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isExpired ? "Session expired - please log in again" : "Type your message..."}
                className="input-field pr-20 min-h-[44px]"
                disabled={!isConversationStarted || isExpired}
              />
              <button
                type="submit"
                disabled={!message.trim() || !isConversationStarted || isExpired}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
              {agoraConnected && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const success = await agoraService.toggleMicrophone();
                      if (success) {
                        const isEnabled = agoraService.isMicrophoneEnabled();
                        setUseAgora(isEnabled);
                        toast.success(isEnabled ? 'Microphone enabled' : 'Microphone muted');
                      } else {
                        toast.error('Failed to toggle microphone');
                      }
                    } catch (error) {
                      console.error('Error toggling microphone:', error);
                      toast.error('Failed to toggle microphone');
                    }
                  }}
                  className={`absolute right-10 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    useAgora
                      ? 'text-blue-600 hover:text-blue-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={useAgora ? 'Microphone: ON - Click to unmute' : 'Microphone: OFF - Click to enable'}
                >
                  {useAgora ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              )}
            </form>
          </div>
          
          {isVoiceEnabled && isConversationStarted && (
            <VoiceRecorder
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
              onVoiceInput={handleVoiceInput}
            />
          )}
        </div>
      </motion.div>

      {/* Profile Updates Display */}
      {profileUpdates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 w-80 bg-white shadow-lg rounded-lg border z-40"
        >
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Profile Updates</h3>
              <button
                onClick={() => setProfileUpdates([])}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-4">
            {profileUpdates.map((update, index) => (
              <div key={index} className="mb-3 p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {update.field.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-900 mt-1">
                  {update.value}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    update.type === 'detected-info' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {update.type === 'detected-info' ? 'Auto-detected' : 'Profile Update'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {update.type === 'detected-info' ? 'From conversation' : 'From form'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

                        {/* User Profile Sidebar */}
                  <AnimatePresence>
                    {showProfile && (
                      <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50"
                      >
                        <UserProfileCard
                          user={user}
                          conversation={conversation}
                          onClose={() => setShowProfile(false)}
                          onUserUpdate={onUserUpdate}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Camera Preview */}
                  <CameraPreview
                    isEnabled={cameraEnabled}
                    onImageCapture={handleImageCapture}
                    onCameraError={handleCameraError}
                    position={cameraPosition}
                    onPositionChange={setCameraPosition}
                  />

                  {/* Subtitle Display */}
                  <SubtitleDisplay
                    isVisible={useAgora && agoraConnected}
                    transcription=""
                    agentUserId="8888"
                    userTranscription=""
                  />

                  {/* Agora Setup Modal */}
                  <AgoraSetup
                    isOpen={showAgoraSetup}
                    onClose={() => setShowAgoraSetup(false)}
                    onConfigUpdate={(config) => {
                      console.log('Agora config updated:', config);
                      // You can update the service with new config here
                    }}
                  />
                </div>
              );
            };

export default ConversationInterface; 