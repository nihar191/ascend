-- backend/seeds/seed.sql (updated admin insert)
-- Generate hash first: node backend/scripts/generateHash.js Admin@123

-- Insert default leagues
INSERT INTO leagues (name, description, min_rating, max_rating, icon) VALUES
('Bronze', 'Starting league for beginners', 0, 1199, '🥉'),
('Silver', 'Intermediate competitive programmers', 1200, 1599, '🥈'),
('Gold', 'Advanced problem solvers', 1600, 1999, '🥇'),
('Platinum', 'Elite coders', 2000, 2499, '💎'),
('Master', 'Top tier competitors', 2500, 9999, '👑')
ON CONFLICT DO NOTHING;

-- Insert initial admin user
-- Password: Admin@123 (change in production!)
INSERT INTO users (username, email, password_hash, display_name, role, rating) VALUES
('admin', 'admin@ascend.dev', '$2a$10$e2gHgEDEpfrlBPJxOzUAt.1BpApaZEfTM4BEv/bQ3L3xxJsxr8qUi', 'Platform Admin', 'admin', 2000)
ON CONFLICT (username) DO NOTHING;

-- Insert test user
INSERT INTO users (username, email, password_hash, display_name, rating) VALUES
('Badmosh123', 'test@ascend.dev', '$2a$10$c85LHA/FtSGX8EIBLT7Kd.YeYrMXafZzMfJe.KXcOL7xnZfMAf9IO', 'Test User', 1500)
ON CONFLICT (username) DO NOTHING;

-- Insert sample problem
INSERT INTO problems (
  title, slug, description, difficulty, points, 
  sample_input, sample_output, test_cases, is_active
) VALUES (
  'Two Sum',
  'two-sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.

You may assume that each input has exactly one solution, and you may not use the same element twice.

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9',
  'easy',
  100,
  '[2,7,11,15], target = 9',
  '[0,1]',
  '[
    {"input": {"nums": [2,7,11,15], "target": 9}, "output": [0,1]},
    {"input": {"nums": [3,2,4], "target": 6}, "output": [1,2]},
    {"input": {"nums": [3,3], "target": 6}, "output": [0,1]}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create active seasons for all leagues
INSERT INTO seasons (league_id, season_number, start_date, end_date, is_active)
SELECT id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', true
FROM leagues
ON CONFLICT (league_id, season_number) DO NOTHING;

