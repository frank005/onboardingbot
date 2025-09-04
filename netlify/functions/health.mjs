// Netlify Function: GET /api/health
// Simple health check endpoint

export default async (req, ctx) => {
  try {
    return new Response(JSON.stringify({ 
      success: true,
      message: "Netlify functions are ready",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: "Health check failed",
      details: String(error)
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
