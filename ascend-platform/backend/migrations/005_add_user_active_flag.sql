-- backend/migrations/005_add_user_active_flag.sql
-- Add is_active flag for soft delete functionality

-- Add is_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing users to be active
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Update the role constraint to include 'banned' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'banned'));

