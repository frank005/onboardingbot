import React from "react";
import { useAuth } from "../context/AuthContext";
import { getDailyQuotaSeconds } from "../utils/dailyQuota";
import AgoraSignInScreen, {
  AgoraSignInLoading,
  AgoraQuotaExhaustedScreen,
} from "./AgoraSignInScreen";

export default function AgoraAuthGate({ children }) {
  const { me, loading, authError, signInUrl, sessionTimer } = useAuth();
  const quotaMinutes = Math.floor(getDailyQuotaSeconds() / 60);

  if (loading || !me) {
    return <AgoraSignInLoading />;
  }

  if (!me.authenticated) {
    return (
      <AgoraSignInScreen
        signInUrl={signInUrl}
        authError={authError}
        quotaMinutes={quotaMinutes}
      />
    );
  }

  if (sessionTimer.quotaExhausted && !sessionTimer.isTracking) {
    return (
      <AgoraQuotaExhaustedScreen
        quotaMinutes={quotaMinutes}
        signOutUrl="/api/auth/agora/logout"
      />
    );
  }

  return children;
}
