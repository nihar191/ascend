// backend/config/auth.js
import dotenv from 'dotenv';

dotenv.config();

export default {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireNumber: true,
  },
  
  // Rate limiting for auth endpoints
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 attempts
};
