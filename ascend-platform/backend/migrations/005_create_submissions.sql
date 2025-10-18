-- backend/migrations/005_create_submissions.sql
-- Code submissions for matches

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  problem_id INT REFERENCES problems(id) ON DELETE SET NULL,
  
  code TEXT NOT NULL,
  language VARCHAR(20) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 
                      'time_limit', 'runtime_error', 'compilation_error')),
  
  execution_time_ms INT,
  memory_used_kb INT,
  
  test_results JSONB,
  score INT DEFAULT 0,
  
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for submission history
CREATE INDEX IF NOT EXISTS idx_submissions_match ON submissions(match_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
