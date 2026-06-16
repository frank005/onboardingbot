import { useCallback, useEffect, useState } from "react";

/**
 * Client-side Agora SSO identity — polls GET /api/auth/me.
 * Ported from agora-sso-starter (no database, no Redis).
 */
export function useAgoraAuth() {
  const [me, setMe] = useState(null);
  const [authError, setAuthError] = useState(null);

  const refreshMe = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    const json = await res.json();
    setMe(json);
    return json;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("authError");
    if (err) {
      setAuthError(err);
      params.delete("authError");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      );
    }
    refreshMe().catch((err) => console.error("[useAgoraAuth] me failed", err));
  }, [refreshMe]);

  return {
    me,
    loading: me === null,
    authError,
    refreshMe,
    signInUrl: "/api/auth/agora/start",
    signOutUrl: "/api/auth/agora/logout",
  };
}
