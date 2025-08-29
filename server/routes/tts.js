const express = require('express');
const router = express.Router();
const ttsService = require('../services/ttsService');

// Convert text to speech
router.post('/speak', async (req, res) => {
  try {
    const { text, provider } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required' 
      });
    }

    const audioBuffer = await ttsService.textToSpeech(text, { provider });
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);

  } catch (error) {
    console.error('Error in TTS:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech',
      message: error.message 
    });
  }
});

// Get TTS status
router.get('/status', (req, res) => {
  try {
    const status = ttsService.getTTSStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting TTS status:', error);
    res.status(500).json({ 
      error: 'Failed to get TTS status',
      message: error.message 
    });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await ttsService.getAvailableVoices();
    res.json({
      success: true,
      data: voices
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({ 
      error: 'Failed to get voices',
      message: error.message 
    });
  }
});

module.exports = router;
