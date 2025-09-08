// /netlify/functions/auth-admin.js
import { getStore } from "@netlify/blobs";

function j(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

export const handler = async (event) => {
  const token = event.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.ADMIN_TOKEN) return { statusCode: 401, body: "Unauthorized" };

  try {
    const store = getStore({ name: "auth" });
    let data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };

    if (event.httpMethod === "GET") return j(200, data);
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return j(400, { error: "Bad JSON" }); }

    switch (body.action) {
      case "upsertUser": {
        const { u, pw, ver = 1, expiresAt = null, blocked = false } = body;
        const idx = data.users.findIndex((x) => x.u === u);
        const rec = { u, pw, ver, expiresAt, blocked };
        if (idx >= 0) data.users[idx] = rec; else data.users.push(rec);
        await store.setJSON("users.json", data);          // <-- write
        return { statusCode: 204, body: "" };
      }
      case "blockUser": {
        const { u, blocked = true } = body;
        const rec = data.users.find((x) => x.u === u);
        if (rec) rec.blocked = !!blocked;
        await store.setJSON("users.json", data);          // <-- write
        return { statusCode: 204, body: "" };
      }
      case "revokeUser": {
        const { u, after } = body;
        data.revokedAfter[u] = after || new Date().toISOString();
        await store.setJSON("users.json", data);          // <-- write
        return { statusCode: 204, body: "" };
      }
      case "setCodes": {
        data.codes = body.codes || [];
        await store.setJSON("users.json", data);          // <-- write
        return { statusCode: 204, body: "" };
      }
      default:
        return j(400, { error: "Bad action" });
    }
  } catch (err) {
    return j(500, {
      error: "Storage error",
      detail: err?.message || String(err),
      stack: err?.stack || null,
    });
  }
};