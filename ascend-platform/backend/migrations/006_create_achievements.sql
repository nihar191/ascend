-- backend/migrations/006_create_achievements.sql
-- Achievement system tables

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- Add achievement points to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievement_points INT DEFAULT 0;

-- Statistics tracking table for better performance
CREATE TABLE IF NOT EXISTS user_statistics (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_submissions INT DEFAULT 0,
  accepted_submissions INT DEFAULT 0,
  win_streak_current INT DEFAULT 0,
  win_streak_best INT DEFAULT 0,
  last_activity_at TIMESTAMP,
  problems_solved_easy INT DEFAULT 0,
  problems_solved_medium INT DEFAULT 0,
  problems_solved_hard INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_last_activity ON user_statistics(last_activity_at DESC);
