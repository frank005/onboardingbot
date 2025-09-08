// /netlify/functions/auth-admin.js
import { getStore } from "@netlify/blobs";

function j(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

export default async (request, context) => {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token !== process.env.ADMIN_TOKEN) return new Response("Unauthorized", { status: 401 });

  try {
    // Manual mode: pass siteID + token from env
    const store = getStore("auth", {
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });
    let data = (await store.get("users.json", { type: "json" })) || { users: [], codes: [], revokedAfter: {} };

    if (request.method === "GET") return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

    switch (body.action) {
      case "upsertUser": {
        const { u, pw, ver = 1, expiresAt = null, blocked = false } = body;
        const idx = data.users.findIndex((x) => x.u === u);
        const rec = { u, pw, ver, expiresAt, blocked };
        if (idx >= 0) data.users[idx] = rec; else data.users.push(rec);
        await store.setJSON("users.json", data);          // <-- write
        return new Response("", { status: 200 });
      }
      case "blockUser": {
        const { u, blocked = true } = body;
        const rec = data.users.find((x) => x.u === u);
        if (rec) rec.blocked = !!blocked;
        await store.setJSON("users.json", data);          // <-- write
        return new Response("", { status: 200 });
      }
      case "revokeUser": {
        const { u, after } = body;
        data.revokedAfter[u] = after || new Date().toISOString();
        await store.setJSON("users.json", data);          // <-- write
        return new Response("", { status: 200 });
      }
      case "setCodes": {
        data.codes = body.codes || [];
        await store.setJSON("users.json", data);          // <-- write
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
};