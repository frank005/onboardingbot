import { signSession } from "./utils/auth.mjs";

/**
 * Smoke-test SESSION_JWT_SECRET + jose in the deployed function runtime.
 * GET /api/auth/session-probe → { ok: true } or { ok: false, error, secretLen }
 */
const handler = async () => {
  const secretLen = process.env.SESSION_JWT_SECRET?.trim()?.length ?? 0;
  try {
    const jwt = await signSession({
      id: "probe-user",
      email: "probe@example.com",
      name: "Probe",
    });
    return new Response(
      JSON.stringify({ ok: true, secretLen, jwtLen: jwt.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth] session-probe failed:", message);
    return new Response(
      JSON.stringify({ ok: false, secretLen, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export default handler;
