import {
  authMode,
  consumeOAuthStateCookie,
  sessionCookieHeader,
  signSession,
} from "./utils/auth.mjs";
import { exchangeCodeForToken, fetchCustomer } from "./utils/agora-sso.mjs";

const handler = async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const home = new URL("/", url.origin);

  if (authMode() === "bypass") {
    return new Response(
      JSON.stringify({ error: "SSO callback is disabled in bypass mode." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const ssoError = url.searchParams.get("error");

  if (ssoError) {
    console.error(`[auth] SSO returned error=${ssoError}`);
    home.searchParams.set("authError", ssoError);
    return Response.redirect(home.toString(), 307);
  }

  if (!code || !state) {
    home.searchParams.set("authError", "missing_params");
    return Response.redirect(home.toString(), 307);
  }

  const { value: expectedState, clearHeader: clearStateHeader } =
    consumeOAuthStateCookie(req);
  if (!expectedState || expectedState !== state) {
    console.error("[auth] state mismatch on SSO callback");
    home.searchParams.set("authError", "state_mismatch");
    return Response.redirect(home.toString(), 307);
  }

  let authError = "exchange_failed";
  try {
    let token;
    try {
      token = await exchangeCodeForToken(code);
    } catch (err) {
      authError = "token_exchange_failed";
      throw err;
    }

    let customer;
    try {
      customer = await fetchCustomer(token.access_token);
    } catch (err) {
      authError = "profile_fetch_failed";
      throw err;
    }

    let sessionJwt;
    try {
      sessionJwt = await signSession({
        id: customer.id,
        email: customer.email,
        name: customer.name,
      });
    } catch (err) {
      authError = "session_failed";
      throw err;
    }

    const headers = new Headers({ Location: home.toString() });
    headers.append("Set-Cookie", clearStateHeader);
    headers.append("Set-Cookie", sessionCookieHeader(sessionJwt, req));
    return new Response(null, { status: 307, headers });
  } catch (err) {
    console.error(`[auth] callback failed (${authError}):`, err);
    home.searchParams.set("authError", authError);
    const headers = new Headers({ Location: home.toString() });
    headers.append("Set-Cookie", clearStateHeader);
    return new Response(null, { status: 307, headers });
  }
};

export default handler;
