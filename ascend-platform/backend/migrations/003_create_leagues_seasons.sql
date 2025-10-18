-- backend/migrations/003_create_leagues_seasons.sql
-- Leagues and Seasons for gamification

CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  min_rating INT,
  max_rating INT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  league_id INT REFERENCES leagues(id) ON DELETE CASCADE,
  season_number INT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_id, season_number)
);

CREATE TABLE IF NOT EXISTS user_league_seasons (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  season_id INT REFERENCES seasons(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  rank INT,
  matches_played INT DEFAULT 0,
  last_match_at TIMESTAMP,
  UNIQUE(user_id, season_id)
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_league_seasons_leaderboard 
  ON user_league_seasons(season_id, points DESC, matches_played);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active) WHERE is_active = true;
