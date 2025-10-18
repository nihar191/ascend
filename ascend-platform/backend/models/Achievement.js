// backend/models/Achievement.js
import pool from '../config/database.js';

/**
 * Achievement/Badge system for gamification
 */
class Achievement {
  /**
   * Check and award achievements for a user
   */
  static async checkAndAward(userId, context) {
    const achievements = await this.checkAchievements(userId, context);
    const newAchievements = [];

    for (const achievement of achievements) {
      const awarded = await this.awardAchievement(userId, achievement);
      if (awarded) {
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  /**
   * Check which achievements user has earned
   */
  static async checkAchievements(userId, context) {
    const achievements = [];

    // Get user stats
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const userStats = user.rows[0];

    // Achievement: First Blood (first accepted submission)
    if (context.firstSolve) {
      achievements.push({
        id: 'first_blood',
        name: 'First Blood',
        description: 'Solved your first problem',
        icon: '🎯',
        points: 10,
      });
    }

    // Achievement: Speed Demon (solve in < 2 minutes)
    if (context.solveTime && context.solveTime < 120) {
      achievements.push({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Solved a problem in under 2 minutes',
        icon: '⚡',
        points: 25,
      });
    }

    // Achievement: Perfect Submission (accepted on first try)
    if (context.submissionCount === 1 && context.solved) {
      achievements.push({
        id: 'perfect_submission',
        name: 'Perfect Submission',
        description: 'Accepted on first submission',
        icon: '💎',
        points: 30,
      });
    }

    // Achievement: Marathon Runner (10 consecutive days)
    const streakQuery = await pool.query(
      `SELECT COUNT(DISTINCT DATE(last_match_at)) as days
       FROM user_league_seasons
       WHERE user_id = $1 
         AND last_match_at >= CURRENT_DATE - INTERVAL '10 days'`,
      [userId]
    );

    if (streakQuery.rows[0].days >= 10) {
      achievements.push({
        id: 'marathon_runner',
        name: 'Marathon Runner',
        description: 'Competed for 10 consecutive days',
        icon: '🏃',
        points: 100,
      });
    }

    // Achievement: Century (100 problems solved)
    if (userStats.total_matches >= 100) {
      achievements.push({
        id: 'century',
        name: 'Century',
        description: 'Completed 100 matches',
        icon: '💯',
        points: 200,
      });
    }

    // Achievement: Unstoppable (10 wins in a row)
    const winStreak = await this.getWinStreak(userId);
    if (winStreak >= 10) {
      achievements.push({
        id: 'unstoppable',
        name: 'Unstoppable',
        description: '10 consecutive wins',
        icon: '🔥',
        points: 150,
      });
    }

    return achievements;
  }

  /**
   * Award achievement to user
   */
  static async awardAchievement(userId, achievement) {
    try {
      // Check if already awarded
      const existing = await pool.query(
        `SELECT * FROM user_achievements 
         WHERE user_id = $1 AND achievement_id = $2`,
        [userId, achievement.id]
      );

      if (existing.rows.length > 0) {
        return false; // Already awarded
      }

      // Award achievement
      await pool.query(
        `INSERT INTO user_achievements (user_id, achievement_id, earned_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [userId, achievement.id]
      );

      return true;

    } catch (error) {
      console.error('Award achievement error:', error);
      return false;
    }
  }

  /**
   * Get user's current win streak
   */
  static async getWinStreak(userId) {
    const query = `
      WITH match_results AS (
        SELECT 
          m.id,
          m.end_time,
          mp.rank,
          CASE WHEN mp.rank = 1 THEN 1 ELSE 0 END as is_win
        FROM match_participants mp
        JOIN matches m ON m.id = mp.match_id
        WHERE mp.user_id = $1 AND m.status = 'completed'
        ORDER BY m.end_time DESC
      ),
      streak AS (
        SELECT 
          SUM(is_win) OVER (
            ORDER BY end_time DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as consecutive_wins,
          is_win,
          ROW_NUMBER() OVER (ORDER BY end_time DESC) as rn
        FROM match_results
      )
      SELECT MAX(consecutive_wins) as streak
      FROM streak
      WHERE is_win = 1 AND rn = (SELECT MIN(rn) FROM streak WHERE is_win = 0)
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0]?.streak || 0);
  }

  /**
   * Get all achievements for a user
   */
  static async getUserAchievements(userId) {
    const query = `
      SELECT * FROM user_achievements
      WHERE user_id = $1
      ORDER BY earned_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

export default Achievement;
