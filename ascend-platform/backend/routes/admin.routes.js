// backend/routes/admin.routes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { logAdminActivity } from '../middleware/admin-logger.middleware.js';
import {
  adminUpdateUserValidation,
  bulkGenerateValidation,
  bulkOperationValidation,
} from '../middleware/validation.middleware.js';

const router = express.Router();

// Rate limiter for admin operations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many admin requests' },
});

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
router.use(logAdminActivity); // Add logging
router.use(adminLimiter);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/logs', adminController.getSystemLogs);

// User management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id', adminUpdateUserValidation, adminController.updateUser);
router.post('/users/:id/ban', adminController.toggleUserBan);

// Problem management
router.post('/problems/bulk-generate', bulkGenerateValidation, adminController.bulkGenerateProblems);
router.patch('/problems/bulk-update', bulkOperationValidation, adminController.bulkUpdateProblems);
router.delete('/problems/bulk-delete', bulkOperationValidation, adminController.bulkDeleteProblems);

// Match management
router.get('/matches', adminController.getAllMatches);
router.post('/matches/:id/force-end', adminController.forceEndMatch);

// Platform settings
router.patch('/settings', adminController.updatePlatformSettings);

export default router;
