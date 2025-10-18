// backend/routes/scoring.routes.js
import express from 'express';
import * as scoringController from '../controllers/scoring.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protected routes
router.get('/users/:userId/statistics', authenticate, scoringController.getUserStatistics);
router.get('/seasons/:seasonId/percentile', authenticate, scoringController.getUserPercentile);
router.get('/submissions/:submissionId/breakdown', authenticate, scoringController.getScoringBreakdown);

export default router;
