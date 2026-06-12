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

  // Look for marker pattern: [[field:name value:value]] anywhere in the message
  const markerPattern = /\[\[field:(\w+)\s+value:([^\]]+)\]\]/g;
  let match;
  let bestMatch = null;
  
  // Find all matches and use the first valid one
  while ((match = markerPattern.exec(text)) !== null) {
    const [, fieldName, value] = match;
    const cleanValue = value.trim();
    
    // Validate field name
    const validFields = ['name', 'birthday', 'interests', 'bio', 'experience'];
    if (!validFields.includes(fieldName)) {
      console.warn('⚠️ Invalid field name in marker:', fieldName);
      continue;
    }
    
    // Validate value is not empty
    if (!cleanValue || cleanValue === 'null' || cleanValue === 'undefined') {
      console.warn('⚠️ Empty value in marker for field:', fieldName);
      continue;
    }
    
    bestMatch = {
      fieldName,
      value: cleanValue,
      source: 'marker'
    };
    break; // Use the first valid match
  }
  
  if (bestMatch) {
    return bestMatch;
  }
  
  // Fallback: look for bracket pattern [value] anywhere in the message
  const bracketPattern = /\[([^\]]+)\]/g;
  let bracketMatch;
  
  while ((bracketMatch = bracketPattern.exec(text)) !== null) {
    const value = bracketMatch[1].trim();
    if (value && value !== 'null' && value !== 'undefined') {
      // If we have an expected field, use it; otherwise try to infer from context
      if (expectedField) {
        return {
          fieldName: expectedField,
          value: value,
          source: 'bracket'
        };
      }
      
      // Try to infer field from context or use a default
      // This is a fallback for when the LLM doesn't follow the exact format
      const validFields = ['name', 'birthday', 'interests', 'bio', 'experience'];
      for (const field of validFields) {
        if (text.toLowerCase().includes(field.toLowerCase())) {
          return {
            fieldName: field,
            value: value,
            source: 'bracket-inferred'
          };
        }
      }
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
    return text || '';
  }
  
  // Remove marker pattern: [[field:name value:value]] from anywhere in the message
  let cleaned = text.replace(/\[\[field:\w+\s+value:[^\]]+\]\]/g, '');
  
  // Remove bracket pattern [value] from anywhere in the message (but be more selective)
  // Only remove brackets that look like field values (not general brackets)
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, (match, content) => {
    // If the content looks like a field value (name, date, etc.), remove it
    // Otherwise keep the brackets (they might be part of the actual message)
    const trimmedContent = content.trim();
    
    // Check if it looks like a field value (name, date, interests, etc.)
    if (
      /^[A-Za-z\s]+$/.test(trimmedContent) || // Names (letters and spaces)
      /^\d{4}-\d{2}-\d{2}$/.test(trimmedContent) || // Dates (YYYY-MM-DD)
      /^[A-Za-z\s,]+$/.test(trimmedContent) || // Interests (letters, spaces, commas)
      trimmedContent.length < 50 // Short content that might be field values
    ) {
      return ''; // Remove the bracket
    }
    
    return match; // Keep the bracket
  });
  
  // Clean up extra whitespace and ensure we have content
  cleaned = cleaned.trim();
  
  // If cleaning resulted in empty string, return original text
  if (!cleaned) {
    return text;
  }
  
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
  // Note: This function no longer adds its own event listener to prevent duplicates.
  // The main ConversationInterface already handles transcription-updated events.
  // This function now just returns a cleanup function for compatibility.
  
  console.log('🔗 Profile sync wired (no duplicate event listeners)');
  
  // Return cleanup function
  return () => {
    // No cleanup needed since we're not adding event listeners here
    console.log('🔌 Profile sync unwired');
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
  
  // Ensure TTS skips [ ... ] so profile markers are in transcript but not spoken (Agora skip_patterns code 4).
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