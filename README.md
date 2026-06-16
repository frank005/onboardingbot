# Agora Conversational AI Demo - User Onboarding

A comprehensive conversational AI demo showcasing user onboarding with voice integration, data collection, and analytics. **Enhanced with Agora's official Conversational AI API, AI Avatar support, and advanced multimodal capabilities.**

---

## 🆕 Recent Changes

### Agora Presets (ASR, LLM, TTS)
The agent now supports **Agora-managed presets** so you no longer need vendor API keys. Set any of the following env vars to use presets (Agora handles the keys):
- `ASR_PRESET` — `deepgram_nova_2`, `deepgram_nova_3` (or leave blank for `ares`)
- `LLM_PRESET` — `openai_gpt_4o_mini`, `openai_gpt_4_1_mini`, `openai_gpt_5_nano`, `openai_gpt_5_mini`
- `TTS_PRESET` — `minimax_speech_2_6_turbo`, `minimax_speech_2_8_turbo`, `openai_tts_1`

When a preset is set, the corresponding API key (`OPENAI_API_KEY`, `MICROSOFT_TTS_API_KEY`) is **not** needed. Leaving a preset blank falls back to the original env-var key mode.

Vendor-specific preset params:
- MiniMax: `TTS_MINIMAX_VOICE_ID`, `TTS_MINIMAX_SAMPLE_RATE`
- OpenAI TTS: `TTS_OPENAI_VOICE`, `TTS_OPENAI_SPEED`
- LLM: `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, `LLM_MAX_HISTORY` (apply in both preset and key mode)

### Token Authentication
Added support for App-Certificate-based RTC tokens:
- New env var `AGORA_APP_CERTIFICATE` enables token mode
- New endpoint `/api/token` (Netlify function `token.mjs`) returns combined RTC+RTM tokens for clients
- Agent token is generated server-side in `agora-agents.mjs`
- If `AGORA_APP_CERTIFICATE` is not set, falls back to tokenless mode (App ID only)

### Agora SSO + daily demo quota
Ported from [agora-sso-starter](https://github.com/) (Jay's recipe) — **no database**:

- **SSO login** via Netlify Functions (`/api/auth/agora/*`, `/api/auth/me`) with HttpOnly session JWT (`SESSION_JWT_SECRET`)
- **Local dev:** set `AUTH_MODE=bypass` for a synthetic demo user (no SSO credentials needed)
- **Production:** set `AUTH_MODE=sso` and configure `AGORA_SSO_*` vars (see `env.example`)
- **15 min/day limit:** client-side only via `REACT_APP_DEMO_QUOTA_SECONDS=900` and `localStorage` (not Redis — soft enforcement). **Unlimited** for `@agora.io` / `*.agora.io` email addresses.
- **SSO callback URL (production):** `https://onboardingbot.netlify.app/console-callback` — set `AGORA_SSO_REDIRECT_URI` to match and whitelist with Agora SSO admin.
- Sensitive APIs (`/api/token`, `/api/agora/agents*`) require a valid session cookie

See `env.example` for all auth-related variables.

### Login system (legacy removed)
The previous Netlify Blobs auth/login system has been removed. It is replaced by Agora SSO above.

Auth-related env vars no longer used: `SESSION_SECRET`, `MASTER_EMAIL`, `MASTER_PASSWORD`, `ALLOWED_USERS`, `NETLIFY_SITE_ID`, `NETLIFY_BLOBS_TOKEN`, `BYPASS_AUTH`.

---


## 🎯 Project Overview

This demo demonstrates how Agora's conversational AI can be used for user onboarding, featuring:

- **Voice-to-voice conversational AI avatar** for guided user onboarding
- **Intelligent data collection** from conversations
- **User skill assessment** and preference detection
- **Real-time analytics** and conversation tracking
- **Customizable prompts** and configuration
- **Modern React UI** with beautiful animations
- **🎤 AI Avatar Support** - Real-time video avatars with HeyGen/Akool
- **🎵 Advanced TTS/ASR** - Multiple vendors (Microsoft, ElevenLabs, OpenAI, Hume AI)
- **🔄 Multimodal LLM** - Real-time audio/image/text processing
- **📊 Advanced Analytics** - Voice activity detection and turn management

## 🚀 Features

### Core Functionality
- **Conversational Onboarding Flow**: Three-stage onboarding process
  - Platform Overview
  - Profile Setup (Name, Birthday, Bio, Interests, Experience Level)
  - Additional Questions & Personalization

### AI Capabilities
- **Dynamic Prompt Management**: Environment-based configuration
- **Context-Aware Responses**: Maintains conversation state and history
- **Data Extraction**: Automatically extracts user information from conversations
- **Skill Assessment**: Detects user experience levels and preferences
- **Personalization**: Tailors responses based on collected data

### Voice Integration
- **Agora Voice SDK**: Real-time voice communication
- **Voice-to-Text**: Speech recognition for user input
- **Text-to-Speech**: AI voice responses
- **Voice Analytics**: Call quality and performance metrics

### 🎤 AI Avatar Support ⭐ **NEW**
- **Real-time Video Avatars**: HeyGen and Akool integration
- **Professional Placeholders**: Neural network SVG design
- **Seamless Transitions**: Placeholder to live video stream
- **Quality Control**: Configurable video quality settings
- **Timeout Management**: Automatic avatar state management

### 🎵 Advanced TTS/ASR ⭐ **NEW**
- **Microsoft TTS**: 30+ regions, extensive voice library
- **ElevenLabs TTS**: High-quality voice cloning
- **Cartesia TTS**: Ultra-fast, low-latency streaming
- **OpenAI TTS**: Neural voice synthesis
- **Hume AI TTS**: Customizable speed and silence control
- **Agora ASR**: Built-in speech recognition
- **Microsoft ASR**: High-accuracy recognition
- **Deepgram ASR**: Real-time streaming

### 🔄 Multimodal LLM Support ⭐ **NEW**
- **Real-time WebSocket Communication**: Direct OpenAI Realtime API
- **Streaming Audio Processing**: Live audio analysis
- **Image Analysis**: Camera integration for visual input
- **Advanced Turn Detection**: Semantic VAD and interruption handling
- **Conversation Management**: Configurable history and eagerness

### Data Collection & Analytics
- **User Profiles**: Comprehensive user data management
- **Conversation Analytics**: Detailed conversation tracking
- **Detected Information**: Automatic extraction of user preferences
- **Export Capabilities**: Data export for further analysis

### UI/UX Features
- **Modern React Interface**: Beautiful, responsive design
- **Real-time Updates**: Live conversation updates via WebSocket
- **Progress Tracking**: Visual onboarding progress indicators
- **Voice Controls**: Easy voice input/output toggles
- **Profile Management**: User profile and data visualization

## 🛠️ Technology Stack

### Backend
- **Node.js/Express**: RESTful API server
- **Socket.IO**: Real-time communication
- **OpenAI API**: Conversational AI processing
- **Agora SDK**: Voice communication
- **Agora Conversational AI API**: Official agent management
- **In-memory Storage**: User data and conversation state

### Frontend
- **React 18**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **Socket.IO Client**: Real-time updates
- **Lucide React**: Beautiful icons

### AI & Voice
- **OpenAI GPT-4**: Advanced language model
- **Agora RTC**: Real-time voice communication
- **Custom Prompt Engineering**: Specialized onboarding prompts
- **AI Avatar Vendors**: HeyGen, Akool integration

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- OpenAI API key
- Agora account with Conversational AI access
- (Optional) HeyGen/Akool account for AI avatars
- (Optional) TTS vendor accounts (Microsoft, ElevenLabs, etc.)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd onboardingbot
npm install
```

### 2. Environment Setup

Copy the environment example and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
AGORA_CUSTOMER_ID=your_agora_customer_id
AGORA_CUSTOMER_SECRET=your_agora_customer_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# AI Avatar (Optional)
ENABLE_AI_AVATAR=true
AVATAR_VENDOR=heygen
AVATAR_API_KEY=your_avatar_api_key
AVATAR_ID=your_avatar_id

# TTS Configuration (Optional)
TTS_VENDOR=microsoft
MICROSOFT_TTS_API_KEY=your_microsoft_tts_key
MICROSOFT_TTS_REGION=eastus
MICROSOFT_TTS_VOICE=en-US-EvelynMultilingualNeural

# Bot Configuration
BOT_NAME=Welcome Bot
BOT_PERSONALITY=friendly and helpful

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

This will start the Netlify dev server with both frontend and backend functions.

### 4. Access the Demo

Open your browser to `http://localhost:8888`

## 📊 Demo Flow

### 1. Welcome Screen
- User sees the conversational AI interface
- Clicks "Start Conversation" to begin onboarding

### 2. Platform Overview
- Bot asks if user wants platform overview
- Provides feature explanations or directs to guide
- Detects user's technical comfort level

### 3. Profile Setup
- Conversational form completion
- Collects: Name, Birthday, Bio, Interests, Experience Level
- Validates required fields
- Stores responses in user profile

### 4. Additional Conversation
- Asks for additional questions
- Engages in natural conversation
- Detects and notes:
  - User interests and hobbies
  - Technical skill level
  - Communication preferences
  - Upcoming events or plans
  - Gender (if mentioned)

### 5. Data Output

**Frontend Output:**
```
Welcome, Bill

Profile Information
Name: Bill
Birthday: 01/01/1991
Profile Biography: "Happy to be here"
```

**Backend Data Table:**
```
User ID: xxx
Form Fields
Name: Bill
Birthday: 01/01/1991
Profile Biography: "Happy to be here"

Added Detected Information
Gender Detected: Male
Interests: hockey, cooking, hiking
User Experience: Low
{Subject} Proficiency Level: Low
Other User Notes: "trip to France in one month"
```

## 🔧 Configuration Options

### Environment Variables

All settings can be configured via environment variables:

```env
# AI Configuration
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Bot Personality
BOT_NAME=Welcome Bot
BOT_PERSONALITY=friendly and helpful

# Onboarding Flow
ENABLE_PLATFORM_OVERVIEW=true
ENABLE_ONBOARDING_FORM=true
ENABLE_ADDITIONAL_CONVERSATION=true

# Data Collection
COLLECT_USER_PREFERENCES=true
COLLECT_SKILL_ASSESSMENT=true
COLLECT_CONVERSATION_ANALYTICS=true

# UI Features
ENABLE_VOICE_INPUT=true
ENABLE_TEXT_INPUT=true
ENABLE_AVATAR_DISPLAY=true

# AI Avatar Configuration
ENABLE_AI_AVATAR=false
AVATAR_VENDOR=heygen
AVATAR_API_KEY=your_avatar_api_key
AVATAR_ID=your_avatar_id

# TTS Configuration
TTS_VENDOR=microsoft
MICROSOFT_TTS_API_KEY=your_microsoft_tts_key
MICROSOFT_TTS_REGION=eastus
MICROSOFT_TTS_VOICE=en-US-EvelynMultilingualNeural

# Advanced Features
ENABLE_AIVAD=false
ENABLE_RTM=false
ENABLE_TURN_DETECTION=true
VAD_TYPE=agora
INTERRUPT_MODE=interrupt
```

### Customizable Prompts

The AI prompts are dynamically generated based on:
- Current conversation topic
- User's progress through onboarding
- Collected user data
- Bot personality settings

## 📈 Analytics & Insights

### Conversation Analytics
- Total conversations
- Completion rates
- Topic completion percentages
- Average conversation length

### User Analytics
- Profile completeness
- Detected preferences
- Skill assessments
- Onboarding duration

### Voice Analytics
- Call quality metrics
- Voice feature usage
- Audio performance data

### AI Avatar Analytics
- Avatar usage statistics
- Video quality metrics
- User engagement with avatars

## 🔮 Business Value

### Immediate Benefits
- **Reduced Onboarding Friction**: Conversational interface vs. traditional forms
- **Higher Completion Rates**: Engaging, guided experience
- **Rich User Data**: Comprehensive user profiles with preferences
- **Personalization**: Tailored experiences based on collected data

### Additional Business Opportunities
- **Tailored Notifications**: Personalized alerts based on user preferences
- **Marketing Automation**: Highly relevant email campaigns
- **User Segmentation**: Better grouping of like-minded users
- **Platform Optimization**: Data-driven feature improvements

### Future Expansion
- **Customer Service Bot**: AI-powered support with personal context
- **Product Recommendations**: AI-driven suggestions based on user data
- **Advanced Analytics**: Predictive user behavior modeling
- **Multi-language Support**: Global user onboarding

## 🏗️ Architecture

### Backend Services
```
server/
├── services/
│   ├── aiService.js          # OpenAI integration & conversation logic
│   ├── conversationService.js # Conversation flow management
│   ├── userService.js        # User data management
│   ├── agoraService.js       # Agora Conversational AI API integration
│   ├── avatarService.js      # AI Avatar support (HeyGen/Akool)
│   └── ttsService.js         # Multi-vendor TTS support
├── routes/
│   ├── conversation.js       # Conversation API endpoints
│   ├── users.js             # User management endpoints
│   └── agora.js             # Voice API endpoints
└── index.js                 # Main server file
```

### Frontend Components
```
client/src/
├── components/
│   ├── ConversationInterface.js # Main chat interface
│   ├── MessageBubble.js        # Individual message display
│   ├── VoiceRecorder.js        # Voice input component
│   ├── UserProfileCard.js      # User data visualization
│   └── Navigation.js           # App navigation
├── hooks/
│   ├── useConversation.js      # Conversation state management
│   └── useUser.js             # User state management
└── App.js                     # Main application component
```

## 🧪 Testing

### Manual Testing
1. Start the application
2. Begin a conversation
3. Test each onboarding stage
4. Verify data collection
5. Check analytics dashboard

### API Testing
```bash
# Test conversation endpoints
curl -X POST http://localhost:3001/api/conversation/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user"}'

# Test message processing
curl -X POST http://localhost:3001/api/conversation/message \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user", "message": "Hello"}'

# Test Agora agent creation
curl -X POST http://localhost:3001/api/agora/agent \
  -H "Content-Type: application/json" \
  -d '{"agentConfig": {...}}'
```

## 🚀 Deployment

### Production Setup
1. Set environment variables for production
2. Configure database (replace in-memory storage)
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

## 🎯 Next Steps

### Immediate Enhancements
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Advanced voice features
- [ ] Multi-language support
- [ ] Enhanced analytics dashboard
- [ ] AI Avatar video streaming
- [ ] MLLM real-time processing

### Future Roadmap
- [ ] Customer service bot integration
- [ ] Advanced personalization
- [ ] Predictive analytics
- [ ] Mobile app development
- [ ] Multi-modal conversation support
- [ ] Advanced turn detection algorithms

---

**Built with ❤️ for Agora's Conversational AI Platform**

**Enhanced with official Agora Conversational AI API, AI Avatar support, advanced TTS/ASR vendors, and multimodal LLM capabilities.** 