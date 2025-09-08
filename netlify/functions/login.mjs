import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";

function getAuthStore() {
  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID; // Project ID (aka Site ID) in Netlify UI
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN; // Personal access token

  if (!siteID || !token) {
    throw new Error(
      `Missing Blobs credentials: siteID=${siteID ? 'set' : 'unset'} token=${token ? 'set' : 'unset'}`
    );
  }

  // ✅ v10+ API: getStore(name, options)
  return getStore("auth", { siteID, token });
}

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";
const SESSION_MAX_AGE_SEC = 60 * 20; // 20 minutes

// Local development mock data - detect based on Blobs credentials
// If we have Blobs credentials, use real Blobs; otherwise use mock
const hasBlobsCredentials = !!(process.env.NETLIFY_SITE_ID || process.env.SITE_ID) && 
                           !!(process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN);
const isLocal = !hasBlobsCredentials;

// Shared mock data file for local development
const MOCK_DATA_FILE = path.join(process.cwd(), 'netlify', 'functions', '.mock-auth-data.json');

function b64url(buf){
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function sign(b64){ return crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("hex"); }

async function handler(request, context) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try { 
    body = await request.json(); 
  } catch { 
    return new Response("Bad JSON", { status: 400 }); 
  }
  const { username = "", password = "" } = body;

  let raw;
  
  if (isLocal) {
    // Use shared mock data file for local development
    try {
      if (fs.existsSync(MOCK_DATA_FILE)) {
        raw = JSON.parse(fs.readFileSync(MOCK_DATA_FILE, 'utf8'));
      } else {
        raw = { users: [], codes: [], revokedAfter: {} };
      }
    } catch (error) {
      console.error("Mock data file error:", error);
      raw = { users: [], codes: [], revokedAfter: {} };
    }
  } else {
    // Use Netlify Blobs in production with fallback to environment variables
    try {
      // ✅ Manual mode with siteID + token
      const store = getAuthStore();
      
      // Try to get existing data, create default if it doesn't exist
      try {
        const blobData = await store.get("users.json", { type: "json" });
        raw = blobData || { users: [], codes: [], revokedAfter: {} };
        console.log("Successfully loaded data from Blobs in login");
      } catch (getError) {
        console.log("No existing data found in login, creating default structure:", getError.message);
        raw = { users: [], codes: [], revokedAfter: {} };
      }
    } catch (error) {
      console.error("Blobs initialization error in login:", error);
      // Fallback to environment variables if Blobs fails
      console.log("Falling back to environment variables in login");
      const fallbackUsers = process.env.ALLOWED_USERS?.split(',').map(u => {
        const [username, password] = u.split(':');
        return {
          u: username,
          pw: password,
          ver: 1,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          blocked: false
        };
      }) || [];
      raw = { users: fallbackUsers, codes: [], revokedAfter: {} };
    }
  }

  const now = Date.now();
  const uRec = (raw.users || []).find(u => u.u === username);

  const okUser =
    !!username &&
    !!uRec &&
    !uRec.blocked &&
    (!uRec.expiresAt || now < Date.parse(uRec.expiresAt)) &&
    uRec.pw === password;

  if (!okUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
    who: username,
    ver: uRec?.ver ?? 0
  });

  const tPayload = b64url(payload);
  const tSig = sign(tPayload);
  const token = `${tPayload}.${tSig}`;

  const cookie = [`session=${token}`, `Path=/`, `Secure`, `SameSite=Lax`, `Max-Age=${SESSION_MAX_AGE_SEC}`].join("; ");
  return new Response("", {
    status: 200,
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default handler;
