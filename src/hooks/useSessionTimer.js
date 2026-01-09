import { useState, useEffect, useCallback, useRef } from 'react';

// Session expiry time in milliseconds (20 minutes) - used for reference
// const SESSION_DURATION_MS = 20 * 60 * 1000;

// Warning time before expiry (5 minutes before)
const WARNING_TIME_MS = 5 * 60 * 1000;

// Global flag to prevent multiple expiry handlers from running
let globalExpiryHandled = false;

export const useSessionTimer = () => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Check if bypass is active via URL parameter
  const isBypassActive = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("bypass") === "true" || urlParams.get("dev") === "true";
  }, []);

  // Parse session token to get expiry time
  const getSessionExpiry = useCallback(() => {
    try {
      // Get session cookie
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => 
        cookie.trim().startsWith('session=')
      );
      
      if (!sessionCookie) {
        // console.log('Session timer: No session cookie found');
        return null;
      }

      const sessionToken = sessionCookie.split('=')[1];
      if (!sessionToken) {
        // console.log('Session timer: Empty session token');
        return null;
      }

      // Parse JWT token (format: payload.signature)
      const [payloadB64] = sessionToken.split('.');
      if (!payloadB64) {
        // console.log('Session timer: Invalid token format');
        return null;
      }

      // Convert base64url to base64 and decode
      const payload = payloadB64
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const decoded = atob(payload);
      const sessionData = JSON.parse(decoded);
      
      // console.log('Session timer: Parsed session data:', {
      //   iat: new Date(sessionData.iat).toISOString(),
      //   exp: new Date(sessionData.exp).toISOString(),
      //   who: sessionData.who,
      //   now: new Date().toISOString(),
      //   remaining: sessionData.exp - Date.now()
      // });
      
      return sessionData.exp; // Expiry timestamp in milliseconds
    } catch (error) {
      console.error('Session timer: Error parsing session token:', error);
      return null;
    }
  }, []);

  // Calculate time remaining until session expires
  const updateTimeRemaining = useCallback(() => {
    // Skip session checks if bypass is active
    if (isBypassActive()) {
      setTimeRemaining(null);
      setShowWarning(false);
      setIsExpired(false);
      return;
    }

    const expiryTime = getSessionExpiry();
    if (!expiryTime) {
      // If no session cookie found, this means the session has expired or been removed
      // Treat this as an expired session and trigger logout
      // console.log('Session timer: No session cookie - treating as expired');
      setTimeRemaining(0);
      setShowWarning(false);
      setIsExpired(true);
      return;
    }

    const now = Date.now();
    const remaining = expiryTime - now;

    // console.log('Session timer: Update check', {
    //   expiryTime,
    //   now,
    //   remaining,
    //   remainingMinutes: Math.floor(remaining / 60000),
    //   warningThreshold: WARNING_TIME_MS,
    //   shouldShowWarning: remaining <= WARNING_TIME_MS
    // });

    if (remaining <= 0) {
      // console.log('Session timer: Session expired');
      setTimeRemaining(0);
      setShowWarning(false);
      setIsExpired(true);
    } else {
      setTimeRemaining(remaining);
      setShowWarning(remaining <= WARNING_TIME_MS);
      setIsExpired(false);
    }
  }, [getSessionExpiry, isBypassActive]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback((ms) => {
    if (ms === null || ms <= 0) return '00:00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle session expiry
  const handleSessionExpiry = useCallback(() => {
    // Skip if bypass is active
    if (isBypassActive()) {
      return;
    }

    // console.log('Session timer: Handling session expiry');

    // Clear any existing session data
    document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    // Show expiry message
    alert('Your session has expired. Please log in again.');

    // Redirect to login
    window.location.href = '/login';
  }, [isBypassActive]);

  // Track if we've already handled expiry to prevent multiple alerts
  const expiryHandledRef = useRef(false);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      // console.log('Session timer: Refreshing session...');
      
      const response = await fetch('/.netlify/functions/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh session');
      }

      const data = await response.json();
      // console.log('Session timer: Session refreshed successfully');
      
      // Reset the expiry handled flag since we have a fresh session
      expiryHandledRef.current = false;
      globalExpiryHandled = false;
      
      // Update the timer to reflect the new session
      updateTimeRemaining();
      
      return data;
    } catch (error) {
      console.error('Session timer: Error refreshing session:', error);
      throw error;
    }
  }, [updateTimeRemaining]);

  // Reset expiry handled flag (useful when starting a new session)
  const resetExpiryHandled = useCallback(() => {
    expiryHandledRef.current = false;
    globalExpiryHandled = false; // Reset global flag too
  }, []);

  // Set up timer
  useEffect(() => {
    // Add a small delay for initial check to allow cookies to be set
    const initialDelay = setTimeout(() => {
      updateTimeRemaining();
    }, 100);

    // Set up interval to check every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [updateTimeRemaining]);

  // Additional session validation - check if session is still valid on page focus/visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, check session
        // console.log('Session timer: Page became visible, checking session');
        updateTimeRemaining();
      }
    };

    const handleFocus = () => {
      // console.log('Session timer: Window focused, checking session');
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
    // Skip if bypass is active
    if (isBypassActive()) {
      return;
    }

    // console.log('Session timer: Expiry effect triggered', { isExpired, expiryHandled: expiryHandledRef.current, globalExpiryHandled });
    if (isExpired && !expiryHandledRef.current && !globalExpiryHandled) {
      // console.log('Session timer: Calling handleSessionExpiry');
      expiryHandledRef.current = true;
      globalExpiryHandled = true; // Prevent other instances from handling expiry
      handleSessionExpiry();
    }
  }, [isExpired, handleSessionExpiry, isBypassActive]);

  return {
    timeRemaining,
    showWarning,
    isExpired,
    formatTimeRemaining,
    refreshSession,
    updateTimeRemaining,
    resetExpiryHandled
  };
};
