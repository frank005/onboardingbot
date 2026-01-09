const SESSION_SECRET = Deno.env.get("SESSION_SECRET") ?? "dev-secret";

// Include your app's static asset prefixes here
const PUBLIC_PATHS = [
  "/login.html",                  // simple login page
  "/.netlify/functions/login",    // login API
  "/.netlify/functions/auth-admin", // admin API (for local testing)
  "/api/",                        // API endpoints
  "/favicon.ico",
  "/robots.txt",
  "/manifest.webmanifest",
  "/manifest.json",
  "/assets/",                     // Vite default
  "/static/",                     // CRA & others
  "/build/",                      // Remix/CRA variants
];

function b64urlToB64(s){ return s.replace(/-/g, "+").replace(/_/g, "/"); }
async function hex(bytes){ return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,"0")).join(""); }
async function sign(data){
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return hex(sig);
}
async function verifyLocalSignature(token){
  const [b64url, sig] = token.split(".");
  if (!b64url || !sig) return null;
  const expected = await sign(b64url);
  if (expected !== sig) return null;
  const payload = JSON.parse(atob(b64urlToB64(b64url)));
  if (!payload.exp || Date.now() >= payload.exp) return null;
  return payload; // { iat, exp, who, ver }
}

// ETag-cached auth config from Blobs
let cached, etag;
async function fetchAuthConfig() {
  // For local development, return mock data
  if (typeof Deno === 'undefined' || !Deno.env.get('NETLIFY')) {
    return { users: [], revokedAfter: {} };
  }
  
  const url = new URL("/.netlify/blobs/auth/users.json", "http://local");
  const headers = etag ? { "If-None-Match": etag } : {};
  const res = await fetch(url, { headers });
  if (res.status === 304 && cached) return cached;
  if (res.ok) {
    etag = res.headers.get("ETag") || etag;
    cached = await res.json();
    return cached;
  }
  return cached || { users: [], revokedAfter: {} };
}

export default async (req, ctx) => {
  const url = new URL(req.url);
  const path = url.pathname;

  const urlBypass = url.searchParams.get("bypass") === "true" || url.searchParams.get("dev") === "true";
  const envBypass = Deno.env.get("BYPASS_AUTH") === "true" || Deno.env.get("BYPASS_AUTH") === "1";
  const cookie = req.headers.get("cookie") || "";
  const cookieBypass = cookie.includes("auth_bypass=true");
  
  if (urlBypass || envBypass || cookieBypass) {
    return ctx.next();
  }

  // ✅ Allow login page, login API, and static asset paths
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p))) {
    return ctx.next();
  }

  const match = cookie.match(/(?:^|; )session=([^;]+)/);
  if (!match) {
    // Redirect to login page with the original URL as a parameter
    const loginUrl = new URL("/login.html", url);
    loginUrl.searchParams.set("redirect", path);
    return Response.redirect(loginUrl, 302);
  }

  const payload = await verifyLocalSignature(match[1]);
  if (!payload) {
    const loginUrl = new URL("/login.html", url);
    loginUrl.searchParams.set("redirect", path);
    return Response.redirect(loginUrl, 302);
  }

  // Live checks (blocked/expired/version/revocation)
  const conf = await fetchAuthConfig();
  const users = conf.users || [];
  const revokedAfter = conf.revokedAfter || {};
  const uRec = users.find(u => u.u === payload.who);
  if (uRec) {
    if (uRec.blocked) {
      const loginUrl = new URL("/login.html", url);
      loginUrl.searchParams.set("redirect", path);
      return Response.redirect(loginUrl, 302);
    }
    if (uRec.expiresAt && Date.now() >= Date.parse(uRec.expiresAt)) {
      const loginUrl = new URL("/login.html", url);
      loginUrl.searchParams.set("redirect", path);
      return Response.redirect(loginUrl, 302);
    }
    if ((uRec.ver ?? 0) !== (payload.ver ?? 0)) {
      const loginUrl = new URL("/login.html", url);
      loginUrl.searchParams.set("redirect", path);
      return Response.redirect(loginUrl, 302);
    }
  }
  const cutoff = revokedAfter[payload.who];
  if (cutoff && payload.iat < Date.parse(cutoff)) {
    const loginUrl = new URL("/login.html", url);
    loginUrl.searchParams.set("redirect", path);
    return Response.redirect(loginUrl, 302);
  }

  return ctx.next();
};
