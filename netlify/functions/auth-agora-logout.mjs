import { authMode, clearSessionCookieHeader } from "./utils/auth.mjs";
import { buildLogoutUrl } from "./utils/agora-sso.mjs";

const handler = async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const home = `${url.origin}/`;

  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookieHeader(req));

  if (authMode() === "bypass") {
    headers.set("Location", home);
    return new Response(null, { status: 307, headers });
  }

  headers.set("Location", buildLogoutUrl(home));
  return new Response(null, { status: 307, headers });
};

export default handler;
