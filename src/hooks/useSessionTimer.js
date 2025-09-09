import { useState, useEffect, useCallback } from 'react';

// Session expiry time in milliseconds (20 minutes)
const SESSION_DURATION_MS = 20 * 60 * 1000;

// Warning time before expiry (5 minutes before)
const WARNING_TIME_MS = 5 * 60 * 1000;

export const useSessionTimer = () => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Parse session token to get expiry time
  const getSessionExpiry = useCallback(() => {
    try {
      // Get session cookie
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => 
        cookie.trim().startsWith('session=')
      );
      
      if (!sessionCookie) {
        console.log('Session timer: No session cookie found');
        return null;
      }

      const sessionToken = sessionCookie.split('=')[1];
      if (!sessionToken) {
        console.log('Session timer: Empty session token');
        return null;
      }

      // Parse JWT token (format: payload.signature)
      const [payloadB64] = sessionToken.split('.');
      if (!payloadB64) {
        console.log('Session timer: Invalid token format');
        return null;
      }

      // Convert base64url to base64 and decode
      const payload = payloadB64
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const decoded = atob(payload);
      const sessionData = JSON.parse(decoded);
      
      console.log('Session timer: Parsed session data:', {
        iat: new Date(sessionData.iat).toISOString(),
        exp: new Date(sessionData.exp).toISOString(),
        who: sessionData.who,
        now: new Date().toISOString(),
        remaining: sessionData.exp - Date.now()
      });
      
      return sessionData.exp; // Expiry timestamp in milliseconds
    } catch (error) {
      console.error('Session timer: Error parsing session token:', error);
      return null;
    }
  }, []);

  // Calculate time remaining until session expires
  const updateTimeRemaining = useCallback(() => {
    const expiryTime = getSessionExpiry();
    if (!expiryTime) {
      // If no session cookie found, this means the session has expired or been removed
      // Treat this as an expired session and trigger logout
      console.log('Session timer: No session cookie - treating as expired');
      setTimeRemaining(0);
      setShowWarning(false);
      setIsExpired(true);
      return;
    }

    const now = Date.now();
    const remaining = expiryTime - now;

    console.log('Session timer: Update check', {
      expiryTime,
      now,
      remaining,
      remainingMinutes: Math.floor(remaining / 60000),
      warningThreshold: WARNING_TIME_MS,
      shouldShowWarning: remaining <= WARNING_TIME_MS
    });

    if (remaining <= 0) {
      console.log('Session timer: Session expired');
      setTimeRemaining(0);
      setShowWarning(false);
      setIsExpired(true);
    } else {
      setTimeRemaining(remaining);
      setShowWarning(remaining <= WARNING_TIME_MS);
      setIsExpired(false);
    }
  }, [getSessionExpiry, isExpired]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback((ms) => {
    if (ms === null || ms <= 0) return '00:00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle session expiry
  const handleSessionExpiry = useCallback(() => {
    console.log('Session timer: Handling session expiry');

    // Clear any existing session data
    document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // Show expiry message
    alert('Your session has expired. Please log in again.');

    // Redirect to login
    window.location.href = '/login';
  }, []);

  // Track if we've already handled expiry to prevent multiple alerts
  const [expiryHandled, setExpiryHandled] = useState(false);

  // Refresh session (placeholder for future implementation)
  const refreshSession = useCallback(async () => {
    // TODO: Implement session refresh endpoint
    console.log('Session refresh not yet implemented');
  }, []);

  // Set up timer
  useEffect(() => {
    // Initial check
    updateTimeRemaining();

    // Set up interval to check every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  // Additional session validation - check if session is still valid on page focus/visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, check session
        console.log('Session timer: Page became visible, checking session');
        updateTimeRemaining();
      }
    };

    const handleFocus = () => {
      console.log('Session timer: Window focused, checking session');
      updateTimeRemaining();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateTimeRemaining]);

  // Handle session expiry
  useEffect(() => {
    console.log('Session timer: Expiry effect triggered', { isExpired, expiryHandled });
    if (isExpired && !expiryHandled) {
      console.log('Session timer: Calling handleSessionExpiry');
      setExpiryHandled(true);
      handleSessionExpiry();
    }
  }, [isExpired, expiryHandled, handleSessionExpiry]);

  return {
    timeRemaining,
    showWarning,
    isExpired,
    formatTimeRemaining,
    refreshSession,
    updateTimeRemaining
  };
};
