// frontend/src/utils/persistence.js

// Simple persistence utility for critical app state
export const Persistence = {
  // Save data to localStorage with expiration
  set(key, data, expirationMinutes = 60) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expiration: expirationMinutes * 60 * 1000 // Convert to milliseconds
      };
      localStorage.setItem(`ascend_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  // Get data from localStorage, return null if expired or not found
  get(key) {
    try {
      const item = localStorage.getItem(`ascend_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();
      
      // Check if expired
      if (now - parsed.timestamp > parsed.expiration) {
        localStorage.removeItem(`ascend_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },

  // Remove data from localStorage
  remove(key) {
    try {
      localStorage.removeItem(`ascend_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },

  // Clear all app data
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('ascend_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

// Specific persistence helpers for common data
export const AppPersistence = {
  // User preferences
  saveUserPreferences(preferences) {
    Persistence.set('user_preferences', preferences, 24 * 60); // 24 hours
  },

  getUserPreferences() {
    return Persistence.get('user_preferences') || {
      selectedDifficulty: 'medium',
      theme: 'light',
      language: 'javascript'
    };
  },

  // Match state (for recovery after refresh)
  saveMatchState(matchId, state) {
    Persistence.set(`match_${matchId}`, state, 60); // 1 hour
  },

  getMatchState(matchId) {
    return Persistence.get(`match_${matchId}`);
  },

  clearMatchState(matchId) {
    Persistence.remove(`match_${matchId}`);
  },

  // Queue state
  saveQueueState(state) {
    Persistence.set('queue_state', state, 10); // 10 minutes
  },

  getQueueState() {
    return Persistence.get('queue_state');
  },

  clearQueueState() {
    Persistence.remove('queue_state');
  }
};
