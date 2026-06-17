/**
 * Session + auth-mode helpers for Netlify Functions.
 * Ported from agora-sso-starter (Next.js) — no database required.
 */

import "./crypto-polyfill.mjs";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "agora_session";
export const OAUTH_STATE_COOKIE = "agora_oauth_state";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

export function authMode() {
  const raw = (process.env.AUTH_MODE || "").toLowerCase();
  if (raw === "bypass") {
    if (process.env.NODE_ENV !== "production") return "bypass";
    if (process.env.ALLOW_BYPASS_IN_PRODUCTION === "true") return "bypass";
    return "sso";
  }
  return "sso";
}

function secretKey() {
  const raw = process.env.SESSION_JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      "SESSION_JWT_SECRET is not set or is shorter than 32 chars. Generate one with `openssl rand -hex 48`.",
    );
  }
  return new TextEncoder().encode(raw);
}

/** Coerce Agora profile fields into JWT-safe strings. */
export function toSessionUser(customer) {
  const id = String(customer?.id ?? "").trim();
  const email = String(customer?.email ?? "").trim();
  const name =
    String(customer?.name ?? "").trim() || email || id;
  if (!id) {
    throw new Error("Session user id is empty after normalization");
  }
  return {
    id: id.slice(0, 256),
    email: email.slice(0, 320),
    name: name.slice(0, 256),
  };
}

export async function signSession(user) {
  const sessionUser = toSessionUser(user);
  return await new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setSubject(sessionUser.id)
    .sign(secretKey());
}

export async function verifySession(jwt) {
  try {
    const { payload } = await jwtVerify(jwt, secretKey(), {
      algorithms: ["HS256"],
    });
    const id = typeof payload.id === "string" ? payload.id : null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!id) return null;
    return { id, email, name };
  } catch {
    return null;
  }
}

export function parseCookieHeader(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq === -1) return [trimmed, ""];
      return [trimmed.slice(0, eq), trimmed.slice(eq + 1)];
    }),
  );
}

export function buildSetCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  parts.push(`SameSite=${options.sameSite || "Lax"}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function isSecureRequest(req) {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto === "https";
  return process.env.NODE_ENV === "production";
}

export async function getSessionUserFromRequest(req) {
  if (authMode() === "bypass") {
    return {
      id: "bypass-user",
      email: "demo@local",
      name: "Demo User",
    };
  }
  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return await verifySession(token);
}

export function sessionCookieHeader(jwt, req) {
  return buildSetCookie(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookieHeader(req) {
  return buildSetCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    maxAge: 0,
  });
}

export function issueOAuthStateCookie(req) {
  const state = randomUUID();
  const header = buildSetCookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
  return { state, header };
}

export function consumeOAuthStateCookie(req) {
  const cookies = parseCookieHeader(req.headers.get("cookie"));
  const value = cookies[OAUTH_STATE_COOKIE] ?? null;
  const clearHeader = buildSetCookie(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(req),
    maxAge: 0,
  });
  return { value, clearHeader };
}

export async function requireSessionUser(req) {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return {
      user: null,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }),
    };
  }
  return { user, response: null };
}
