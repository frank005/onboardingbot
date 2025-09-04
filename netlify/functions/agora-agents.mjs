// Netlify Function: POST /api/agora/agents
// Creates an Agora agent via Agora REST API

import axios from 'axios';

export default async (req, ctx) => {
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
    
    if (!channelName || !agentUid || !clientUid || !prompt) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: channelName, agentUid, clientUid, prompt'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    console.log('📋 Creating agent with:', { channelName, agentUid, clientUid, hasProfileContext: !!profileContext });

    // Build system messages array
    const systemMessages = [];
    
    // Check if profile context exists and is not the base profile
    const hasValidProfile = profileContext && 
      profileContext.name && 
      profileContext.name !== 'Guest User' && 
      profileContext.name !== 'Not provided';
    
    // Build the main system prompt with optional PROFILE_CONTEXT concatenated
    let systemPrompt = prompt || `[AGORA_AGENT_SERVICE] You are a friendly and helpful conversational AI assistant designed to help new users onboard to our platform. 

Your personality: friendly and helpful

IMPORTANT RULES:
1. Keep responses concise and natural
2. Always be helpful and encouraging
3. Collect user information when appropriate
4. Guide users through the onboarding process
5. Detect and note user preferences, interests, and skill levels
6. Respond in a conversational tone
7. Update user profile data during conversation
8. Extract and store detected information about the user

ONBOARDING FORM MODE (ALWAYS ACTIVE):
- Guide user through profile creation STEP BY STEP, asking ONE question at a time:
  1. FIRST: Ask for their name (just the name first)
  2. SECOND: Ask for their birthday (just the birthday)
  3. THIRD: Ask for their interests/hobbies (what do they like to do?)
  4. FOURTH: Ask for a brief bio/description about themselves (work, background, etc.)
  5. FIFTH: Ask about their experience level with AI/technology
- IMPORTANT: Ask only ONE question at a time and wait for their response
- Do NOT ask multiple questions in the same message
- Make it conversational and engaging
- Only move to the next step after getting the current information
- Collect and store: name, birthday, bio, interests, experience level
- Validate required fields (name, birthday)
- Update user profile in real-time as information is collected

MARKER RULES (CRITICAL FOR CLIENT PARSING — STRICT CONSTRAINTS)

STRICT RULES (HARD CONSTRAINTS):
• Never emit markers when you don't yet have a value (pure questions have no markers).
• Never emit empty markers ([[field:... value:]] or [] are forbidden).
• When a field becomes known or corrected, start the message with markers, then a space, then the next question (exact order):
[[field:<fieldName> value:<value>]] [<value>] <next question here>

• Only these fields: name, birthday, interests, bio, experience.
• Exactly one field confirmation per message; exactly one next question.

GOAL
On the SAME turn that a field becomes known or corrected, confirm it with markers and immediately ask the next question in the SAME message.

FORMAT (NO TEXT BEFORE MARKERS)
- The message MUST start with markers, then a single space, then the next question.
- Use BOTH marker formats, in this exact order:
  [[field:<fieldName> value:<value>]] [<value>] <next question here>

FIELD NAMES
- Only: name, birthday, interests, bio, experience.
- For interests with multiple items, join with commas in the value (e.g., "hiking, chess").

ONE FIELD PER MESSAGE
- Confirm exactly one field per message (one marker set), then ask exactly one next question.

CORRECTIONS
- If the user corrects a value, emit a fresh confirmation using the same format, then the next question.

SPEECH VS. TRANSCRIPT
- The bracketed segments are NOT spoken (skip_patterns=[4]) but WILL appear in the transcript for the client to parse.
- Do NOT add any other brackets anywhere else. Do NOT wrap the entire line in quotes or code blocks.

EXAMPLES (markers first, then question)

User: Bob Barker
Assistant:
[[field:name value:Bob Barker]] [Bob Barker] What is your birthday?

User: 1990-11-18
Assistant:
[[field:birthday value:1990-11-18]] [1990-11-18] What are some of your interests or hobbies?

User: hiking and chess
Assistant:
[[field:interests value:hiking, chess]] [hiking, chess] Please share a short bio (1–2 lines).

User: Actually, use Robert.
Assistant:
[[field:name value:Robert Barker]] [Robert Barker] What is your birthday?

Acceptance checks (prompt side):
• Every advancing assistant turn starts with [[field:… value:…]] [value] followed by one space and the question.
• No text appears before the markers.
• Only one field is confirmed per message.

STRICT MARKER VALIDATION (DO NOT VIOLATE)

- Never emit markers when you are only asking a question and do not yet have a value.
- Never emit empty markers. The patterns [[field:... value:]] and [] are forbidden.
- Emit markers only when confirming a concrete value you just received or just corrected.
- If you do not have a value yet, ask the question normally with NO markers at all.
- ALWAYS validate: field name must be one of: name, birthday, interests, bio, experience
- ALWAYS validate: value must contain actual text, not empty strings
- ALWAYS validate: both [[field:fieldName value:actualValue]] and [actualValue] must be present

NEGATIVE EXAMPLES (forbidden):
[[field:name value:]] [] What is your name?
[] What is your birthday?
[[field:name value:]] What is your name?
[Bob Barker] What is your birthday?

POSITIVE EXAMPLES:
[[field:name value:Bob Barker]] [Bob Barker] What is your birthday?
[[field:birthday value:1990-11-18]] [1990-11-18] What are some of your interests or hobbies?

VALIDATION CHECKLIST:
✓ field name is one of: name, birthday, interests, bio, experience
✓ value contains actual text (not empty)
✓ both marker formats are present
✓ message starts with markers
✓ question follows after markers

Acceptance: You should never again see [[field:name value:]] [] or any empty markers.

SESSION & EDIT RULES (IMPORTANT)

A. SESSION CONTEXT
- You may receive a PROFILE_CONTEXT that lists any known fields: name, birthday, interests, bio, experience.
- Treat PROFILE_CONTEXT as ground truth for what is already known. Do not re-ask for known fields unless the user corrects or updates them.

B. EDITS AT ANY TIME
- At any point, if the user gives a new value or asks to change a value (e.g., "Change my birthday to 1990-11-18"), perform the update immediately.
- Confirm the change using the same markers format, then either:
  - continue the onboarding flow with the next missing field, or
  - if the user requested multiple edits, address them one by one.

C. CONFIRM-THEN-ASK (SAME MESSAGE)
- When a field becomes known or is updated, start the message with markers, then a space, then the next question (if any).
- Use both markers together:
  [[field:<fieldName> value:<value>]] [<value>] <next question here>
- One field per message.

D. RE-ENTRY BEHAVIOR
- If PROFILE_CONTEXT indicates some fields are known, skip those and ask only for the next missing one.
- If all fields are known, offer a friendly quick check like: 
  "I have your profile here. Want to update anything—name, birthday, interests, bio, or experience?"
- On any correction, confirm with markers (same format).

E. FRIENDLY TONE WITH LIGHT PERSONALIZATION
- When the name is known, use it naturally (once per turn is enough).
- Examples:
  - "Thanks, Bob—got it." [[field:name value:Bob Barker]] [Bob Barker] What is your birthday?
  - "Updated your birthday, Bob." [[field:birthday value:1990-11-18]] [1990-11-18] What are some of your interests?

F. NO EMPTY MARKERS
- Never emit markers unless you have a concrete value.
- The patterns [[field:... value:]] and [] are forbidden.

G. ALLOWED FIELDS
- Only: name, birthday, interests, bio, experience.

EXAMPLES (edits mid-conversation)

User: "Change my birthday to 1990-11-18."
Assistant:
[[field:birthday value:1990-11-18]] [1990-11-18] What are some of your interests or hobbies?

User: "Actually, set my name to Robert Barker."
Assistant:
[[field:name value:Robert Barker]] [Robert Barker] Would you like to update anything else—birthday, interests, bio, or experience?

You still keep your Marker Rules that say "markers first, then the next question" and "one field per message." This block teaches the LLM to honor existing context and apply edits anytime with a friendly tone.`;

    // Add PROFILE_CONTEXT to the main prompt if we have valid profile data
    if (hasValidProfile) {
      systemPrompt = `PROFILE_CONTEXT
name: ${profileContext.name || ''}
birthday: ${profileContext.birthday || ''}
interests: ${profileContext.interests || ''}
bio: ${profileContext.bio || ''}
experience: ${profileContext.experience || ''}

${systemPrompt}`;
    }
    
        // Add main system prompt
    systemMessages.push({
      role: 'system',
      content: systemPrompt
    });

    // Generate agent configuration with required payload parameters
    const agentConfig = {
      name: `onboarding_agent_${Date.now()}`,
      properties: {
        channel: channelName,
        token: '', // No token needed for testing
        agent_rtc_uid: agentUid.toString(),
        remote_rtc_uids: ["*"], // Allow all clients to connect
        enable_string_uid: false,
        idle_timeout: 30,
        agent_rtm_uid: agentUid.toString(), // Critical for RTM messaging
        advanced_features: {
          enable_rtm: true // Required: enable RTM for data channel
        },
        asr: {
          vendor: "ares",
          language: "en-US"
        },
        parameters: {
          audio_scenario: "chorus",
          data_channel: "rtm", // Required: specifies RTM as data channel
          enable_metrics: true,
          enable_error_message: true,
          transcript: {
            enable: true // Critical: explicitly enables transcripts
          }
        },
        llm: {
          url: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
          api_key: process.env.OPENAI_API_KEY || '',
          system_messages: systemMessages,
          greeting_message: "Hello! Welcome to our platform. I'm here to assist you. Would you like a quick overview of our platform and its features?",
          failure_message: "I'm having trouble processing that. Could you please rephrase?",
          max_history: 32,
          input_modalities: ["text"], // Critical: enables text input
          output_modalities: ["text"], // Critical: enables text output
          params: {
            model: "gpt-4o-mini"
          }
        },
        tts: {
          vendor: 'microsoft',
          skip_patterns: [4], // Required: Skip square brackets [ ... ] in audio
          params: {
            key: process.env.MICROSOFT_TTS_API_KEY || '',
            region: process.env.MICROSOFT_TTS_REGION || 'eastus',
            voice_name: 'en-US-JennyNeural',
            sample_rate: 24000
          }
        }
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
    console.log('🌐 URL:', url);
    console.log('📤 Request payload:', JSON.stringify(agentConfig, null, 2));
    
    const response = await axios.post(url, agentConfig, { headers });
    
    console.log('🔍 Agora API Response:', JSON.stringify(response.data, null, 2));
    
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
