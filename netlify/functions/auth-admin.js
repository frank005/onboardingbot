import fs from "node:fs";
import path from "node:path";

// Local development mock data
const isLocal = process.env.NODE_ENV === 'development' || !process.env.NETLIFY;

// Shared mock data file for local development
const MOCK_DATA_FILE = path.join(process.cwd(), 'netlify', 'functions', '.mock-auth-data.json');

export const handler = async (event) => {
  const token = event.headers.authorization?.replace("Bearer ","");
  
  // Always require proper admin token authentication
  if (token !== process.env.ADMIN_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  let data;
  
  if (isLocal) {
    // Use shared mock data file for local development
    try {
      if (fs.existsSync(MOCK_DATA_FILE)) {
        data = JSON.parse(fs.readFileSync(MOCK_DATA_FILE, 'utf8'));
      } else {
        data = { users: [], codes: [], revokedAfter: {} };
      }
    } catch (error) {
      console.error("Mock data file error:", error);
      data = { users: [], codes: [], revokedAfter: {} };
    }
  } else {
    // Use Netlify Blobs in production
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "auth" });
      
      // Try to get existing data, create default if it doesn't exist
      try {
        const blobData = await store.get("users.json", { type: "json" });
        data = blobData || { users: [], codes: [], revokedAfter: {} };
        console.log("Successfully loaded data from Blobs");
      } catch (getError) {
        console.log("No existing data found, creating default structure:", getError.message);
        data = { users: [], codes: [], revokedAfter: {} };
      }
    } catch (error) {
      console.error("Blobs initialization error:", error);
      // Fallback to empty data structure instead of failing
      console.log("Falling back to empty data structure");
      data = { users: [], codes: [], revokedAfter: {} };
    }
  }

  if (event.httpMethod === "GET") return { statusCode: 200, body: JSON.stringify(data) };

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    switch (body.action) {
      case "upsertUser": {
        const { u, pw, ver = 1, expiresAt = null, blocked = false } = body;
        const idx = data.users.findIndex(x => x.u === u);
        
        // Set default 30-day expiry if expiresAt is null or not provided
        let finalExpiresAt = expiresAt;
        if (expiresAt === null || expiresAt === undefined) {
          const defaultExpiry = new Date();
          defaultExpiry.setDate(defaultExpiry.getDate() + 30); // 30 days from now
          finalExpiresAt = defaultExpiry.toISOString();
        }
        
        const rec = { u, pw, ver, expiresAt: finalExpiresAt, blocked };
        if (idx >= 0) data.users[idx] = rec; else data.users.push(rec);
        break;
      }
      case "blockUser": {
        const { u, blocked = true } = body;
        const rec = data.users.find(x => x.u === u);
        if (rec) rec.blocked = blocked;
        break;
      }
      case "revokeUser": {
        const { u, after } = body;
        data.revokedAfter[u] = after || new Date().toISOString();
        break;
      }
      case "setCodes": {
        data.codes = body.codes || [];
        break;
      }
      case "expirePassword": {
        const { u } = body;
        const rec = data.users.find(x => x.u === u);
        if (rec) {
          // Set password to expire immediately
          rec.expiresAt = new Date().toISOString();
          // Increment version to invalidate all existing sessions
          rec.ver = (rec.ver || 0) + 1;
        } else {
          return { statusCode: 404, body: "User not found" };
        }
        break;
      }
      case "updatePassword": {
        const { u, newPassword, expiresInDays = 30 } = body;
        const rec = data.users.find(x => x.u === u);
        if (rec) {
          // Update password
          rec.pw = newPassword;
          // Set new expiry date (default 30 days from now)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + expiresInDays);
          rec.expiresAt = expiryDate.toISOString();
          // Increment version to invalidate all existing sessions
          rec.ver = (rec.ver || 0) + 1;
        } else {
          return { statusCode: 404, body: "User not found" };
        }
        break;
      }
      case "expireAllPasswords": {
        const { expiresInDays = 0 } = body;
        const expiryDate = new Date();
        if (expiresInDays > 0) {
          expiryDate.setDate(expiryDate.getDate() + expiresInDays);
        }
        // Expire all user passwords
        data.users.forEach(user => {
          user.expiresAt = expiryDate.toISOString();
          user.ver = (user.ver || 0) + 1;
        });
        break;
      }
      case "extendPassword": {
        const { u, extendByDays = 30 } = body;
        const rec = data.users.find(x => x.u === u);
        if (rec) {
          // Extend current expiry or set new one
          const currentExpiry = rec.expiresAt ? new Date(rec.expiresAt) : new Date();
          currentExpiry.setDate(currentExpiry.getDate() + extendByDays);
          rec.expiresAt = currentExpiry.toISOString();
        } else {
          return { statusCode: 404, body: "User not found" };
        }
        break;
      }
      default:
        return { statusCode: 400, body: "Bad action" };
    }
    
    if (isLocal) {
      // Save to shared mock data file for local development
      try {
        fs.writeFileSync(MOCK_DATA_FILE, JSON.stringify(data, null, 2));
      } catch (error) {
        console.error("Mock data file save error:", error);
        return { statusCode: 500, body: "Storage error" };
      }
    } else {
      // Save to Netlify Blobs in production
      try {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore({ name: "auth" });
        await store.setJSON("users.json", data);
        console.log("Successfully saved data to Blobs");
      } catch (error) {
        console.error("Blobs save error:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // Don't fail the operation, just log the error
        console.log("Continuing despite Blobs save error");
      }
    }
    
    return { statusCode: 204, body: "" };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
