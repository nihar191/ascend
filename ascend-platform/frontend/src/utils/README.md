# Persistence Utilities

This directory contains utilities for persisting application state across page refreshes and browser sessions.

## AppPersistence

A simple localStorage-based persistence system that automatically handles:

- **User Preferences**: Difficulty selection, theme, language preferences
- **Queue State**: Matchmaking queue state recovery after refresh
- **Match State**: Code, language, and match progress for active matches
- **Automatic Cleanup**: Expired data is automatically removed

### Usage

```javascript
import { AppPersistence } from '../utils/persistence';

// Save user preferences
AppPersistence.saveUserPreferences({
  selectedDifficulty: 'medium',
  language: 'javascript',
  theme: 'light'
});

// Get user preferences (with defaults)
const prefs = AppPersistence.getUserPreferences();

// Save match state
AppPersistence.saveMatchState(matchId, {
  code: 'console.log("hello");',
  language: 'javascript',
  matchStatus: 'in_progress',
  timeLeft: 300
});

// Get match state
const matchState = AppPersistence.getMatchState(matchId);

// Clear match state when done
AppPersistence.clearMatchState(matchId);
```

### Features

- **Automatic Expiration**: Data expires after a configurable time
- **Error Handling**: Gracefully handles localStorage errors
- **Type Safety**: Consistent data structure across the app
- **Memory Management**: Automatically cleans up expired data

### Data Expiration

- User Preferences: 24 hours
- Queue State: 10 minutes
- Match State: 1 hour

This ensures that stale data doesn't persist indefinitely while keeping important user preferences and active session data available.
