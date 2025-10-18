// backend/routes/problem.routes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as problemController from '../controllers/problem.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import {
  createProblemValidation,
  updateProblemValidation,
  generateProblemValidation,
} from '../middleware/validation.middleware.js';

const router = express.Router();

// Rate limiter for AI generation (expensive operation)
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI generations per hour
  message: { error: 'Too many AI generation requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin', // Admins bypass limit
});

// Public routes
router.get('/', problemController.getAllProblems);
router.get('/random', problemController.getRandomProblem);
router.get('/:identifier', problemController.getProblem);

// Admin-only routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  createProblemValidation,
  problemController.createProblem
);

router.post(
  '/generate',
  authenticate,
  requireAdmin,
  aiGenerationLimiter,
  generateProblemValidation,
  problemController.generateAIProblem
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  updateProblemValidation,
  problemController.updateProblem
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  problemController.deleteProblem
);

export default router;
