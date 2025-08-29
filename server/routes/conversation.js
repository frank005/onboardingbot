const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversationService');
const aiService = require('../services/aiService');
const userService = require('../services/userService');

// Start a new conversation
router.post('/start', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    const result = await conversationService.startConversation(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ 
      error: 'Failed to start conversation',
      message: error.message 
    });
  }
});

// Stop a conversation
router.post('/stop/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    const result = await conversationService.stopConversation(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error stopping conversation:', error);
    res.status(500).json({ 
      error: 'Failed to stop conversation',
      message: error.message 
    });
  }
});

// Process user message
router.post('/message', async (req, res) => {
  try {
    const { userId, message, conversationId } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'User ID and message are required' 
      });
    }

    const result = await conversationService.processUserMessage({
      userId,
      message,
      conversationId
    });
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: error.message 
    });
  }
});

// Get conversation status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const status = conversationService.getConversationStatus(userId);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting conversation status:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation status',
      message: error.message 
    });
  }
});

// Upgrade conversation to use Agora
router.post('/upgrade/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await conversationService.upgradeToAgora(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error upgrading conversation:', error);
    res.status(500).json({ 
      error: 'Failed to upgrade conversation',
      message: error.message 
    });
  }
});

// Get conversation summary
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const summary = await conversationService.getConversationSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting conversation summary:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation summary',
      message: error.message 
    });
  }
});

// Reset conversation
router.post('/reset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await conversationService.resetConversation(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error resetting conversation:', error);
    res.status(500).json({ 
      error: 'Failed to reset conversation',
      message: error.message 
    });
  }
});

// Get all active conversations
router.get('/active', async (req, res) => {
  try {
    const conversations = conversationService.getActiveConversations();
    
    res.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error('Error getting active conversations:', error);
    res.status(500).json({ 
      error: 'Failed to get active conversations',
      message: error.message 
    });
  }
});

// Get conversation analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await conversationService.getConversationAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting conversation analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation analytics',
      message: error.message 
    });
  }
});

// Complete conversation manually
router.post('/complete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await conversationService.completeConversation(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error completing conversation:', error);
    res.status(500).json({ 
      error: 'Failed to complete conversation',
      message: error.message 
    });
  }
});

// Get AI conversation state
router.get('/ai-state/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const state = aiService.getConversationState(userId);
    
    res.json({
      success: true,
      data: state
    });

  } catch (error) {
    console.error('Error getting AI state:', error);
    res.status(500).json({ 
      error: 'Failed to get AI state',
      message: error.message 
    });
  }
});

// Update AI conversation state
router.put('/ai-state/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const state = aiService.updateConversationState(userId, updates);
    
    res.json({
      success: true,
      data: state
    });

  } catch (error) {
    console.error('Error updating AI state:', error);
    res.status(500).json({ 
      error: 'Failed to update AI state',
      message: error.message 
    });
  }
});

// Get conversation history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const state = aiService.getConversationState(userId);
    const history = state.conversationHistory.slice(-parseInt(limit));
    
    res.json({
      success: true,
      data: {
        userId,
        history,
        totalMessages: state.conversationHistory.length
      }
    });

  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation history',
      message: error.message 
    });
  }
});

// Export conversation data
router.get('/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const summary = await conversationService.getConversationSummary(userId);
    const userData = await userService.exportUserData(userId);
    
    const exportData = {
      conversation: summary,
      user: userData,
      exportedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Error exporting conversation data:', error);
    res.status(500).json({ 
      error: 'Failed to export conversation data',
      message: error.message 
    });
  }
});

// Extract profile information from conversation history
router.post('/extract-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await conversationService.extractProfileFromConversation(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error extracting profile from conversation:', error);
    res.status(500).json({ 
      error: 'Failed to extract profile from conversation',
      message: error.message 
    });
  }
});

// Update conversation progress
router.put('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentTopic, completedTopics } = req.body;
    
    conversationService.updateConversationProgress(userId, currentTopic, completedTopics);
    
    res.json({
      success: true,
      data: { currentTopic, completedTopics }
    });

  } catch (error) {
    console.error('Error updating conversation progress:', error);
    res.status(500).json({ 
      error: 'Failed to update conversation progress',
      message: error.message 
    });
  }
});

module.exports = router; 