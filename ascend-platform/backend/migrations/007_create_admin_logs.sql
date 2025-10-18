-- backend/migrations/007_create_admin_logs.sql
-- Admin activity logging for audit trail

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id SERIAL PRIMARY KEY,
  admin_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(10) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_activity_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON admin_activity_logs(resource, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_activity_logs(created_at DESC);
