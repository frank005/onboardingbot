/**
 * Agora SSO OAuth 2.0 client — ported from agora-sso-starter.
 */

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function ssoBaseUrl() {
  return (process.env.AGORA_SSO_BASE_URL || "https://sso2.agora.io").replace(
    /\/+$/,
    "",
  );
}

function ssoOpenHost() {
  return (
    process.env.AGORA_SSO_OPEN_HOST || "https://sso-open.agora.io"
  ).replace(/\/+$/, "");
}

function ssoClientId() {
  return requiredEnv("AGORA_SSO_CLIENT_ID");
}

function ssoClientSecret() {
  return requiredEnv("AGORA_SSO_CLIENT_SECRET");
}

export function ssoRedirectUri() {
  return requiredEnv("AGORA_SSO_REDIRECT_URI");
}

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ssoClientId(),
    redirect_uri: ssoRedirectUri(),
    scope: "basic_info",
    state,
  });
  return `${ssoBaseUrl()}/api/v0/oauth/authorize?${params.toString()}`;
}

export function buildLogoutUrl(redirectUri) {
  const params = new URLSearchParams({ redirect_uri: redirectUri });
  return `${ssoBaseUrl()}/api/v0/logout?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: ssoClientId(),
    client_secret: ssoClientSecret(),
    code,
    redirect_uri: ssoRedirectUri(),
  });
  const res = await fetch(`${ssoBaseUrl()}/api/v0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SSO token exchange failed (${res.status}): ${text}`);
  }
  return res.json();
}

function normalizeCustomer(data) {
  const pick = (...keys) => {
    for (const key of keys) {
      const v = data[key];
      if (v == null) continue;
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return "";
  };

  const id =
    pick("customerId", "customer_id", "userId", "user_id", "id", "uid") ||
    pick("accountId", "account_id") ||
    pick("email", "emailAddress", "email_address", "loginEmail");
  const email = pick("email", "emailAddress", "email_address", "loginEmail");
  const name = pick(
    "name",
    "displayName",
    "display_name",
    "nickname",
    "fullName",
    "full_name",
    "username",
  );

  if (!id) {
    throw new Error(
      "Agora /customer response did not include a stable user identifier.",
    );
  }

  return {
    id,
    email,
    name: name || email || id,
    raw: data,
  };
}

export async function fetchCustomer(accessToken) {
  const host = ssoOpenHost();
  const candidates = [
    `${host}/api/v0/customer/user-auth`,
    `${host}/api/v0/customer/company/basic-info`,
  ];
  let lastError = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastError = `${url} → ${res.status} ${text.slice(0, 200)}`;
        continue;
      }
      const json = await res.json();
      const data =
        json.data ?? json.customer ?? json;
      try {
        return normalizeCustomer(data);
      } catch (normErr) {
        lastError = `${url} → 200 but ${normErr.message}`;
      }
    } catch (err) {
      lastError = `${url} → ${err.message}`;
    }
  }
  throw new Error(
    `Failed to fetch Agora customer profile. Last error: ${lastError ?? "unknown"}`,
  );
}
