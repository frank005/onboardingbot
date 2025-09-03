// Netlify Function: POST /api/agora/agents/chat
// Sends chat message to Agora agent

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

    console.log('🔍 Agora agents chat function called');

    // Parse request body
    const body = await req.json();
    const { agentId, messageType, text, url, uuid, priority = 'INTERRUPT', interruptable = true } = body;
    
    if (!agentId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Agent ID is required'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }
    
    if (!messageType || (messageType !== 'text' && messageType !== 'image')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid message type. Must be "text" or "image"'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }
    
    if (messageType === 'text' && !text) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message text is required for text messages'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }
    
    if (messageType === 'image' && !url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Image URL is required for image messages'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    console.log(`📤 Sending ${messageType} message to agent ${agentId}`);

    // Call Agora chat API
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

    const messageUuid = uuid || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiUrl = `${baseUrl}/projects/${appId}/agents/${encodeURIComponent(agentId)}/chat`;

    const messageBody = {
      messageType,
      priority,
      interruptable,
      uuid: messageUuid,
      ...(messageType === 'text' ? { text } : { url })
    };

    console.log(`📤 Sending ${messageType} message to agent ${agentId}:`, messageBody);
    
    const response = await axios.post(apiUrl, messageBody, { headers });
    
    console.log(`✅ ${messageType} message sent to agent ${agentId}:`, response.data);
    
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
  } catch (err) {
    console.error("❌ agora-agents-chat error:", err);
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
