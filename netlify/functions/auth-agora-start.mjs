import {
  authMode,
  consumeOAuthStateCookie,
  issueOAuthStateCookie,
  sessionCookieHeader,
  signSession,
} from "./utils/auth.mjs";
import { buildAuthorizeUrl } from "./utils/agora-sso.mjs";

const handler = async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const home = `${url.origin}/`;

  if (authMode() === "bypass") {
    return Response.redirect(home, 307);
  }

  const { state, header: stateHeader } = issueOAuthStateCookie(req);
  const headers = new Headers({ Location: buildAuthorizeUrl(state) });
  headers.append("Set-Cookie", stateHeader);
  return new Response(null, { status: 307, headers });
};

export default handler;
