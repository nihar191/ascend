// backend/middleware/admin-logger.middleware.js
import pool from '../config/database.js';

/**
 * Log admin activities for audit trail
 */
export const logAdminActivity = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  res.send = function (data) {
    // Log after successful response
    if (req.user && req.user.role === 'admin' && res.statusCode < 400) {
      pool.query(
        `INSERT INTO admin_activity_logs (admin_id, action, resource, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          req.method,
          req.path,
          JSON.stringify({ body: req.body, params: req.params }),
          req.ip,
        ]
      ).catch(err => console.error('Failed to log admin activity:', err));
    }

    // Call original send
    originalSend.call(this, data);
  };

  next();
};
