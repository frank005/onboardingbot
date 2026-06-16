import React, { createContext, useContext, useMemo } from "react";
import { useAgoraAuth } from "../hooks/useAgoraAuth";
import { useSessionTimer } from "../hooks/useSessionTimer";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAgoraAuth();
  const authUser = auth.me?.authenticated ? auth.me.user : null;
  const sessionTimer = useSessionTimer(authUser);

  const value = useMemo(
    () => ({
      ...auth,
      authUser,
      sessionTimer,
    }),
    [auth, authUser, sessionTimer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
