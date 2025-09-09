import crypto from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";
const SESSION_MAX_AGE_SEC = 60 * 20; // 20 minutes

function b64url(buf){
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}

function sign(b64){ 
  return crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("hex"); 
}

function verifySessionToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = sign(payloadB64);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = payloadB64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const sessionData = JSON.parse(decoded);
    
    // Check if token is expired
    const now = Date.now();
    if (sessionData.exp && now >= sessionData.exp) {
      return null; // Token is expired
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error verifying session token:', error);
    return null;
  }
}

async function handler(request, context) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Get session cookie from request
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(cookie => 
      cookie.trim().startsWith('session=')
    );
    
    if (!sessionCookie) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No session found" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const sessionToken = sessionCookie.split('=')[1];
    if (!sessionToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid session token" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify the current session token
    const sessionData = verifySessionToken(sessionToken);
    if (!sessionData) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid or expired session" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create a new session token with fresh expiry
    const newPayload = JSON.stringify({
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
      who: sessionData.who,
      ver: sessionData.ver || 0
    });

    const tPayload = b64url(newPayload);
    const tSig = sign(tPayload);
    const newToken = `${tPayload}.${tSig}`;

    const cookie = [`session=${newToken}`, `Path=/`, `Secure`, `SameSite=Lax`, `Max-Age=${SESSION_MAX_AGE_SEC}`].join("; ");
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Session refreshed successfully" 
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Set-Cookie": cookie
      },
    });

  } catch (error) {
    console.error('Error refreshing session:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal server error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export default handler;
