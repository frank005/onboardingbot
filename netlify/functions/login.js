import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";
const SESSION_MAX_AGE_SEC = 60 * 60 * 2; // 2 hours

// Local development mock data
const isLocal = process.env.NODE_ENV === 'development' || !process.env.NETLIFY;

// Shared mock data file for local development
const MOCK_DATA_FILE = path.join(process.cwd(), 'netlify', 'functions', '.mock-auth-data.json');

function b64url(buf){
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function sign(b64){ return crypto.createHmac("sha256", SESSION_SECRET).update(b64).digest("hex"); }

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Bad JSON" }; }
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
    // Use Netlify Blobs in production
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "auth" });
      
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
      // Fallback to empty data structure instead of failing
      console.log("Falling back to empty data structure in login");
      raw = { users: [], codes: [], revokedAfter: {} };
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

  if (!okUser) return { statusCode: 401, body: "Unauthorized" };

  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
    who: username,
    ver: uRec?.ver ?? 0
  });

  const tPayload = b64url(payload);
  const tSig = sign(tPayload);
  const token = `${tPayload}.${tSig}`;

  const cookie = [`session=${token}`, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=${SESSION_MAX_AGE_SEC}`].join("; ");
  return { statusCode: 204, headers: { "Set-Cookie": cookie }, body: "" };
};
