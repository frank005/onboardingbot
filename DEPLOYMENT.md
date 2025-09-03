# Agora Convo AI - Deployment Guide for Netlify

## 🚀 Quick Deploy to Netlify

### 1. Prerequisites
- [Netlify account](https://netlify.com)
- [GitHub repository](https://github.com) with this code
- Agora Convo AI credentials

### 2. Deploy Steps

#### Option A: Deploy via Netlify Dashboard
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"New site from Git"**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `cd client && npm install && npm run build`
   - **Publish directory**: `client/build`
   - **Functions directory**: `netlify/functions`
5. Click **"Deploy site"**

#### Option B: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### 3. Environment Variables

Set these environment variables in your Netlify dashboard:

1. Go to **Site settings** > **Environment variables**
2. Add the following variables:

```bash
# Required: Agora Configuration
AGORA_APP_ID=your_agora_app_id_here
AGORA_CUSTOMER_ID=your_customer_id_here
AGORA_CUSTOMER_SECRET=your_customer_secret_here

# Required: OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Required: Microsoft TTS Configuration
MICROSOFT_TTS_API_KEY=your_microsoft_tts_key_here
MICROSOFT_TTS_REGION=eastus

# Optional: API URLs (defaults provided)
AGORA_API_BASE_URL=https://api.agora.io/api/conversational-ai-agent/v2
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```

### 4. Verify Deployment

After deployment, verify your Netlify Functions:

```bash
# Test agent creation
curl -X POST https://your-site.netlify.app/.netlify/functions/agora/agents \
  -H "Content-Type: application/json" \
  -d '{"channelName":"test","agentUid":8888,"clientUid":1234,"prompt":"Hello"}'

# Should return: {"success":true,"data":{"agent_id":"..."}}
```

## 🔧 Local Development

### 1. Install Dependencies
```bash
# Install client dependencies
cd client
npm install

# Install Netlify Functions dependencies
cd ../netlify/functions
npm install
```

### 2. Environment Setup
Create `.env.local` in the root directory:
```bash
AGORA_APP_ID=your_agora_app_id_here
AGORA_CUSTOMER_ID=your_customer_id_here
AGORA_CUSTOMER_SECRET=your_customer_secret_here
OPENAI_API_KEY=your_openai_api_key_here
MICROSOFT_TTS_API_KEY=your_microsoft_tts_key_here
MICROSOFT_TTS_REGION=eastus
```

### 3. Run Development Server

#### Option A: Netlify Dev (Recommended)
```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start Netlify dev server (runs both client and functions)
netlify dev
```

#### Option B: Separate Development
```bash
# Terminal 1: Start React app
cd client
npm start

# Terminal 2: Start Netlify Functions (optional, for testing)
cd netlify/functions
netlify dev --functions-only
```

## 📱 Client Configuration

### 1. API Endpoints
The client automatically uses the correct Netlify Function endpoints:

- **Create Agent**: `/.netlify/functions/agora/agents`
- **Send Chat**: `/.netlify/functions/agora/agents/:id/chat`
- **Interrupt**: `/.netlify/functions/agora/agents/:id/interrupt`
- **Stop Agent**: `/.netlify/functions/agora/agents/:id`

### 2. Environment Variables
The client will automatically use environment variables prefixed with `REACT_APP_`:

```bash
REACT_APP_AGORA_APP_ID=your_agora_app_id_here
REACT_APP_AGORA_CHANNEL=onboarding_channel
```

## 🧪 Testing

### 1. Test Profile Parsing
1. Start a conversation with the agent
2. Verify markers are hidden in UI
3. Check profile updates in browser console
4. Verify sessionStorage persistence

### 2. Test Netlify Functions
```bash
# Test agent creation
curl -X POST /.netlify/functions/agora/agents \
  -H "Content-Type: application/json" \
  -d '{"channelName":"test","agentUid":8888,"clientUid":1234,"prompt":"Hello"}'

# Test chat
curl -X POST /.netlify/functions/agora/agents/AGENT_ID/chat \
  -H "Content-Type: application/json" \
  -d '{"messageType":"text","text":"Hello agent"}'

# Test interrupt
curl -X POST /.netlify/functions/agora/agents/AGENT_ID/interrupt

# Test stop
curl -X DELETE /.netlify/functions/agora/agents/AGENT_ID
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Agora configuration missing"
- Verify all environment variables are set in Netlify dashboard
- Check variable names match exactly (case-sensitive)
- Ensure variables are set for the correct environment (production/development)

#### 2. "Failed to create agent"
- Verify Agora credentials are correct
- Check Agora API base URL
- Ensure OpenAI API key is valid

#### 3. Client can't connect to functions
- Verify Netlify Functions are deployed
- Check function logs in Netlify dashboard
- Ensure CORS headers are set correctly

#### 4. Profile not updating
- Check browser console for parsing errors
- Verify markers are being emitted by agent
- Check sessionStorage in browser dev tools

### Debug Mode

Enable debug logging in the client:

```javascript
// In client/src/utils/profile-sync.js
export const FEATURE_FLAGS = {
  FINAL_ONLY_PARSE: true,
  HIDE_MARKERS_IN_CAPTIONS: true,
  ENABLE_FALLBACK_PARSING: true,
  DEBUG: true  // Add this line
};
```

## 📊 Monitoring

### Netlify Analytics
- Monitor function performance
- Track error rates and response times
- View function invocations and cold starts

### Function Logs
- View logs in Netlify dashboard
- Monitor Agora API responses
- Debug function execution

## 🔒 Security

### Environment Variables
- Never commit API keys to version control
- Use Netlify's environment variable encryption
- Rotate keys regularly

### Function Security
- Functions run in isolated environment
- No persistent server state
- Automatic scaling and load balancing

## 📈 Scaling

### Automatic Scaling
- Netlify automatically scales based on demand
- No manual configuration required
- Global CDN for optimal performance

### Performance Optimization
- Functions are stateless
- Cold start optimization
- Connection pooling for Agora APIs

## 🎯 Production Checklist

- [ ] Environment variables configured in Netlify
- [ ] Netlify Functions deployed and working
- [ ] Client configured with correct endpoints
- [ ] Profile parsing verified
- [ ] Marker cleanup working in UI
- [ ] Session storage persistence confirmed
- [ ] Error handling tested
- [ ] Performance monitoring enabled

## 📞 Support

For issues with:
- **Netlify Deployment**: [Netlify Support](https://netlify.com/support)
- **Agora API**: [Agora Support](https://agora.io/support)
- **Implementation**: Check this repository's issues

---

**🎉 Your Agora Convo AI system is now deployed on Netlify and ready for production use!**
