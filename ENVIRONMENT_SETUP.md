# Environment Variables Setup Guide

## Overview

This application uses a **single `.env` file** in the root directory for all environment variables. This ensures consistency and makes deployment easier.

## File Structure

```
useronboarding/
├── .env                    # ✅ SINGLE SOURCE OF TRUTH - All environment variables here
├── server/                 # Server-side code (Node.js)
├── client/                 # Client-side code (React)
└── ...
```

## How It Works

### Server-Side (Node.js)
- Reads directly from root `.env` file
- Uses `dotenv.config()` in `server/index.js`
- All server services access `process.env.VARIABLE_NAME`

### Client-Side (React)
- **Cannot** directly read from `.env` files for security reasons
- Configuration is loaded via the server's `/api/config` endpoint
- Client config service fetches and sets `window.VARIABLE_NAME` variables
- Falls back to `process.env.REACT_APP_*` for build-time variables

## Environment Variables

### Required Variables

```bash
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_CUSTOMER_ID=your_agora_customer_id
AGORA_CUSTOMER_SECRET=your_agora_customer_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# TTS Configuration
TTS_VENDOR=microsoft
MICROSOFT_TTS_API_KEY=your_microsoft_tts_key
MICROSOFT_TTS_REGION=eastus
MICROSOFT_TTS_VOICE=en-US-AvaMultilingualNeural
```

### Optional Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Bot Configuration
BOT_NAME=Welcome Bot
BOT_PERSONALITY=friendly and helpful

# Agora Channel
AGORA_CHANNEL=onboarding_channel

# Feature Flags
ENABLE_RTM_MESSAGING=true
ENABLE_RTC_VIDEO=true
ENABLE_RTC_AUDIO=true
AVATAR_ENABLED=false
AGORA_FALLBACK_ENABLED=true

# ASR Configuration
ASR_VENDOR=agora
ASR_LANGUAGE=en-US
```

## Deployment

### Local Development
1. Create `.env` file in root directory
2. Add all required variables
3. Run `npm run dev`

### Netlify Deployment
1. Add environment variables in Netlify dashboard
2. **Important**: All variables should be added to Netlify's environment variables section
3. No need for separate client/server variables - the server will expose what the client needs

### Other Platforms
- **Vercel**: Add environment variables in Vercel dashboard
- **Heroku**: Use `heroku config:set VARIABLE_NAME=value`
- **Docker**: Use `--env-file .env` or `-e VARIABLE_NAME=value`

## Configuration Flow

```
1. Server starts → loads .env file
2. Client loads → fetches /api/config from server
3. Server returns safe client variables
4. Client sets window.VARIABLE_NAME for use
5. All components use window.VARIABLE_NAME || process.env.VARIABLE_NAME
```

## Troubleshooting

### "Environment variable not found"
- Check that variable exists in root `.env` file
- Ensure variable name matches exactly (case-sensitive)
- Restart server after adding new variables

### "Client can't access variable"
- Check that variable is exposed in `/api/config` endpoint
- Verify client config service is loading properly
- Check browser console for config loading errors

### "Different values in client vs server"
- Clear browser cache
- Restart both client and server
- Check that both are using the same `.env` file

## Security Notes

- **Never** commit `.env` file to version control
- **Never** expose API keys in client-side code
- Server only exposes safe variables via `/api/config`
- Sensitive variables (API keys) stay server-side only

## Example .env File

```bash
# Agora Configuration
AGORA_APP_ID=a9a4b25e4e8b4a558aa39780d1a84342
AGORA_CUSTOMER_ID=your_customer_id
AGORA_CUSTOMER_SECRET=your_customer_secret
AGORA_CHANNEL=onboarding_channel

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# TTS Configuration
TTS_VENDOR=microsoft
MICROSOFT_TTS_API_KEY=ba573d477e1c44f99ee0083e81e3e7cf
MICROSOFT_TTS_REGION=eastus
MICROSOFT_TTS_VOICE=en-US-AvaMultilingualNeural

# Server Configuration
PORT=3001
NODE_ENV=development

# Bot Configuration
BOT_NAME=Welcome Bot
BOT_PERSONALITY=friendly and helpful

# Feature Flags
ENABLE_RTM_MESSAGING=true
ENABLE_RTC_VIDEO=true
ENABLE_RTC_AUDIO=true
AVATAR_ENABLED=false
AGORA_FALLBACK_ENABLED=true

# ASR Configuration
ASR_VENDOR=agora
ASR_LANGUAGE=en-US
```

## Migration from Multiple .env Files

If you previously had multiple `.env` files:

1. **Delete** `client/.env` file
2. **Keep** only root `.env` file
3. **Move** all variables to root `.env`
4. **Remove** `REACT_APP_` prefixes (server handles this)
5. **Restart** application

The application will now use the unified configuration system.
