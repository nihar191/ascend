-- backend/migrations/004_create_matches.sql
-- Matches and match participants

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  season_id INT REFERENCES seasons(id) ON DELETE SET NULL,
  match_type VARCHAR(20) DEFAULT '1v1' CHECK (match_type IN ('1v1', '2v2', 'ffa')),
  problem_id INT REFERENCES problems(id) ON DELETE SET NULL,
  
  status VARCHAR(20) DEFAULT 'waiting' 
    CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_minutes INT DEFAULT 15,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_participants (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  
  team_number INT DEFAULT 1,
  score INT DEFAULT 0,
  rank INT,
  
  submission_count INT DEFAULT 0,
  last_submission_at TIMESTAMP,
  best_submission_time_ms INT,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  
  UNIQUE(match_id, user_id)
);

-- Indexes for match queries
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id, joined_at DESC);

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
