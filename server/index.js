const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');



// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://localhost:3002", "https://localhost:3002"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://localhost:3002", "https://localhost:3002"],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Import modules
const agoraService = require('./services/agoraService');
const agoraAgentService = require('./services/agoraAgentService');
const aiService = require('./services/aiService');
const userService = require('./services/userService');
const conversationService = require('./services/conversationService');
const avatarService = require('./services/avatarService');
const ttsService = require('./services/ttsService');
const asrService = require('./services/asrService');
const mllmService = require('./services/mllmService');

// Routes
app.use('/api/agora', require('./routes/agora'));
app.use('/api/conversation', require('./routes/conversation'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tts', require('./routes/tts'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-conversation', (data) => {
    socket.join(data.conversationId);
    console.log(`User ${socket.id} joined conversation ${data.conversationId}`);
  });
  
  socket.on('user-message', async (data) => {
    try {
      const response = await conversationService.processUserMessage(data);
      socket.emit('bot-response', response);
    } catch (error) {
      console.error('Error processing user message:', error);
      socket.emit('error', { message: 'Error processing message' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    // Bot configuration
    botName: process.env.BOT_NAME || 'Welcome Bot',
    botPersonality: process.env.BOT_PERSONALITY || 'friendly and helpful',
    enableVoiceInput: process.env.ENABLE_VOICE_INPUT === 'true',
    enableTextInput: process.env.ENABLE_TEXT_INPUT === 'true',
    enableAvatarDisplay: process.env.ENABLE_AVATAR_DISPLAY === 'true',
    avatarImageUrl: process.env.AVATAR_IMAGE_URL,
    onboardingFields: process.env.ONBOARDING_FORM_FIELDS?.split(',') || [],
    requiredFields: process.env.REQUIRED_FIELDS?.split(',') || [],
    optionalFields: process.env.OPTIONAL_FIELDS?.split(',') || [],
    
    // Client-side environment variables (safe to expose)
    clientConfig: {
      REACT_APP_AGORA_APP_ID: process.env.AGORA_APP_ID,
      REACT_APP_AGORA_CHANNEL: process.env.AGORA_CHANNEL || 'onboarding_channel',
      REACT_APP_TTS_VENDOR: process.env.TTS_VENDOR || 'microsoft',
      REACT_APP_ASR_VENDOR: process.env.ASR_VENDOR || 'agora',
      REACT_APP_ENABLE_RTM: process.env.ENABLE_RTM_MESSAGING === 'true',
      REACT_APP_ENABLE_RTC_VIDEO: process.env.ENABLE_RTC_VIDEO === 'true',
      REACT_APP_ENABLE_RTC_AUDIO: process.env.ENABLE_RTC_AUDIO === 'true',
      REACT_APP_AVATAR_ENABLED: process.env.AVATAR_ENABLED === 'true',
      REACT_APP_AGORA_FALLBACK_ENABLED: process.env.AGORA_FALLBACK_ENABLED === 'true'
    },
    
    // Service status
    agoraConfig: agoraService.getConfig(),
    agoraAgentStatus: agoraAgentService.getConfigStatus(),
    avatarStatus: avatarService.getAvatarStatus(),
    ttsStatus: ttsService.getTTSStatus(),
    asrStatus: asrService.getASRStatus(),
    mllmStatus: mllmService.getMLLMStatus(),
    rtmEnabled: process.env.ENABLE_RTM_MESSAGING === 'true',
    rtcVideoEnabled: process.env.ENABLE_RTC_VIDEO === 'true',
    rtcAudioEnabled: process.env.ENABLE_RTC_AUDIO === 'true'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚙️  Configuration: http://localhost:${PORT}/api/config`);
});

module.exports = { app, io }; 