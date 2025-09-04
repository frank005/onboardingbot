// Netlify Function: POST /api/agora/agents/stop
// Stops Agora agent

import axios from 'axios';

const handler = async (req, ctx) => {
  try {
    // Allow POST requests (client sends POST, Agora API expects POST to /leave)
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

    // console.log('🔍 Agora agents stop function called');

    // Parse request body
    const body = await req.json();
    const { agentId } = body;
    
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

    // console.log(`🛑 Stopping agent ${agentId}...`);

    // Call Agora leave API
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

    const apiUrl = `${baseUrl}/projects/${appId}/agents/${encodeURIComponent(agentId)}/leave`;

    const response = await axios.post(apiUrl, {}, { headers });
    
    // console.log(`✅ Agent ${agentId} stopped:`, response.data);
    
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
    console.error("❌ agora-agents-stop error:", err);
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
