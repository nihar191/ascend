// backend/routes/match.routes.js
import express from 'express';
import * as matchController from '../controllers/match.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.get('/queue/stats', matchController.getQueueStats);
router.get('/waiting', matchController.getWaitingMatches);

// Protected routes (require authentication)
router.post(
  '/queue/join',
  authenticate,
  [
    body('matchType')
      .optional()
      .isIn(['1v1', '2v2', 'ffa'])
      .withMessage('Match type must be 1v1, 2v2, or ffa'),
    body('preferences.difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
    validate,
  ],
  matchController.joinMatchmaking
);

router.post('/queue/leave', authenticate, matchController.leaveMatchmaking);
router.get('/queue/status', authenticate, matchController.getQueueStatus);

router.get('/active', authenticate, matchController.getActiveMatches);
router.get('/history', authenticate, matchController.getMatchHistory);
router.get('/:id', authenticate, matchController.getMatch);

router.post('/:id/join', authenticate, matchController.joinMatch);
router.post('/:id/leave', authenticate, matchController.leaveMatch);

export default router;
