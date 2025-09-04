// Profile Sync System - Robust Profile Parsing with Markers
// Implements deterministic profile updates from Agora agent responses

// ————————————————————————————————————————————————————————————————
// 1) PROFILE PARSING UTILITIES
// ————————————————————————————————————————————————————————————————

/**
 * Parse profile update from assistant message
 * @param {string} text - Assistant message text
 * @param {string|null} expectedField - Expected field name (optional)
 * @returns {Object|null} - Parsed update or null
 */
export function parseProfileUpdate(text, expectedField = null) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Look for marker pattern: [[field:name value:value]]
  const markerPattern = /\[\[field:(\w+)\s+value:([^\]]+)\]\]/;
  const match = text.match(markerPattern);
  
  if (match) {
    const [, fieldName, value] = match;
    const cleanValue = value.trim();
    
    // Validate field name
    const validFields = ['name', 'birthday', 'interests', 'bio', 'experience'];
    if (!validFields.includes(fieldName)) {
      console.warn('⚠️ Invalid field name in marker:', fieldName);
      return null;
    }
    
    // Validate value is not empty
    if (!cleanValue || cleanValue === 'null' || cleanValue === 'undefined') {
      console.warn('⚠️ Empty value in marker for field:', fieldName);
      return null;
    }
    
    return {
      fieldName,
      value: cleanValue,
      source: 'marker'
    };
  }
  
  // Fallback: look for bracket pattern [value] at start of message
  const bracketPattern = /^\[([^\]]+)\]/;
  const bracketMatch = text.match(bracketPattern);
  
  if (bracketMatch && expectedField) {
    const value = bracketMatch[1].trim();
    if (value && value !== 'null' && value !== 'undefined') {
      return {
        fieldName: expectedField,
        value: value,
        source: 'bracket'
      };
    }
  }
  
  return null;
}

/**
 * Clean assistant message by removing markers and brackets
 * @param {string} text - Raw assistant message
 * @returns {string} - Cleaned message for display
 */
export function cleanAssistantMessage(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Remove marker pattern: [[field:name value:value]]
  let cleaned = text.replace(/\[\[field:\w+\s+value:[^\]]+\]\]/g, '');
  
  // Remove bracket pattern at start: [value]
  cleaned = cleaned.replace(/^\[[^\]]+\]\s*/, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// ————————————————————————————————————————————————————————————————
// 2) CONVERSATION WIRING
// ————————————————————————————————————————————————————————————————

/**
 * Wire conversation to profile updates using user data directly
 * @param {Object} agoraService - Agora service instance
 * @param {Function} onProfileUpdate - Callback for profile updates
 * @returns {Function} - Cleanup function
 */
export function wireConvoToProfile(agoraService, onProfileUpdate) {
  let isSubscribed = false;

  // Subscribe to assistant responses (only once)
  if (!isSubscribed) {
    agoraService.onAgentResponse((message) => {
      // Only parse final messages or after debounce
      if (message.isFinal !== true) {
        return; // Skip partials
      }

      const text = message.text || message.content || '';
      if (!text) return;

      // Parse profile update directly
      const update = parseProfileUpdate(text, null); // Let the parser determine the field
      if (update) {
        // Call the callback with the update
        if (onProfileUpdate) {
          onProfileUpdate(null, update);
        }
      }
    });
    
    isSubscribed = true;
    console.log('🔗 Wired conversation to profile updates (direct mode)');
  }

  // Return cleanup function
  return () => {
    if (isSubscribed) {
      // Note: We can't easily unsubscribe from agoraService events
      // This is a limitation of the current implementation
      isSubscribed = false;
      console.log('🔌 Unwired conversation from profile updates');
    }
  };
}

// ————————————————————————————————————————————————————————————————
// 3) UTILITY FUNCTIONS
// ————————————————————————————————————————————————————————————————

/**
 * Get expected field from current profile state
 * @param {Object} profile - Current profile object
 * @returns {string|null} - Next expected field or null if complete
 */
export function getExpectedField(profile) {
  const fieldOrder = ['name', 'birthday', 'interests', 'bio', 'experience'];
  for (const field of fieldOrder) {
    if (!profile[field] || profile[field] === 'Not provided') {
      return field;
    }
  }
  return null;
}

/**
 * Check if profile is complete
 * @param {Object} profile - Profile object to check
 * @returns {boolean} - True if all required fields are filled
 */
export function isProfileComplete(profile) {
  const requiredFields = ['name', 'birthday'];
  return requiredFields.every(field => profile[field] && profile[field] !== 'Not provided');
}

// ————————————————————————————————————————————————————————————————
// 4) CONFIGURATION HELPERS
// ————————————————————————————————————————————————————————————————

/**
 * Apply required join payload defaults for RTM and TTS
 * @param {Object} joinPayload - Join payload object
 * @returns {Object} - Modified join payload
 */
export function applyJoinDefaults(joinPayload) {
  joinPayload.properties = joinPayload.properties ?? {};
  
  // Enable RTM
  joinPayload.properties.advanced_features = {
    ...(joinPayload.properties.advanced_features ?? {}),
    enable_rtm: true,
  };
  
  // Set RTM as data channel
  joinPayload.properties.parameters = {
    ...(joinPayload.properties.parameters ?? {}),
    data_channel: "rtm",
    enable_metrics: true,
    enable_error_message: true,
  };
  
  // Ensure TTS skips [ ... ] (skip_patterns=[4])
  const tts = joinPayload.properties.tts ?? {};
  tts.skip_patterns = Array.isArray(tts.skip_patterns)
    ? Array.from(new Set([...tts.skip_patterns, 4]))
    : [4];
  joinPayload.properties.tts = tts;

  return joinPayload;
}

// Feature flags for testing
export const FEATURE_FLAGS = {
  FINAL_ONLY_PARSE: true,
  HIDE_MARKERS_IN_CAPTIONS: true,
  ENABLE_FALLBACK_PARSING: true
};