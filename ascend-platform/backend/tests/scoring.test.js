// backend/tests/scoring.test.js
import scoringService from '../services/scoring.service.js';
import { describe, it, expect } from '@jest/globals';

describe('Scoring Service', () => {
  describe('calculateMatchScore', () => {
    it('should calculate full score for perfect submission', () => {
      const result = scoringService.calculateMatchScore({
        difficulty: 'medium',
        solveTime: 60,
        timeLimit: 900,
        solved: true,
        submissionCount: 1,
        testsPassed: 5,
        totalTests: 5,
        executionTime: 45,
        memoryUsed: 4096,
      });

      expect(result.solved).toBe(true);
      expect(result.totalScore).toBeGreaterThan(200); // Base + bonuses
      expect(result.breakdown.basePoints).toBe(200);
      expect(result.breakdown.timeBonus).toBeGreaterThan(0);
      expect(result.breakdown.efficiencyBonus).toBeGreaterThan(0);
    });

    it('should apply partial credit for failed submission', () => {
      const result = scoringService.calculateMatchScore({
        difficulty: 'easy',
        solveTime: 300,
        timeLimit: 900,
        solved: false,
        submissionCount: 3,
        testsPassed: 3,
        totalTests: 5,
      });

      expect(result.solved).toBe(false);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.breakdown.partialCredit).toBeGreaterThan(0);
    });

    it('should reduce bonus for multiple submissions', () => {
      const result1 = scoringService.calculateMatchScore({
        difficulty: 'medium',
        solveTime: 120,
        timeLimit: 900,
        solved: true,
        submissionCount: 1,
      });

      const result2 = scoringService.calculateMatchScore({
        difficulty: 'medium',
        solveTime: 120,
        timeLimit: 900,
        solved: true,
        submissionCount: 5,
      });

      expect(result1.breakdown.efficiencyBonus).toBeGreaterThan(
        result2.breakdown.efficiencyBonus
      );
    });
  });
});
