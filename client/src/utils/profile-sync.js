// Profile Sync System - Robust Profile Parsing with Markers
// Implements deterministic profile updates from Agora agent responses

// ————————————————————————————————————————————————————————————————
// 1) PROFILE STATE MANAGEMENT
// ————————————————————————————————————————————————————————————————

class ProfileStore {
  constructor() {
    this.profile = {
      name: null,
      birthday: null,
      interests: null,
      bio: null,
      experience: null
    };
    this.assistantSeq = 0;
    this.lastSeq = 0;
    
    // Restore from sessionStorage
    this.restoreFromStorage();
  }

  // Get next expected field based on current profile state
  getExpectedField() {
    const fieldOrder = ['name', 'birthday', 'interests', 'bio', 'experience'];
    for (const field of fieldOrder) {
      if (!this.profile[field]) {
        return field;
      }
    }
    return null; // All fields completed
  }

  // Update profile with new field value
  updateField(fieldName, value, seq) {
    // Ignore updates where seq <= lastSeq (idempotency)
    if (seq <= this.lastSeq) {
      console.log(`🔄 Ignoring duplicate update: seq ${seq} <= lastSeq ${this.lastSeq}`);
      return false;
    }

    // Validate field name
    if (!['name', 'birthday', 'interests', 'bio', 'experience'].includes(fieldName)) {
      console.warn(`⚠️ Unknown field: ${fieldName}`);
      return false;
    }

    // Normalize values
    let normalizedValue = value;
    switch (fieldName) {
      case 'interests':
        if (typeof value === 'string') {
          normalizedValue = value.split(',').map(item => item.trim()).filter(Boolean);
        }
        break;
      case 'birthday':
        normalizedValue = this.normalizeBirthday(value);
        break;
      default:
        normalizedValue = value;
    }

    // Update profile
    this.profile[fieldName] = normalizedValue;
    this.lastSeq = seq;
    
    console.log(`✅ Updated ${fieldName}:`, normalizedValue, `(seq: ${seq})`);
    
    // Persist to sessionStorage
    this.persistToStorage();
    
    return true;
  }

  // Normalize birthday to YYYY-MM-DD format
  normalizeBirthday(value) {
    if (!value) return null;
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // Try MM/DD/YYYY format
    const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try other common formats or return as is
    return value;
  }

  // Get current profile
  getProfile() {
    return { ...this.profile };
  }

  // Reset profile
  reset() {
    this.profile = {
      name: null,
      birthday: null,
      interests: null,
      bio: null,
      experience: null
    };
    this.assistantSeq = 0;
    this.lastSeq = 0;
    this.persistToStorage();
  }

  // Persist to sessionStorage
  persistToStorage() {
    try {
      const data = {
        profile: this.profile,
        lastSeq: this.lastSeq
      };
      sessionStorage.setItem('agoraProfile', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to persist profile to sessionStorage:', error);
    }
  }

  // Restore from sessionStorage
  restoreFromStorage() {
    try {
      const stored = sessionStorage.getItem('agoraProfile');
      if (stored) {
        const data = JSON.parse(stored);
        this.profile = data.profile || this.profile;
        this.lastSeq = data.lastSeq || 0;
        console.log('📥 Restored profile from sessionStorage:', this.profile);
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore profile from sessionStorage:', error);
    }
  }
}

// ————————————————————————————————————————————————————————————————
// 2) MARKER PARSING (ROBUST + FALLBACK)
// ————————————————————————————————————————————————————————————————

/**
 * Parse profile update from assistant message
 * @param {string} message - Raw assistant message
 * @param {string} expectedField - Expected field for this step
 * @returns {Object|null} - Parsed field update or null
 */
export function parseProfileUpdate(message, expectedField) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  // Clean the message first (remove leading whitespace)
  const cleanMessage = message.trim();
  
  // Pattern 1: Machine tag (authoritative)
  // Start-anchored pattern: ^\s*\[\[field:(\w+)\s+value:([^\]]+)\]\]\s*
  const machineTagPattern = /^\s*\[\[field:(\w+)\s+value:([^\]]+)\]\]\s*/;
  const machineTagMatch = cleanMessage.match(machineTagPattern);
  
  if (machineTagMatch) {
    const [, fieldName, value] = machineTagMatch;
    
    // Validate that we have both field name and value
    if (!fieldName || !value || value.trim() === '') {
      console.warn(`⚠️ Malformed machine tag - empty value: field=${fieldName}, value="${value}"`);
      return null;
    }
    
    console.log(`🔍 Parsed machine tag: ${fieldName} = ${value}`);
    return { fieldName, value, source: 'machine_tag' };
  }
  
  // Pattern 2: Bracket value fallback (if we know expected field)
  if (expectedField) {
    // Start-anchored pattern: ^\s*\[([^\[\]]+)\]\s*
    const bracketPattern = /^\s*\[([^\[\]]+)\]\s*/;
    const bracketMatch = cleanMessage.match(bracketPattern);
    
    if (bracketMatch) {
      const [, value] = bracketMatch;
      
      // Validate that we have a meaningful value
      if (!value || value.trim() === '') {
        console.warn(`⚠️ Malformed bracket fallback - empty value: ${expectedField} = "${value}"`);
        return null;
      }
      
      console.log(`🔍 Parsed bracket fallback: ${expectedField} = ${value}`);
      return { fieldName: expectedField, value, source: 'bracket_fallback' };
    }
  }
  
  return null;
}

// ————————————————————————————————————————————————————————————————
// 3) MESSAGE CLEANUP (HIDE MARKERS EVERYWHERE)
// ————————————————————————————————————————————————————————————————

/**
 * Clean assistant message by removing markers for display
 * @param {string} message - Raw assistant message with markers
 * @returns {string} - Clean message without markers
 */
export function cleanAssistantMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let cleanMessage = message;

  // Step 1: Remove leading machine tag (once) - handle both valid and malformed
  // Pattern: ^\s*\[\[field:[^\]]+\]\]\s*
  cleanMessage = cleanMessage.replace(/^\s*\[\[field:[^\]]+\]\]\s*/, '');

  // Step 2: Remove leading bracket value (once) - handle both valid and malformed
  // Pattern: ^\s*\[[^\[\]]*\]\s* (note: [^\[\]]* allows empty brackets)
  cleanMessage = cleanMessage.replace(/^\s*\[[^\[\]]*\]\s*/, '');

  // Step 3: Clean up any remaining empty brackets or malformed markers
  cleanMessage = cleanMessage.replace(/^\s*\[\s*\]\s*/, ''); // Remove empty brackets
  cleanMessage = cleanMessage.replace(/^\s*\[\[field:[^\]]*\]\]\s*/, ''); // Remove malformed field tags

  // Step 4: Trim and return
  return cleanMessage.trim();
}

// ————————————————————————————————————————————————————————————————
// 4) CONVERSATION WIRING
// ————————————————————————————————————————————————————————————————

/**
 * Wire conversation to profile updates
 * @param {Object} agoraService - Agora service instance
 * @param {Function} onProfileUpdate - Callback for profile updates
 * @returns {Function} - Cleanup function
 */
export function wireConvoToProfile(agoraService, onProfileUpdate) {
  const profileStore = new ProfileStore();
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

      // Get expected field for this step
      const expectedField = profileStore.getExpectedField();
      
      // Parse profile update
      const update = parseProfileUpdate(text, expectedField);
      if (update) {
        // Increment sequence and update profile
        profileStore.assistantSeq++;
        const updated = profileStore.updateField(
          update.fieldName, 
          update.value, 
          profileStore.assistantSeq
        );
        
        if (updated && onProfileUpdate) {
          onProfileUpdate(profileStore.getProfile(), update);
        }
      }
    });
    
    isSubscribed = true;
    console.log('🔗 Wired conversation to profile updates');
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
// 5) UTILITY FUNCTIONS
// ————————————————————————————————————————————————————————————————

/**
 * Create profile store instance
 * @returns {ProfileStore} - Profile store instance
 */
export function createProfileStore() {
  return new ProfileStore();
}

/**
 * Get expected field from current profile state
 * @param {Object} profile - Current profile object
 * @returns {string|null} - Next expected field or null if complete
 */
export function getExpectedField(profile) {
  const fieldOrder = ['name', 'birthday', 'interests', 'bio', 'experience'];
  for (const field of fieldOrder) {
    if (!profile[field]) {
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
  return requiredFields.every(field => profile[field]);
}

// ————————————————————————————————————————————————————————————————
// 6) CONFIGURATION HELPERS
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

// Export ProfileStore class for advanced usage
export { ProfileStore };
