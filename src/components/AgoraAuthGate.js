import React from "react";
import { useAuth } from "../context/AuthContext";
import { getDailyQuotaSeconds } from "../utils/dailyQuota";

export default function AgoraAuthGate({ children }) {
  const { me, loading, authError, signInUrl, sessionTimer } = useAuth();
  const quotaMinutes = Math.floor(getDailyQuotaSeconds() / 60);

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking sign-in…</p>
        </div>
      </div>
    );
  }

  if (!me.authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Agora Conversational AI Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Sign in with your Agora account to use the demo. Each user gets{" "}
            {quotaMinutes} minutes per day.
          </p>
          {authError ? (
            <p className="text-red-600 text-sm mb-4">
              Sign-in error: <code>{authError}</code>
            </p>
          ) : null}
          <a
            href={signInUrl}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Sign in with Agora
          </a>
          <p className="text-xs text-gray-400 mt-4">
            Auth mode: <code>{me.authMode}</code>
          </p>
        </div>
      </div>
    );
  }

  if (sessionTimer.quotaExhausted && !sessionTimer.isTracking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Daily demo time used up
          </h1>
          <p className="text-gray-600 mb-6">
            You&apos;ve used your {quotaMinutes}-minute daily budget. Quota
            resets at midnight UTC.
          </p>
          <a
            href="/api/auth/agora/logout"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Sign out
          </a>
        </div>
      </div>
    );
  }

  return children;
}
