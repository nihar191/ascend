// backend/services/scoring.service.js
import ratingService from './rating.service.js';

/**
 * Advanced scoring service for competitive programming matches
 * Implements multiple scoring strategies
 */
class ScoringService {
  /**
   * Calculate comprehensive match score
   * @param {Object} params - Scoring parameters
   * @returns {Object} Score breakdown
   */
  calculateMatchScore(params) {
    const {
      difficulty,
      solveTime,
      timeLimit,
      solved,
      submissionCount = 1,
      testsPassed = 0,
      totalTests = 0,
      executionTime = 0,
      memoryUsed = 0,
    } = params;

    if (!solved) {
      // Partial credit for passing some tests
      const partialScore = this.calculatePartialCredit(testsPassed, totalTests, difficulty);
      return {
        totalScore: partialScore,
        breakdown: {
          basePoints: 0,
          timeBonus: 0,
          efficiencyBonus: 0,
          partialCredit: partialScore,
          submissionPenalty: 0,
        },
        solved: false,
      };
    }

    // Base points by difficulty
    const basePoints = this.getBasePoints(difficulty);

    // Time bonus (faster = better)
    const timeBonus = this.calculateTimeBonus(solveTime, timeLimit, basePoints);

    // Efficiency bonus (fewer submissions = better)
    const efficiencyBonus = this.calculateEfficiencyBonus(submissionCount, basePoints);

    // Execution optimization bonus
    const optimizationBonus = this.calculateOptimizationBonus(
      executionTime,
      memoryUsed,
      basePoints
    );

    // Total score
    const totalScore = Math.round(
      basePoints + timeBonus + efficiencyBonus + optimizationBonus
    );

    return {
      totalScore: Math.max(0, totalScore),
      breakdown: {
        basePoints,
        timeBonus,
        efficiencyBonus,
        optimizationBonus,
        submissionPenalty: 0,
      },
      solved: true,
    };
  }

  /**
   * Get base points by difficulty
   */
  getBasePoints(difficulty) {
    const pointsMap = {
      easy: 100,
      medium: 200,
      hard: 300,
    };
    return pointsMap[difficulty] || 200;
  }

  /**
   * Calculate time bonus (up to 50% of base points)
   */
  calculateTimeBonus(solveTime, timeLimit, basePoints) {
    const timeRatio = solveTime / timeLimit;
    
    if (timeRatio >= 1) return 0; // Used all time
    
    // Exponential bonus curve: faster = disproportionately more points
    const bonusRatio = Math.pow(1 - timeRatio, 1.5);
    const maxBonus = basePoints * 0.5;
    
    return Math.round(bonusRatio * maxBonus);
  }

  /**
   * Calculate efficiency bonus based on submission count
   */
  calculateEfficiencyBonus(submissionCount, basePoints) {
    if (submissionCount === 1) {
      // First submission accepted = 20% bonus
      return Math.round(basePoints * 0.2);
    } else if (submissionCount === 2) {
      // Second submission = 10% bonus
      return Math.round(basePoints * 0.1);
    } else if (submissionCount === 3) {
      // Third submission = 5% bonus
      return Math.round(basePoints * 0.05);
    }
    
    // More than 3 submissions = no bonus (but no penalty)
    return 0;
  }

  /**
   * Calculate optimization bonus for fast/memory-efficient code
   */
  calculateOptimizationBonus(executionTimeMs, memoryUsedKb, basePoints) {
    // Bonus for very fast execution (< 100ms)
    let bonus = 0;
    
    if (executionTimeMs < 50) {
      bonus += Math.round(basePoints * 0.1);
    } else if (executionTimeMs < 100) {
      bonus += Math.round(basePoints * 0.05);
    }
    
    // Bonus for memory efficiency (< 5MB)
    if (memoryUsedKb < 5120) {
      bonus += Math.round(basePoints * 0.05);
    }
    
    return bonus;
  }

  /**
   * Calculate partial credit for failed submissions
   */
  calculatePartialCredit(testsPassed, totalTests, difficulty) {
    if (testsPassed === 0 || totalTests === 0) return 0;
    
    const basePoints = this.getBasePoints(difficulty);
    const passRatio = testsPassed / totalTests;
    
    // 30% max partial credit
    return Math.round(basePoints * passRatio * 0.3);
  }

  /**
   * Calculate streak bonus for consecutive solves
   */
  calculateStreakBonus(streakCount, basePoints) {
    if (streakCount < 2) return 0;
    
    // 5% bonus per consecutive solve (max 50%)
    const bonusPercent = Math.min(streakCount * 0.05, 0.5);
    return Math.round(basePoints * bonusPercent);
  }

  /**
   * Calculate penalty for hints used
   */
  calculateHintPenalty(hintsUsed, basePoints) {
    // 10% penalty per hint used (max 30%)
    const penaltyPercent = Math.min(hintsUsed * 0.1, 0.3);
    return Math.round(basePoints * penaltyPercent);
  }

  /**
   * Calculate tournament scoring (different from regular matches)
   */
  calculateTournamentScore(placement, totalParticipants, basePoints = 1000) {
    // Exponential decay: 1st gets full, last gets 10%
    const placementRatio = placement / totalParticipants;
    const score = basePoints * Math.pow(1 - placementRatio, 2);
    
    return Math.round(score);
  }

  /**
   * Calculate relative difficulty score (based on solve rate)
   */
  calculateRelativeDifficulty(problemId, totalAttempts, successfulSolves) {
    if (totalAttempts === 0) return 1.0;
    
    const solveRate = successfulSolves / totalAttempts;
    
    // Inverse relationship: harder problems = higher multiplier
    if (solveRate < 0.1) return 2.0;      // Very hard
    if (solveRate < 0.3) return 1.5;      // Hard
    if (solveRate < 0.5) return 1.2;      // Medium-hard
    if (solveRate < 0.7) return 1.0;      // Medium
    return 0.8;                            // Easy
  }
}

export default new ScoringService();
