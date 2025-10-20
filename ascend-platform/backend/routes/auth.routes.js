// backend/routes/auth.routes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation
} from '../middleware/validation.middleware.js';

const router = express.Router();

// Rate limiter for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);

// Protected routes (require authentication)
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, updateProfileValidation, authController.updateProfile);
router.get('/verify', authenticate, authController.verifyToken);

// Temporary admin creation endpoint (remove after use)
router.post('/make-admin', authController.makeAdmin);

export default router;
