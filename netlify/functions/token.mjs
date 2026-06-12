// Netlify Function: POST /api/token
// Generates an Agora RTC+RTM token for a channel/uid pair
// Returns { token: null } if AGORA_APP_CERTIFICATE is not set (tokenless mode)

// Static import lets esbuild bundle the CJS utils into the function.
// RtcTokenBuilder2.js internally requires AccessToken2.js, so esbuild follows the chain.
import rtcTokenBuilderModule from './utils/RtcTokenBuilder2.js';
const { RtcTokenBuilder, RtcRole } = rtcTokenBuilderModule;

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

const handler = async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return new Response(JSON.stringify({ token: null }), {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { channelName, uid } = await req.json();

    if (!channelName || uid === undefined) {
      return new Response(JSON.stringify({ error: 'Missing channelName or uid' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const TTL = 3600;
    const expireAt = Math.floor(Date.now() / 1000) + TTL;

    const token = await RtcTokenBuilder.buildTokenWithRtm(
      appId,
      appCertificate,
      channelName,
      uid.toString(),
      RtcRole.PUBLISHER,
      expireAt,
      expireAt
    );

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    console.error('❌ token function error:', err);
    return new Response(JSON.stringify({ error: 'Internal Error', details: String(err) }), {
      status: 500,
      headers: corsHeaders
    });
  }
};

export default handler;
