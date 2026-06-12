// Session auth has been removed from this demo.
// This hook is kept as a no-op so existing consumers (ConversationInterface, Navigation) keep compiling.
import { useCallback } from 'react';

export const useSessionTimer = () => {
  const formatTimeRemaining = useCallback(() => '00:00', []);
  const refreshSession = useCallback(async () => ({ success: true }), []);
  const updateTimeRemaining = useCallback(() => {}, []);
  const resetExpiryHandled = useCallback(() => {}, []);

  return {
    timeRemaining: null,
    showWarning: false,
    isExpired: false,
    formatTimeRemaining,
    refreshSession,
    updateTimeRemaining,
    resetExpiryHandled,
  };
};
