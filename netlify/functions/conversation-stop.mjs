// Netlify Function: POST /api/conversation/stop/{userId}
// Stops a conversation for a specific user

const handler = async (req, ctx) => {
  try {
    // Allow POST requests
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

    // console.log('🔍 Conversation stop function called');

    // Extract userId from the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];
    
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        },
      });
    }

    // console.log(`🛑 Stopping conversation for user ${userId}...`);

    // For now, this is just a placeholder that logs the stop request
    // In a real implementation, you might:
    // 1. Update a database to mark the conversation as stopped
    // 2. Clean up any server-side resources
    // 3. Send notifications to other participants
    // 4. Log analytics data
    
    // console.log(`✅ Conversation stopped for user ${userId}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Conversation stopped for user ${userId}`,
      userId: userId,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
    });
  } catch (err) {
    console.error("❌ conversation-stop error:", err);
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
