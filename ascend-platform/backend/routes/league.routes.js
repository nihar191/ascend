// backend/routes/league.routes.js
import express from 'express';
import * as leagueController from '../controllers/league.controller.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { body, param, validationResult } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes (with optional auth for personalized data)
router.get('/', leagueController.getAllLeagues);
router.get('/top-performers', leagueController.getTopPerformers);
router.get('/:id', leagueController.getLeague);
router.get('/seasons/:seasonId/leaderboard', optionalAuth, leagueController.getSeasonLeaderboard);

// Protected routes (require authentication)
router.post('/seasons/:seasonId/join', authenticate, leagueController.joinSeason);
router.get('/seasons/:seasonId/my-stats', authenticate, leagueController.getUserSeasonStats);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('League name is required'),
    body('minRating').isInt({ min: 0 }).withMessage('Min rating must be a positive integer'),
    body('maxRating').optional().isInt({ min: 0 }).withMessage('Max rating must be a positive integer'),
    validate,
  ],
  leagueController.createLeague
);

router.post(
  '/seasons',
  authenticate,
  requireAdmin,
  [
    body('leagueId').isInt().withMessage('League ID must be an integer'),
    body('seasonNumber').isInt({ min: 1 }).withMessage('Season number must be a positive integer'),
    body('startDate').isISO8601().withMessage('Start date must be valid ISO8601 date'),
    body('endDate').isISO8601().withMessage('End date must be valid ISO8601 date'),
    validate,
  ],
  leagueController.createSeason
);

router.post(
  '/seasons/:seasonId/end',
  authenticate,
  requireAdmin,
  leagueController.endSeason
);

export default router;
