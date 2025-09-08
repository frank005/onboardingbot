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
        return null;
      }

      const sessionToken = sessionCookie.split('=')[1];
      if (!sessionToken) {
        return null;
      }

      // Parse JWT token (format: payload.signature)
      const [payloadB64] = sessionToken.split('.');
      if (!payloadB64) {
        return null;
      }

      // Convert base64url to base64 and decode
      const payload = payloadB64
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const decoded = atob(payload);
      const sessionData = JSON.parse(decoded);
      
      return sessionData.exp; // Expiry timestamp in milliseconds
    } catch (error) {
      console.error('Error parsing session token:', error);
      return null;
    }
  }, []);

  // Calculate time remaining until session expires
  const updateTimeRemaining = useCallback(() => {
    const expiryTime = getSessionExpiry();
    if (!expiryTime) {
      setTimeRemaining(null);
      setShowWarning(false);
      setIsExpired(false);
      return;
    }

    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) {
      setTimeRemaining(0);
      setShowWarning(false);
      setIsExpired(true);
    } else {
      setTimeRemaining(remaining);
      setShowWarning(remaining <= WARNING_TIME_MS);
      setIsExpired(false);
    }
  }, [getSessionExpiry]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback((ms) => {
    if (ms === null || ms <= 0) return '00:00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle session expiry
  const handleSessionExpiry = useCallback(() => {
    // Clear any existing session data
    document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Show expiry message
    alert('Your session has expired. Please log in again.');
    
    // Redirect to login
    window.location.href = '/login';
  }, []);

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

  // Handle session expiry
  useEffect(() => {
    if (isExpired) {
      handleSessionExpiry();
    }
  }, [isExpired, handleSessionExpiry]);

  return {
    timeRemaining,
    showWarning,
    isExpired,
    formatTimeRemaining,
    refreshSession,
    updateTimeRemaining
  };
};
