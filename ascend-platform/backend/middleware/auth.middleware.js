// backend/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import authConfig from '../config/auth.js';

/**
 * Middleware to authenticate JWT tokens and attach user to request
 * Protects routes requiring authentication
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer token format)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode JWT token
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    // Fetch user from database to ensure still exists and active
    const result = await pool.query(
      'SELECT id, username, email, display_name, role, rating FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    // Attach user object to request for use in route handlers
    req.user = result.rows[0];
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Middleware to check if authenticated user has admin role
 * Must be used after authenticate middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }

  next();
};

/**
 * Optional authentication - attaches user if token present but doesn't fail
 * Useful for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, authConfig.jwtSecret);

    const result = await pool.query(
      'SELECT id, username, email, display_name, role, rating FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
