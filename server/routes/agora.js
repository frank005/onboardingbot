const express = require('express');
const router = express.Router();
const agoraAgentService = require('../services/agoraAgentService');

// Get Agora configuration status
router.get('/config', (req, res) => {
  try {
    const status = agoraAgentService.getConfigStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create an Agora agent
router.post('/agents', async (req, res) => {
  try {
    const { channelName, agentUid, clientUid, prompt } = req.body;
    
    if (!channelName || !agentUid || !clientUid || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: channelName, agentUid, clientUid, prompt'
      });
    }

    const agentConfig = agoraAgentService.generateOnboardingAgentConfig(
      channelName, 
      agentUid, 
      clientUid, 
      prompt
    );

    const agent = await agoraAgentService.createAgent(agentConfig);
    
    // Track the agent
    agoraAgentService.trackAgent(req.body.userId || 'default', agent.agentId);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error creating Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update an Agora agent
router.put('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const updatePayload = req.body;
    
    const agent = await agoraAgentService.updateAgent(agentId, updatePayload);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error updating Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop an Agora agent
router.delete('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    await agoraAgentService.stopAgent(agentId);
    
    // Remove from tracking
    for (const [userId, trackedAgentId] of agoraAgentService.getTrackedAgents()) {
      if (trackedAgentId === agentId) {
        agoraAgentService.removeTrackedAgent(userId);
        break;
      }
    }
    
    res.json({
      success: true,
      message: `Agent ${agentId} stopped successfully`
    });
  } catch (error) {
    console.error('Error stopping Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Query an Agora agent
router.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const agent = await agoraAgentService.queryAgent(agentId);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error querying Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await agoraAgentService.listAgents();
    
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error listing Agora agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get agent history
router.get('/agents/:agentId/history', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const history = await agoraAgentService.getAgentHistory(agentId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting Agora agent history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send chat message to agent (text or image)
router.post('/agents/:agentId/chat', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { messageType, text, url, uuid, priority = 'INTERRUPT', interruptable = true } = req.body;
    
    if (!messageType || (messageType !== 'text' && messageType !== 'image')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message type. Must be "text" or "image"'
      });
    }
    
    if (messageType === 'text' && !text) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required for text messages'
      });
    }
    
    if (messageType === 'image' && !url) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required for image messages'
      });
    }
    
    let result;
    
    if (messageType === 'text') {
      result = await agoraAgentService.sendTextMessage(agentId, text, priority, interruptable, uuid);
    } else if (messageType === 'image') {
      result = await agoraAgentService.sendImageMessage(agentId, url, uuid);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending chat message to Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy broadcast endpoint for backward compatibility
router.post('/agents/:agentId/broadcast', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { text, priority = 'INTERRUPT', interruptable = true } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }
    
    const result = await agoraAgentService.broadcastMessage(agentId, text, priority, interruptable);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error broadcasting message to Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Interrupt agent
router.post('/agents/:agentId/interrupt', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await agoraAgentService.interruptAgent(agentId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error interrupting Agora agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get tracked agents
router.get('/tracked-agents', (req, res) => {
  try {
    const trackedAgents = agoraAgentService.getTrackedAgents();
    
    res.json({
      success: true,
      data: trackedAgents
    });
  } catch (error) {
    console.error('Error getting tracked agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 