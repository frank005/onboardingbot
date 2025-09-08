// /netlify/functions/auth-admin.mjs
import { getStore } from "@netlify/blobs";
import fs from "node:fs";
import path from "node:path";

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

// Local development mock data - detect based on Blobs credentials
// If we have Blobs credentials, use real Blobs; otherwise use mock
const hasBlobsCredentials = !!(process.env.NETLIFY_SITE_ID || process.env.SITE_ID) && 
                           !!(process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN);
const isLocal = !hasBlobsCredentials;

// Shared mock data file for local development
const MOCK_DATA_FILE = path.join(process.cwd(), 'netlify', 'functions', '.mock-auth-data.json');

// Mock store for local development
const mockStore = {
  async get(key, options) {
    try {
      if (fs.existsSync(MOCK_DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(MOCK_DATA_FILE, 'utf8'));
        return options?.type === 'json' ? data : JSON.stringify(data);
      }
      return options?.type === 'json' ? { users: [], codes: [], revokedAfter: {} } : '{"users":[],"codes":[],"revokedAfter":{}}';
    } catch (error) {
      console.error("Mock data file error:", error);
      return options?.type === 'json' ? { users: [], codes: [], revokedAfter: {} } : '{"users":[],"codes":[],"revokedAfter":{}}';
    }
  },
  async setJSON(key, data) {
    try {
      fs.writeFileSync(MOCK_DATA_FILE, JSON.stringify(data, null, 2));
      console.log("Mock data saved to:", MOCK_DATA_FILE);
    } catch (error) {
      console.error("Mock data save error:", error);
      throw error;
    }
  }
};

function j(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

async function handler(request, context) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== process.env.ADMIN_TOKEN) return new Response("Unauthorized", { status: 401 });

  try {
    // Debug environment detection
    console.log("Environment detection:", {
      hasBlobsCredentials: hasBlobsCredentials,
      isLocal: isLocal,
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID ? 'set' : 'unset',
      NETLIFY_BLOBS_TOKEN: process.env.NETLIFY_BLOBS_TOKEN ? 'set' : 'unset',
      SITE_ID: process.env.SITE_ID ? 'set' : 'unset',
      NETLIFY_AUTH_TOKEN: process.env.NETLIFY_AUTH_TOKEN ? 'set' : 'unset'
    });

    // Use mock store in local development, real Blobs in production
    let store;
    if (isLocal) {
      console.log("Using mock store for local development");
      store = mockStore;
    } else {
      console.log("Using real Blobs store for production");
      // In production, always use real Blobs
      try {
        store = getAuthStore();
      } catch (blobsError) {
        console.error("Blobs initialization failed in production:", blobsError);
        // Fallback to environment variables if Blobs fails
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
        const fallbackData = { users: fallbackUsers, codes: [], revokedAfter: {} };
        return new Response(JSON.stringify(fallbackData), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }
    
    let data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };

    if (request.method === "GET") return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

    // Default 30-day window helper
    function defaultExpiryISO(days = 30) {
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    switch (body.action) {
      case "upsertUser": {
        const { u, pw, ver = 1, blocked = false } = body;
        // Default: 30-day expiry if none provided
        const expiresAt = body.expiresAt ?? defaultExpiryISO(30);

        // Re-read latest before write (reduces races)
        data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };

        const idx = data.users.findIndex(x => x.u === u);
        const rec = { u, pw, ver, expiresAt, blocked };
        if (idx >= 0) data.users[idx] = rec; else data.users.push(rec);

        await store.setJSON("users.json", data);
        return new Response("", { status: 200 });
      }

      case "bulkUpsertUsers": {
        const { entries = [] } = body; // [{u,pw,ver,blocked,expiresAt?}, ...]
        // Default expiry for any missing expiresAt
        for (const e of entries) {
          if (!e.expiresAt) e.expiresAt = defaultExpiryISO(30);
          if (typeof e.ver !== "number") e.ver = 1;
          if (typeof e.blocked !== "boolean") e.blocked = false;
        }

        // One read, one write — avoids last-write-wins for multi-user adds
        data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };

        for (const e of entries) {
          const idx = data.users.findIndex(x => x.u === e.u);
          const rec = { u: e.u, pw: e.pw, ver: e.ver, expiresAt: e.expiresAt, blocked: e.blocked };
          if (idx >= 0) data.users[idx] = rec; else data.users.push(rec);
        }

        await store.setJSON("users.json", data);
        return new Response("", { status: 200 });
      }

      case "blockUser": {
        const { u, blocked = true } = body;
        data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };
        const rec = data.users.find(x => x.u === u);
        if (rec) rec.blocked = !!blocked;
        await store.setJSON("users.json", data);
        return new Response("", { status: 200 });
      }

      case "revokeUser": {
        const { u, after } = body;
        data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };
        data.revokedAfter = data.revokedAfter || {};
        data.revokedAfter[u] = after || new Date().toISOString();
        await store.setJSON("users.json", data);
        return new Response("", { status: 200 });
      }

      case "setCodes": {
        const { codes = [] } = body;
        data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };
        data.codes = codes;
        await store.setJSON("users.json", data);
        return new Response("", { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: "Bad action" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Storage error",
      detail: err?.message || String(err),
      stack: err?.stack || null,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export default handler;