-- backend/migrations/002_create_problems.sql
-- Problems table for coding challenges

CREATE TABLE IF NOT EXISTS problems (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INT NOT NULL,
  time_limit_ms INT DEFAULT 2000,
  memory_limit_mb INT DEFAULT 256,
  tags TEXT[],
  
  sample_input TEXT,
  sample_output TEXT,
  test_cases JSONB,
  
  author_id INT REFERENCES users(id),
  is_ai_generated BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_tags ON problems USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_problems_active ON problems(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
