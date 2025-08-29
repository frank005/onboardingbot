import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export const useConversation = (ttsEnabled = true) => {
  const [conversation, setConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('bot-response', (response) => {
      setConversation(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString()
        }],
        currentTopic: response.currentTopic,
        completedTopics: response.completedTopics,
        formData: response.formData,
        detectedInfo: response.detectedInfo
      }));

      // Play TTS if enabled
      if (response.message && !response.demoMode) {
        playTTS(response.message, ttsEnabled);
      }
    });

    newSocket.on('error', (error) => {
      toast.error(error.message || 'Connection error');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const startConversation = useCallback(async (userId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start conversation');
      }

      setConversation({
        id: data.data.conversationId,
        status: 'active',
        messages: [{
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date().toISOString()
        }],
        currentTopic: data.data.currentTopic,
        completedTopics: data.data.completedTopics || [],
        formData: data.data.formData || {},
        detectedInfo: data.data.detectedInfo || {}
      });

      // Join socket room
      if (socket) {
        socket.emit('join-conversation', { conversationId: data.data.conversationId });
      }

      return data.data;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket]);

  const sendMessage = useCallback(async (message) => {
    if (!conversation) {
      throw new Error('No active conversation');
    }

    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...(prev.messages || []), userMessage]
    }));

    // Send message through socket
    if (socket) {
      socket.emit('user-message', {
        userId: conversation.id,
        message,
        conversationId: conversation.id
      });
    } else {
      // Fallback to REST API
      try {
        const response = await fetch('/api/conversation/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: conversation.id,
            message,
            conversationId: conversation.id
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Add bot response
        setConversation(prev => ({
          ...prev,
          messages: [...(prev.messages || []), {
            role: 'assistant',
            content: data.data.message,
            timestamp: new Date().toISOString()
          }],
          currentTopic: data.data.currentTopic,
          completedTopics: data.data.completedTopics,
          formData: data.data.formData,
          detectedInfo: data.data.detectedInfo
        }));

        // Play TTS if enabled and not demo mode
        if (data.data.message && !data.data.demoMode) {
          playTTS(data.data.message, ttsEnabled);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        throw error;
      }
    }
  }, [conversation, socket]);

  const getConversationStatus = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/conversation/status/${userId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get conversation status');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting conversation status:', error);
      throw error;
    }
  }, []);

  const resetConversation = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/conversation/reset/${userId}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset conversation');
      }

      setConversation(null);
      toast.success('Conversation reset successfully');
      
      return data.data;
    } catch (error) {
      console.error('Error resetting conversation:', error);
      toast.error('Failed to reset conversation');
      throw error;
    }
  }, []);

  const getConversationSummary = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/conversation/summary/${userId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get conversation summary');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      throw error;
    }
  }, []);

  const upgradeToAgora = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/conversation/upgrade/${userId}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to upgrade to Agora');
      }

      // Update conversation state to use Agora
      setConversation(prev => ({
        ...prev,
        useAgora: true,
        agoraAgentId: data.data.agoraAgentId
      }));

      toast.success('Upgraded to Agora ConvoAI');
      
      return data.data;
    } catch (error) {
      console.error('Error upgrading to Agora:', error);
      toast.error('Failed to upgrade to Agora');
      throw error;
    }
  }, []);

  // TTS function to play agent responses
  const playTTS = useCallback(async (text, enabled = true) => {
    if (!enabled) return;
    
    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing TTS:', error);
    }
  }, []);

  return {
    conversation,
    loading,
    startConversation,
    sendMessage,
    getConversationStatus,
    resetConversation,
    getConversationSummary,
    upgradeToAgora,
    setConversation
  };
}; 