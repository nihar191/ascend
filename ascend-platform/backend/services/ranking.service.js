// backend/services/ranking.service.js
import pool from '../config/database.js';
import UserLeagueSeason from '../models/UserLeagueSeason.js';
import User from '../models/User.js';

/**
 * Service for updating rankings and leaderboards efficiently
 */
class RankingService {
  /**
   * Update match rankings using atomic transaction
   */
  async updateMatchRankings(matchId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate ranks based on score (descending) and submission time (ascending)
      const query = `
        UPDATE match_participants
        SET rank = subquery.rank
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              ORDER BY 
                score DESC NULLS LAST,
                last_submission_at ASC NULLS LAST,
                joined_at ASC
            ) as rank
          FROM match_participants
          WHERE match_id = $1
        ) as subquery
        WHERE match_participants.id = subquery.id
        RETURNING match_participants.*
      `;

      const result = await client.query(query, [matchId]);

      await client.query('COMMIT');

      return result.rows;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update season rankings with optimized query
   */
  async updateSeasonRankings(seasonId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Use window function for efficient ranking
      const query = `
        WITH ranked_users AS (
          SELECT 
            id,
            user_id,
            season_id,
            points,
            matches_played,
            ROW_NUMBER() OVER (
              ORDER BY 
                points DESC,
                matches_played ASC,
                last_match_at DESC NULLS LAST
            ) as new_rank
          FROM user_league_seasons
          WHERE season_id = $1
        )
        UPDATE user_league_seasons uls
        SET rank = ru.new_rank
        FROM ranked_users ru
        WHERE uls.id = ru.id
        RETURNING uls.*
      `;

      const result = await client.query(query, [seasonId]);

      await client.query('COMMIT');

      return result.rows;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user statistics after match completion
   */
  async updateUserStatsAfterMatch(matchId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get match participants with their final scores and ranks
      const participantsQuery = `
        SELECT 
          mp.user_id,
          mp.score,
          mp.rank,
          mp.status,
          m.problem_id,
          p.points as problem_points
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.id
        JOIN problems p ON m.problem_id = p.id
        WHERE mp.match_id = $1
      `;

      const participants = await client.query(participantsQuery, [matchId]);

      // Update each user's statistics
      for (const participant of participants.rows) {
        const { user_id, score, rank, status, problem_points } = participant;
        
        // Determine if this counts as a win (top 3 or solved the problem)
        const isWin = rank <= 3 || status === 'solved';
        
        // Update user stats
        const updateQuery = `
          UPDATE users 
          SET 
            total_matches = total_matches + 1,
            wins = wins + $1,
            losses = losses + $2,
            rating = rating + $3,
            total_score = total_score + $4,
            updated_at = NOW()
          WHERE id = $5
        `;

        const winIncrement = isWin ? 1 : 0;
        const lossIncrement = isWin ? 0 : 1;
        const ratingChange = isWin ? Math.floor(problem_points * 0.1) : -Math.floor(problem_points * 0.05);
        const scoreToAdd = score || 0;

        await client.query(updateQuery, [
          winIncrement,
          lossIncrement,
          ratingChange,
          scoreToAdd,
          user_id
        ]);

        console.log(`📊 Updated stats for user ${user_id}: ${isWin ? 'WIN' : 'LOSS'}, rating change: ${ratingChange}, score: ${scoreToAdd}`);
      }

      await client.query('COMMIT');
      console.log(`✅ Updated user stats for match ${matchId}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating user stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get optimized leaderboard with pagination and caching
   */
  async getOptimizedLeaderboard(seasonId, { page = 1, limit = 50, userId = null }) {
    const offset = (page - 1) * limit;

    // Main leaderboard query with user data
    const leaderboardQuery = `
      WITH ranked_leaderboard AS (
        SELECT 
          uls.*,
          u.username,
          u.display_name,
          u.avatar_url,
          u.rating,
          ROW_NUMBER() OVER (
            ORDER BY uls.points DESC, uls.matches_played ASC
          ) as calculated_rank
        FROM user_league_seasons uls
        JOIN users u ON u.id = uls.user_id
        WHERE uls.season_id = $1
      )
      SELECT * FROM ranked_leaderboard
      LIMIT $2 OFFSET $3
    `;

    const leaderboard = await pool.query(leaderboardQuery, [seasonId, limit, offset]);

    let userRank = null;

    // If userId provided, get their specific rank efficiently
    if (userId) {
      const userRankQuery = `
        WITH ranked_users AS (
          SELECT 
            user_id,
            ROW_NUMBER() OVER (
              ORDER BY points DESC, matches_played ASC
            ) as rank
          FROM user_league_seasons
          WHERE season_id = $1
        )
        SELECT rank FROM ranked_users WHERE user_id = $2
      `;

      const rankResult = await pool.query(userRankQuery, [seasonId, userId]);
      userRank = rankResult.rows[0]?.rank || null;
    }

    // Count total participants
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_league_seasons WHERE season_id = $1',
      [seasonId]
    );

    return {
      leaderboard: leaderboard.rows,
      userRank,
      totalParticipants: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    };
  }

  /**
   * Get percentile rank for a user
   */
  async getUserPercentile(userId, seasonId) {
    const query = `
      WITH user_position AS (
        SELECT 
          COUNT(*) FILTER (WHERE points > (
            SELECT points FROM user_league_seasons 
            WHERE user_id = $1 AND season_id = $2
          )) as better_count,
          COUNT(*) as total_count
        FROM user_league_seasons
        WHERE season_id = $2
      )
      SELECT 
        ROUND((1.0 - (better_count::float / NULLIF(total_count, 0))) * 100, 2) as percentile
      FROM user_position
    `;

    const result = await pool.query(query, [userId, seasonId]);
    return result.rows[0]?.percentile || 0;
  }

  /**
   * Batch update user ratings after match
   */
  async batchUpdateRatings(ratingChanges) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const change of ratingChanges) {
        await client.query(
          `UPDATE users 
           SET rating = $2 
           WHERE id = $1`,
          [change.userId, change.newRating]
        );
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get rank changes for a user (comparing to previous period)
   */
  async getRankChange(userId, currentSeasonId, previousSeasonId) {
    const query = `
      SELECT 
        current.rank as current_rank,
        previous.rank as previous_rank,
        (previous.rank - current.rank) as rank_change
      FROM user_league_seasons current
      LEFT JOIN user_league_seasons previous 
        ON previous.user_id = current.user_id 
        AND previous.season_id = $3
      WHERE current.user_id = $1 
        AND current.season_id = $2
    `;

    const result = await pool.query(query, [userId, currentSeasonId, previousSeasonId]);
    return result.rows[0] || null;
  }
}

export default new RankingService();
