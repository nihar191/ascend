// backend/services/rating.service.js

/**
 * Service for calculating ELO-based ratings and match points
 * Based on competitive programming rating systems like Codeforces
 */
class RatingService {
    /**
     * Calculate expected score for a player
     * @param {number} ratingA - Player A's rating
     * @param {number} ratingB - Player B's rating
     * @returns {number} Expected score (0-1)
     */
    calculateExpectedScore(ratingA, ratingB) {
      return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }
  
    /**
     * Calculate new rating after a match
     * @param {number} currentRating - Current player rating
     * @param {number} expectedScore - Expected score (0-1)
     * @param {number} actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
     * @param {number} kFactor - K-factor (rating volatility, default 32)
     * @returns {number} New rating
     */
    calculateNewRating(currentRating, expectedScore, actualScore, kFactor = 32) {
      const change = kFactor * (actualScore - expectedScore);
      return Math.round(currentRating + change);
    }
  
    /**
     * Calculate rating changes for a 1v1 match
     * @param {number} winnerRating - Winner's current rating
     * @param {number} loserRating - Loser's current rating
     * @returns {Object} Rating changes for both players
     */
    calculate1v1RatingChange(winnerRating, loserRating) {
      const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
      const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);
  
      // K-factor varies based on rating
      const winnerK = this._getKFactor(winnerRating);
      const loserK = this._getKFactor(loserRating);
  
      const winnerNewRating = this.calculateNewRating(winnerRating, winnerExpected, 1, winnerK);
      const loserNewRating = this.calculateNewRating(loserRating, loserExpected, 0, loserK);
  
      return {
        winnerChange: winnerNewRating - winnerRating,
        loserChange: loserNewRating - loserRating,
        winnerNewRating,
        loserNewRating,
      };
    }
  
    /**
     * Calculate points for a match based on difficulty and performance
     * @param {string} difficulty - Problem difficulty (easy, medium, hard)
     * @param {number} solveTime - Time taken to solve in seconds
     * @param {number} timeLimit - Match time limit in seconds
     * @param {boolean} solved - Whether problem was solved
     * @returns {number} Points earned
     */
    calculateMatchPoints(difficulty, solveTime, timeLimit, solved) {
      if (!solved) return 0;
  
      // Base points by difficulty
      const basePoints = {
        easy: 100,
        medium: 200,
        hard: 300,
      }[difficulty] || 200;
  
      // Time bonus (faster solve = more points, up to 50% bonus)
      const timeRatio = solveTime / timeLimit;
      const timeBonus = Math.max(0, (1 - timeRatio) * 0.5);
  
      const totalPoints = Math.round(basePoints * (1 + timeBonus));
      return totalPoints;
    }
  
    /**
     * Calculate K-factor based on rating (higher rating = lower volatility)
     */
    _getKFactor(rating) {
      if (rating < 1200) return 40;  // Beginners have higher volatility
      if (rating < 1600) return 32;
      if (rating < 2000) return 24;
      return 16;  // Masters have lower volatility
    }
  
    /**
     * Calculate rating change for multiple participants (free-for-all)
     * @param {Array} participants - Array of {userId, rating, rank}
     * @returns {Array} Rating changes for each participant
     */
    calculateFFARatingChanges(participants) {
      const results = [];
  
      for (const player of participants) {
        let expectedScore = 0;
        
        // Calculate expected score against all other players
        for (const opponent of participants) {
          if (player.userId !== opponent.userId) {
            expectedScore += this.calculateExpectedScore(player.rating, opponent.rating);
          }
        }
  
        expectedScore /= (participants.length - 1);
  
        // Actual score based on rank (1st place = 1.0, last place = 0.0)
        const actualScore = 1 - ((player.rank - 1) / (participants.length - 1));
  
        const kFactor = this._getKFactor(player.rating);
        const newRating = this.calculateNewRating(player.rating, expectedScore, actualScore, kFactor);
  
        results.push({
          userId: player.userId,
          ratingChange: newRating - player.rating,
          newRating,
          expectedScore,
          actualScore,
        });
      }
  
      return results;
    }
  }
  
  export default new RatingService();
  