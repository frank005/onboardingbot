import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useConversation = (ttsEnabled = true) => {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);

  const startConversation = useCallback(async (userId) => {
    setLoading(true);
    try {
      // Create a simple conversation object - no server call needed
      const conversationData = {
        id: `conversation-${Date.now()}`,
        status: 'active',
        messages: [{
          role: 'assistant',
          content: "Hi! I'm your Welcome Bot. I'm here to help you get started with our platform. Let me guide you through the onboarding process.",
          timestamp: new Date().toISOString()
        }],
        currentTopic: 'platform_overview',
        completedTopics: [],
        formData: {},
        detectedInfo: []
      };

      setConversation(conversationData);
      return conversationData;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

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

    // No server call needed - messages are handled by Agora RTM
    // Just add a placeholder response for now
    console.log('Message sent via Agora RTM - no server response needed');
      }, [conversation]);

  const getConversationStatus = useCallback(async (userId) => {
    // No server call needed - return basic status
    return {
      status: 'active',
      currentTopic: 'platform_overview',
      completedTopics: []
    };
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