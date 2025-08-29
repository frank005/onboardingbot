import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Volume2, VolumeX, User, Bot, Database, Mic, MicOff, Settings, Camera, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import MessageBubble from './MessageBubble';
import VoiceRecorder from './VoiceRecorder';
import UserProfileCard from './UserProfileCard';
import ConversationProgress from './ConversationProgress';
import agoraService from '../services/agoraService';
import SubtitleDisplay from './SubtitleDisplay';
import AgoraSetup from './AgoraSetup';
import CameraPreview from './CameraPreview';

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
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [useAgora, setUseAgora] = useState(false);
  const [agoraAgentId, setAgoraAgentId] = useState(null);
  const [agoraChannelName, setAgoraChannelName] = useState(null);
  const [agoraConnected, setAgoraConnected] = useState(false);
  const [agoraError, setAgoraError] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [showAgoraSetup, setShowAgoraSetup] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 });
  const [userTranscription, setUserTranscription] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Cleanup Agora connection only on unmount (no automatic conversation stopping)
  useEffect(() => {
    return () => {
      // Only disconnect Agora clients, don't stop the conversation
      if (agoraConnected) {
        console.log('🔄 Disconnecting Agora clients on component unmount');
        agoraService.disconnect();
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
      const userId = user?.id || `user_${Date.now()}`;
      
      // Start conversation (server will try Agora first, fallback to OpenAI)
      const response = await onStartConversation(userId);
      
      console.log('🔍 Server response:', response);
      console.log('🔍 useAgora:', response?.useAgora);
      console.log('🔍 agoraAgentId:', response?.agoraAgentId);
      
      // Update local state based on server response
      if (response?.useAgora && response?.agoraAgentId) {
        setUseAgora(true);
        setAgoraAgentId(response.agoraAgentId);
        console.log('✅ Using Agora ConvoAI:', response.agoraAgentId);
        
        // For Agora, initialize conversation without initial message to prevent duplicates
        setConversation(prev => ({
          id: response.conversationId || `conversation-${Date.now()}`,
          messages: [],
          createdAt: new Date().toISOString()
        }));
        
        // Connect to Agora RTM channel
        try {
          await connectToAgoraRTM(response.agoraAgentId, userId);
          console.log('✅ Connected to Agora RTM channel');
        } catch (rtmError) {
          console.warn('⚠️ Failed to connect to Agora RTM:', rtmError);
          // Continue with conversation even if RTM fails
        }
      } else {
        setUseAgora(false);
        console.log('✅ Using OpenAI');
      }
      
      toast.success('Conversation started!');
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  // Connect to Agora RTM channel
  const connectToAgoraRTM = async (agentId, userId) => {
    try {
      console.log('🔗 Connecting to Agora RTM...');
      
      const appId = window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID || 'your_agora_app_id';
      const clientUid = Math.floor(Math.random() * 10000);
      // Use the same channel name as the server
      const channelName = window.REACT_APP_AGORA_CHANNEL || process.env.REACT_APP_AGORA_CHANNEL || "onboarding_channel";
      
      console.log('🔍 Environment variable REACT_APP_AGORA_APP_ID:', window.REACT_APP_AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID);
      console.log('🔍 Using App ID:', appId);
      console.log('🔍 App ID length:', appId.length);
      console.log('🔍 App ID type:', typeof appId);
      console.log('🔍 Using Channel Name:', channelName);
      console.log('🔍 Using Client UID:', clientUid);
      
      // Initialize Agora clients
      await agoraService.initializeClients(appId, clientUid);
      
      // Join RTC channel
      await agoraService.joinRTCChannel(channelName, clientUid);
      
      // Publish local audio (microphone)
      await agoraService.publishAudio();
      
      // Initialize microphone as muted by default
      await agoraService.setMicrophoneEnabled(false);
      setUseAgora(false);
      
      // Subscribe to transcription updates (both user and assistant) BEFORE subscribing to messages
      agoraService.onAgentResponse((chatHistory) => {
        console.log('🎤 Transcription update via RTM callback triggered with', chatHistory?.length || 0, 'messages');
        console.log('🎤 Full chatHistory:', chatHistory);
        
        if (chatHistory && chatHistory.length > 0) {
          const latestMessage = chatHistory[chatHistory.length - 1];
          if (latestMessage && latestMessage.data) {
            console.log('📝 Latest message data:', {
              text: latestMessage.data.text,
              content: latestMessage.data.content,
              speaker: latestMessage.data.speaker,
              isFinal: latestMessage.data.isFinal,
              turnId: latestMessage.data.turn_id || latestMessage.data.turnId,
              messageId: latestMessage.data.messageId
            });
            
            // Only process messages with actual content
            const fullText = latestMessage.data.text || latestMessage.data.content || '';
            if (!fullText) return;
            
            // Determine if this is a user or assistant message based on the speaker
            const isUserMessage = latestMessage.data.speaker && latestMessage.data.speaker.toLowerCase().includes('user');
            const isAssistantMessage = latestMessage.data.speaker && latestMessage.data.speaker.toLowerCase().includes('assistant');
            
            // Process all messages (both final and non-final) like the demo
            if (isUserMessage || isAssistantMessage) {
              const message = {
                id: latestMessage.data.messageId || latestMessage.id || `msg-${Date.now()}`,
                role: isUserMessage ? 'user' : 'assistant',
                content: fullText,
                timestamp: new Date().toLocaleTimeString(),
                source: 'agora-rtm',
                isFinal: latestMessage.data.isFinal || latestMessage.data.final || false,
                speaker: latestMessage.data.speaker,
                turnId: latestMessage.data.turn_id || latestMessage.data.turnId,
                messageId: latestMessage.data.messageId || latestMessage.data.message_id || '',
                isTemp: !(latestMessage.data.isFinal || latestMessage.data.final)
              };
              
              // Update conversation state with proper deduplication
              setConversation(prev => {
                if (!prev) {
                  return {
                    id: `conversation-${Date.now()}`,
                    messages: [message],
                    createdAt: new Date().toISOString()
                  };
                }
                
                // Check for duplicates - prevent exact duplicates for final messages and user messages
                const isDuplicate = prev.messages.some(m => 
                  (m.messageId && m.messageId === message.messageId) || // Exact messageId match
                  (message.isFinal && 
                   m.content === message.content &&
                   m.speaker === message.speaker &&
                   m.source === 'agora-rtm' &&
                   m.isFinal) || // Only prevent duplicates for final messages with same content
                  (message.role === 'user' && 
                   m.content === message.content &&
                   m.speaker === message.speaker &&
                   m.source === 'agora-rtm') || // Prevent duplicate user messages
                  (message.role === 'assistant' && 
                   message.isFinal &&
                   m.content === message.content &&
                   m.speaker === message.speaker &&
                   m.source === 'agora-rtm' &&
                   m.isFinal) // Prevent duplicate final assistant messages
                );
                
                if (isDuplicate) {
                  console.log('🔄 Skipping duplicate message:', message.content.substring(0, 50) + '...', 'turnId:', message.turnId, 'messageId:', message.messageId);
                  return prev;
                }
                
                // For non-final assistant messages, replace the last non-final message from the same speaker and turn
                if (!message.isFinal && message.role === 'assistant') {
                  const lastMessageIndex = prev.messages.length - 1;
                  const lastMessage = prev.messages[lastMessageIndex];
                  
                  if (lastMessage && 
                      lastMessage.role === 'assistant' && 
                      !lastMessage.isFinal && 
                      lastMessage.turnId === message.turnId) {
                    // Replace the last non-final assistant message from the same turn
                    const updatedMessages = [...prev.messages];
                    updatedMessages[lastMessageIndex] = {
                      ...message,
                      timestamp: '(live)',
                      isTemp: true
                    };
                    return {
                      ...prev,
                      messages: updatedMessages
                    };
                  }
                }
                
                // For final assistant messages, replace any existing non-final message from the same turn
                if (message.isFinal && message.role === 'assistant') {
                  const existingMessageIndex = prev.messages.findIndex(m => 
                    m.role === 'assistant' && 
                    !m.isFinal && 
                    m.turnId === message.turnId
                  );
                  
                  if (existingMessageIndex >= 0) {
                    // Replace the non-final message with the final one
                    const updatedMessages = [...prev.messages];
                    updatedMessages[existingMessageIndex] = {
                      ...message,
                      timestamp: new Date().toLocaleTimeString(),
                      isTemp: false
                    };
                    return {
                      ...prev,
                      messages: updatedMessages
                    };
                  }
                }
                
                // For final messages, always add them
                if (message.isFinal) {
                  console.log('✅ Adding final message to conversation:', message.content.substring(0, 50) + '...');
                  return {
                    ...prev,
                    messages: [...prev.messages, message]
                  };
                } else {
                  // For non-final messages, update existing temp message or add new one
                  const tempMessageId = `temp-${message.speaker}`;
                  const existingTempIndex = prev.messages.findIndex(m => 
                    m.id === tempMessageId || 
                    (m.id && m.id.toString().startsWith('temp-') && m.speaker === message.speaker)
                  );
                  
                  const tempMessage = {
                    ...message,
                    id: tempMessageId,
                    timestamp: '(live)',
                    isTemp: true
                  };
                  
                  if (existingTempIndex >= 0) {
                    // Replace existing temp message
                    const newMessages = [...prev.messages];
                    newMessages[existingTempIndex] = tempMessage;
                    return {
                      ...prev,
                      messages: newMessages
                    };
                  } else {
                    // Add new temp message
                    return {
                      ...prev,
                      messages: [...prev.messages, tempMessage]
                    };
                  }
                }
                
                // For non-final messages, add them if they're not replacing an existing one
                return {
                  ...prev,
                  messages: [...prev.messages, message]
                };
              });
            }
          }
        }
      });
      
      // Subscribe to RTM messages using ConversationalAIAPI AFTER setting up the callback
      await agoraService.conversationalAI.subscribeMessage(channelName);
      
      setAgoraConnected(true);
      setAgoraChannelName(channelName);
      
      console.log('✅ Successfully connected to Agora RTM');
      
    } catch (error) {
      console.error('❌ Error connecting to Agora RTM:', error);
      throw error;
    }
  };

  const startAgoraConversation = async (userId) => {
    try {
      // Generate channel name
      const channelName = `onboarding_${userId}_${Date.now()}`;
      setAgoraChannelName(channelName);
      
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
      const agent = await agoraService.createAgent(channelName, 8888, clientUid, prompt);
      
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

    // Immediately add the user's message to prevent overwriting
    // Route message based on connection status
    if (agoraConnected && agoraAgentId) {
      console.log('📤 Sending message via Agora RTM:', text);
      agoraService.sendMessageToAgent(text);
      // Don't add message to conversation here - wait for RTM transcription
    } else {
      console.log('📤 Sending message via server:', text);
      onSendMessage(text);
      // Add message to conversation for non-Agora mode only
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString(),
        source: 'user-input',
        isFinal: true,
        speaker: 'User',
        isTemp: false
      };

      setConversation(prev => {
        if (!prev) {
          return {
            id: `conversation-${Date.now()}`,
            messages: [userMessage],
            createdAt: new Date().toISOString()
          };
        }
        return {
          ...prev,
          messages: [...prev.messages, userMessage]
        };
      });
    }

    // Clear the message input after sending
    setMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(message);
  };

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
        await agoraService.disconnect();
        setAgoraConnected(false);
        setAgoraAgentId(null);
        setAgoraChannelName(null);
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
      
      // Reset conversation state
      setConversation(null);
      setUseAgora(false);
      setMessage('');
      
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
                              useAgora ? 'bg-blue-500' : 'bg-green-500'
                            }`}></div>
                            <span className="text-xs text-gray-500">
                              {agoraConnected && agoraAgentId ? 'Agora ConvoAI' : 'Connecting...'}
                            </span>
                            {agoraAgentId && (
                              <span className="text-xs text-blue-600">
                                (Agent: {agoraAgentId.slice(0, 8)}...)
                              </span>
                            )}
                            {conversation?.provider && (
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
            

            
            <button
              onClick={handleStopConversation}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Stop Conversation & Leave Channel"
            >
              <Square className="w-5 h-5" />
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

        {/* Conversation Progress */}
        {isConversationStarted && (
          <ConversationProgress 
            completedTopics={conversation?.completedTopics || []}
            currentTopic={conversation?.currentTopic}
          />
        )}

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
                  Welcome to the Platform!
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  I'm here to help you get started. Let's begin your onboarding journey together.
                </p>
                <button
                  onClick={handleStartConversation}
                  className="btn-primary"
                >
                  Start Conversation
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
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 p-3"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot" style={{ animationDelay: '0.1s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </motion.div>
          )}
          
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
                placeholder="Type your message..."
                className="input-field pr-20 min-h-[44px]"
                disabled={!isConversationStarted || isTyping}
              />
              <button
                type="submit"
                disabled={!message.trim() || !isConversationStarted || isTyping}
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
                {update.type === 'detected' && (
                  <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Auto-detected
                  </span>
                )}
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
                    transcription={transcription}
                    agentUserId="8888"
                    userTranscription={userTranscription}
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