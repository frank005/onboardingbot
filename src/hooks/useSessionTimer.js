import { useCallback, useEffect, useRef, useState } from "react";
import {
  addUsedSeconds,
  getDailyQuotaSeconds,
  getRemainingSeconds,
  getUsedSeconds,
  isQuotaBypassed,
  isQuotaExhausted,
  utcDateBucket,
} from "../utils/dailyQuota";

const WARNING_THRESHOLD_SECONDS = 120;

/**
 * Tracks per-user daily demo time (client-side, no database).
 * Default budget: 15 minutes (900s) per UTC day via REACT_APP_DEMO_QUOTA_SECONDS.
 */
export function useSessionTimer(authUser) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const bucketRef = useRef(utcDateBucket());
  const sessionStartRef = useRef(null);
  const tickRef = useRef(null);

  const syncRemaining = useCallback(() => {
    if (!authUser?.id) {
      setTimeRemaining(null);
      setShowWarning(false);
      setIsExpired(false);
      return;
    }

    if (isQuotaBypassed(authUser)) {
      setTimeRemaining(Infinity);
      setShowWarning(false);
      setIsExpired(false);
      return;
    }

    const remaining = getRemainingSeconds(authUser, bucketRef.current);
    setTimeRemaining(remaining);
    setShowWarning(remaining > 0 && remaining <= WARNING_THRESHOLD_SECONDS);
    setIsExpired(remaining <= 0);
  }, [authUser]);

  useEffect(() => {
    bucketRef.current = utcDateBucket();
    syncRemaining();
  }, [authUser, syncRemaining]);

  const commitElapsed = useCallback(() => {
    if (!authUser?.id || isQuotaBypassed(authUser)) return;
    if (sessionStartRef.current == null) return;

    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - sessionStartRef.current) / 1000),
    );
    sessionStartRef.current = null;

    if (elapsed > 0) {
      addUsedSeconds(authUser.id, elapsed, bucketRef.current);
    }
    syncRemaining();
  }, [authUser, syncRemaining]);

  const startTracking = useCallback(() => {
    if (!authUser?.id || isQuotaExhausted(authUser, bucketRef.current)) {
      setIsExpired(true);
      return false;
    }

    bucketRef.current = utcDateBucket();
    sessionStartRef.current = Date.now();
    setIsTracking(true);
    setIsExpired(false);
    syncRemaining();
    return true;
  }, [authUser, syncRemaining]);

  const stopTracking = useCallback(() => {
    commitElapsed();
    setIsTracking(false);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [commitElapsed]);

  useEffect(() => {
    if (!isTracking || !authUser?.id || isQuotaBypassed(authUser)) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return undefined;
    }

    tickRef.current = window.setInterval(() => {
      if (sessionStartRef.current == null) return;

      const liveElapsed = Math.floor(
        (Date.now() - sessionStartRef.current) / 1000,
      );
      const baseUsed = getUsedSeconds(authUser.id, bucketRef.current);
      const projectedRemaining = Math.max(
        0,
        getDailyQuotaSeconds() - baseUsed - liveElapsed,
      );

      setTimeRemaining(projectedRemaining);
      setShowWarning(
        projectedRemaining > 0 && projectedRemaining <= WARNING_THRESHOLD_SECONDS,
      );

      if (projectedRemaining <= 0) {
        commitElapsed();
        setIsTracking(false);
        setIsExpired(true);
      }
    }, 1000);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isTracking, authUser, commitElapsed]);

  useEffect(() => {
    const onUnload = () => commitElapsed();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [commitElapsed]);

  const formatTimeRemaining = useCallback((seconds) => {
    const value = seconds ?? timeRemaining;
    if (value == null) return "--:--";
    if (value === Infinity) return "∞";
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [timeRemaining]);

  const refreshSession = useCallback(async () => {
    syncRemaining();
    return { success: !isQuotaExhausted(authUser, bucketRef.current) };
  }, [authUser, syncRemaining]);

  const updateTimeRemaining = useCallback(() => {
    syncRemaining();
  }, [syncRemaining]);

  const resetExpiryHandled = useCallback(() => {
    setIsExpired(false);
  }, []);

  return {
    timeRemaining,
    showWarning,
    isExpired,
    isTracking,
    quotaExhausted: authUser ? isQuotaExhausted(authUser, bucketRef.current) : false,
    formatTimeRemaining,
    refreshSession,
    updateTimeRemaining,
    resetExpiryHandled,
    startTracking,
    stopTracking,
  };
}
