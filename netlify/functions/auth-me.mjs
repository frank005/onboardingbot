import { authMode, getSessionUserFromRequest } from "./utils/auth.mjs";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const handler = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return new Response(
      JSON.stringify({ authenticated: false, authMode: authMode() }),
      { status: 200, headers: corsHeaders },
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      authMode: authMode(),
      user: { id: user.id, email: user.email, name: user.name },
    }),
    { status: 200, headers: corsHeaders },
  );
};

export default handler;
