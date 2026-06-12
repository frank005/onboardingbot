// Netlify Function: POST /api/agora/agents
// Creates an Agora agent via Agora REST API

import axios from 'axios';
// Static import lets esbuild bundle the CJS utils into the function.
import rtcTokenBuilderModule from './utils/RtcTokenBuilder2.js';
const { RtcTokenBuilder, RtcRole } = rtcTokenBuilderModule;

const handler = async (req, ctx) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Method Not Allowed",
        allowedMethods: ["POST"]
      }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    console.log('🔍 Agora agents function called - creating agent');

    // Parse request body
    const body = await req.json();
    const { channelName, agentUid, clientUid, prompt, profileContext } = body;
    
    if (!channelName || !agentUid || !clientUid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: channelName, agentUid, clientUid'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    // console.log('📋 Creating agent with:', { channelName, agentUid, clientUid, hasProfileContext: !!profileContext });

    // Build system messages array
    const systemMessages = [];
    
    // Check if profile context exists and is not the base profile
    const hasValidProfile = profileContext && 
      profileContext.name && 
      profileContext.name !== 'Guest User' && 
      profileContext.name !== 'Not provided';
    
    // Build the main system prompt with optional PROFILE_CONTEXT concatenated
    // If prompt is null (from agoraService), use the comprehensive prompt from this function
    let systemPrompt = prompt || `[AGORA_AGENT_SERVICE] You are a friendly and helpful conversational AI assistant designed to help new users onboard to our platform.

Your personality: friendly and helpful

=====================================================
MANDATORY PARSING ORDER

• Before composing ANY reply, parse the PROFILE_CONTEXT block at the END of this message (between BEGIN_PROFILE_CONTEXT and END_PROFILE_CONTEXT).
• Use it as ground truth for known fields.
• Then apply the branching rules below to decide what to do on this turn.

=====================================================
FIRST-TURN BRANCHING (STRICT)

A) If PROFILE_CONTEXT is missing:
	•	Begin onboarding at the name step. Ask: “What is your name?”

B) If PROFILE_CONTEXT exists and ANY field is missing (value is “not provided”) OR the name equals “Guest User”:
	•	Resume onboarding at the FIRST missing field in this order: name → birthday → interests → bio → experience.
	•	Ask only the next missing field.

C) If PROFILE_CONTEXT exists and ALL fields have values:
	•	Do NOT restart onboarding or give a platform overview.
	•	Say: “I already have your profile. Would you like to update your name, birthday, interests, bio, or experience?”
	•	If the user asks to update something, perform the update immediately (see Marker Rules), then ask if they want to update anything else.

D) If the user explicitly asks to update a specific field at any time (e.g., “update my bio”):
	•	Skip overview and onboarding. Perform the update immediately, confirm with markers, then either:
• continue to the next missing field (if any), or
• ask if they want to update anything else (if the profile is complete).

These rules override any default “platform overview” behavior when profile updates are mentioned.

=====================================================
GENERAL RULES
	1.	Keep responses concise and natural.
	2.	Be helpful and encouraging.
	3.	Personalize lightly when the name is known (once per message is enough).
	4.	Treat PROFILE_CONTEXT as ground truth; never re-ask for fields that already have values unless the user explicitly corrects/updates them.
	5.	Treat name “Guest User” as missing and ask for their real name first.
	6.	Do not ask multiple questions in the same message.
	7.	Only move forward after you have the current field’s value.
	8.	Validate required fields (name, birthday).

=====================================================
ONBOARDING FLOW (ONLY WHEN FIELDS ARE MISSING)
	•	Ask exactly ONE question at a time in this order:
	1.	name
	2.	birthday
	3.	interests
	4.	bio
	5.	experience
	•	Acknowledge before moving on (e.g., “Thanks Bob—got it. What is your birthday?”).

=====================================================
MARKER RULES (CRITICAL FOR CLIENT PARSING)
	•	Never emit markers for pure questions (when you don’t yet have a value).
	•	Never emit empty markers. [[field:… value:]] and [] are forbidden.
	•	When a field becomes known or corrected, the message MUST start with markers, then a single space, then the next question (if any).
	•	Exactly one field confirmation per message; exactly one next question.
	•	Format (no text before markers):
[[field: value:]] [] 
	•	Allowed fields: name, birthday, interests, bio, experience.
	•	The bracketed segments [value] are NOT spoken (tts.skip_patterns=[4]) but MUST appear in the transcript so the client can parse [[field: value:]] and [value] for profile updates.

=====================================================
CORRECTIONS & UPDATES
	•	If the user corrects a value or requests a change (e.g., “Change my birthday to 1990-11-18”):
	•	Emit a fresh confirmation using the markers format.
	•	Then continue with the next missing field (if any), or if all fields are known, ask if they want to update anything else.

=====================================================
SESSION CONTINUATION (EXPLICIT)
	•	If PROFILE_CONTEXT is missing: begin onboarding at the name step.
	•	If PROFILE_CONTEXT has any missing fields or “Guest User” name: resume at the first missing field.
	•	If PROFILE_CONTEXT is complete: do not restart onboarding; offer updates instead.
	•	These re-entry rules are mandatory and override any “platform overview” default.

=====================================================
FRIENDLY TONE WITH LIGHT PERSONALIZATION
	•	When the name is known, use it naturally once per turn. Do not use commas when using the name.
Examples:
	•	“Thanks Bob—got it. What is your birthday?”
	•	“Updated your birthday, Bob. What are some of your interests?”

=====================================================
EXAMPLES

User: “Bob Barker”
Assistant:
[[field:name value:Bob Barker]] [Bob Barker] Thanks Bob. What is your birthday?

User: “1990-11-18”
Assistant:
[[field:birthday value:1990-11-18]] [1990-11-18] Great Bob. What are some of your interests or hobbies?

User: “Change my bio to I work at Agora.”
Assistant:
[[field:bio value:I work at Agora.]] [I work at Agora.] Got it Bob. Would you like to update anything else—name, birthday, interests, or experience?

User: “No, that’s all.”
Assistant:
Okay Bob. Your profile is up to date. ✅

=====================================================`;

    // Add PROFILE_CONTEXT to the end of the system prompt with proper markers
    if (hasValidProfile) {
      systemPrompt = `${systemPrompt}

BEGIN_PROFILE_CONTEXT

name: ${profileContext.name || 'Guest User'}
birthday: ${profileContext.birthday || 'not provided'}
interests: ${profileContext.interests || 'not provided'}
bio: ${profileContext.bio || 'not provided'}
experience: ${profileContext.experience || 'not provided'}

END_PROFILE_CONTEXT`;
    }

    // Determine greeting message based on profile context
    const firstGreeting = "Hello! Welcome to our platform. I'm here to assist you. Would you like a quick overview of our platform and its features?";
    const reentryGreeting = "Welcome back! I already have your profile saved. Would you like to update any details—name, birthday, interests, bio, or experience—or just continue the conversation?";
    
    let greetingMessage = firstGreeting; // Default to first greeting
    
    // Check if this is a reentry conversation (has valid profile data)
    if (hasValidProfile) {
      // Check if this is truly a first-time conversation (Guest User name and all other fields not provided)
      const isFirstTime = profileContext.name === 'Guest User' && 
                         (!profileContext.birthday || profileContext.birthday === 'not provided') &&
                         (!profileContext.interests || profileContext.interests === 'not provided') &&
                         (!profileContext.bio || profileContext.bio === 'not provided') &&
                         (!profileContext.experience || profileContext.experience === 'not provided');
      
      // If it's not a first-time conversation, use reentry greeting
      if (!isFirstTime) {
        greetingMessage = reentryGreeting;
      }
    }
    
        // Add main system prompt
    systemMessages.push({
      role: 'system',
      content: systemPrompt
    });

    // Resolve preset configuration
    const asrPreset = process.env.ASR_PRESET || '';
    const llmPreset = process.env.LLM_PRESET || '';
    const ttsPreset = process.env.TTS_PRESET || '';

    // Build preset string (comma-joined list of active presets)
    const activePresets = [asrPreset, llmPreset, ttsPreset].filter(Boolean);
    const presetString = activePresets.join(',');

    const asrLanguage = process.env.ASR_LANGUAGE || 'en-US';
    const llmMaxHistory = parseInt(process.env.LLM_MAX_HISTORY) || 32;
    const llmTemperature = parseFloat(process.env.LLM_TEMPERATURE) || 0.7;
    const llmMaxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 1024;

    // Build ASR config
    let asrConfig;
    if (asrPreset) {
      const asrVendor = asrPreset.startsWith('deepgram') ? 'deepgram' : 'ares';
      asrConfig = { vendor: asrVendor, language: asrLanguage };
    } else {
      asrConfig = { vendor: process.env.ASR_VENDOR || 'ares', language: asrLanguage };
    }

    // Build LLM config
    let llmConfig;
    if (llmPreset) {
      llmConfig = {
        vendor: 'openai',
        system_messages: systemMessages,
        greeting_message: greetingMessage,
        failure_message: "I'm having trouble processing that. Could you please rephrase?",
        max_history: llmMaxHistory,
        input_modalities: ["text"],
        output_modalities: ["text"],
        params: {
          temperature: llmTemperature,
          max_tokens: llmMaxTokens,
        }
      };
    } else {
      llmConfig = {
        url: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        api_key: process.env.OPENAI_API_KEY || '',
        system_messages: systemMessages,
        greeting_message: greetingMessage,
        failure_message: "I'm having trouble processing that. Could you please rephrase?",
        max_history: llmMaxHistory,
        input_modalities: ["text"],
        output_modalities: ["text"],
        params: {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: llmTemperature,
          max_tokens: llmMaxTokens,
        }
      };
    }

    // Build TTS config
    // skip_patterns: [4] — strips [ ] from audio so [[field:value]] markers stay in transcript only
    let ttsConfig;
    if (ttsPreset) {
      const ttsVendor = ttsPreset.startsWith('minimax_speech_') ? 'minimax' : 'openai';
      const ttsParams = {};
      if (ttsPreset.startsWith('minimax_speech_')) {
        const voiceId = process.env.TTS_MINIMAX_VOICE_ID || '';
        const sampleRate = parseInt(process.env.TTS_MINIMAX_SAMPLE_RATE) || 32000;
        if (voiceId) ttsParams.voice_setting = { voice_id: voiceId };
        ttsParams.audio_setting = { sample_rate: sampleRate };
      } else {
        // openai_tts_1
        ttsParams.voice = process.env.TTS_OPENAI_VOICE || 'alloy';
        ttsParams.speed = parseFloat(process.env.TTS_OPENAI_SPEED) || 1.0;
      }
      ttsConfig = {
        vendor: ttsVendor,
        skip_patterns: [4],
        ...(Object.keys(ttsParams).length > 0 ? { params: ttsParams } : {})
      };
    } else {
      ttsConfig = {
        vendor: 'microsoft',
        skip_patterns: [4],
        params: {
          key: process.env.MICROSOFT_TTS_API_KEY || '',
          region: process.env.MICROSOFT_TTS_REGION || 'eastus',
          voice_name: process.env.MICROSOFT_TTS_VOICE || 'en-US-EvelynMultilingualNeural',
          speed: parseFloat(process.env.MICROSOFT_TTS_SPEED) || 1.3,
        }
      };
    }

    // Generate agent token if certificate is configured
    let agentToken = '';
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    console.log('🔐 [AGENT TOKEN] AGORA_APP_CERTIFICATE:', appCertificate ? `present (${appCertificate.length} chars)` : 'MISSING');
    console.log('🔐 [AGENT TOKEN] AGORA_APP_ID:', process.env.AGORA_APP_ID ? `present (${process.env.AGORA_APP_ID.length} chars)` : 'MISSING');
    console.log('🔐 [AGENT TOKEN] RtcTokenBuilder available:', !!RtcTokenBuilder, '| RtcRole.PUBLISHER:', RtcRole?.PUBLISHER);

    if (appCertificate && process.env.AGORA_APP_ID) {
      if (!RtcTokenBuilder || !RtcRole) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token builder failed to load — agent cannot join token-enabled channel'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
      try {
        const TTL = 3600;
        const expireAt = Math.floor(Date.now() / 1000) + TTL;
        agentToken = await RtcTokenBuilder.buildTokenWithRtm(
          process.env.AGORA_APP_ID,
          appCertificate,
          channelName,
          agentUid.toString(),
          RtcRole.PUBLISHER,
          expireAt,
          expireAt
        );
        console.log('🔐 [AGENT TOKEN] Generated for channel=', channelName, 'uid=', agentUid.toString(), 'length=', agentToken?.length, 'preview=', agentToken?.substring(0, 20) + '...');
        if (!agentToken) {
          throw new Error('buildTokenWithRtm returned empty token');
        }
      } catch (tokenErr) {
        console.error('❌ [AGENT TOKEN] Generation failed:', tokenErr);
        return new Response(JSON.stringify({
          success: false,
          error: 'Agent token generation failed: ' + (tokenErr?.message || String(tokenErr))
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      console.log('🔐 [AGENT TOKEN] Skipping token generation (no certificate) — sending empty token');
    }

    // Generate agent configuration with required payload parameters
    const agentConfig = {
      name: `onboarding_agent_${Date.now()}`,
      ...(presetString ? { preset: presetString } : {}),
      properties: {
        channel: channelName,
        token: agentToken,
        agent_rtc_uid: agentUid.toString(),
        remote_rtc_uids: ["*"], // Allow all clients to connect
        enable_string_uid: false,
        idle_timeout: 30,
        agent_rtm_uid: agentUid.toString(), // Critical for RTM messaging
        advanced_features: {
          enable_rtm: true // Required: enable RTM for data channel
        },
        asr: asrConfig,
        parameters: {
          audio_scenario: "chorus",
          data_channel: "rtm", // Required: specifies RTM as data channel
          enable_metrics: true,
          enable_error_message: true,
          transcript: {
            enable: true // Critical: explicitly enables transcripts
          }
        },
        llm: llmConfig,
        tts: ttsConfig
      }
    };

    // Call Agora /join API
    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
    const baseUrl = process.env.AGORA_API_BASE_URL || 'https://api.agora.io/api/conversational-ai-agent/v2';
    
    if (!appId || !customerId || !customerSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Agora configuration missing'
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString('base64')}`
    };

    const url = `${baseUrl}/projects/${appId}/join`;
    
    console.log('🚀 Creating Agora agent via REST API...');
    // console.log('🌐 URL:', url);
    // console.log('📤 Request payload:', JSON.stringify(agentConfig, null, 2));
    
    const response = await axios.post(url, agentConfig, { headers });
    
    // console.log('🔍 Agora API Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && (response.data.agent_id || response.data.agentId)) {
      const agentId = response.data.agent_id || response.data.agentId;
      console.log(`✅ Created Agora agent ${agentId}`);
      
      return new Response(JSON.stringify({
        success: true,
        data: response.data
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    } else {
      console.error('❌ No agent ID in response:', response.data);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create agent - no agentId in response'
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }
  } catch (err) {
    console.error("❌ agora-agents error:", err);
    return new Response(JSON.stringify({ 
      success: false,
      error: "Internal Error", 
      details: String(err) 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
    });
  }
};

export default handler;
