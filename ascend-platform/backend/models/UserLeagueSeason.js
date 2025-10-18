// backend/models/UserLeagueSeason.js
import pool from '../config/database.js';

/**
 * UserLeagueSeason model for tracking user participation in seasons
 */
class UserLeagueSeason {
  /**
   * Join a user to a season
   */
  static async join(userId, seasonId) {
    const query = `
      INSERT INTO user_league_seasons (user_id, season_id, points, matches_played)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT (user_id, season_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId, seasonId]);
    return result.rows[0];
  }

  /**
   * Update user points after a match
   */
  static async updatePoints(userId, seasonId, pointsToAdd) {
    const query = `
      UPDATE user_league_seasons
      SET 
        points = points + $3,
        matches_played = matches_played + 1,
        last_match_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND season_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [userId, seasonId, pointsToAdd]);
    return result.rows[0];
  }

  /**
   * Get user's season data
   */
  static async getUserSeasonData(userId, seasonId) {
    const query = `
      SELECT uls.*, s.season_number, l.name as league_name, l.icon as league_icon
      FROM user_league_seasons uls
      JOIN seasons s ON s.id = uls.season_id
      JOIN leagues l ON l.id = s.league_id
      WHERE uls.user_id = $1 AND uls.season_id = $2
    `;
    const result = await pool.query(query, [userId, seasonId]);
    return result.rows[0];
  }

  /**
   * Get leaderboard for a season with efficient ranking
   */
  static async getLeaderboard(seasonId, { limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY uls.points DESC, uls.matches_played ASC) as rank,
        uls.*,
        u.username,
        u.display_name,
        u.avatar_url,
        u.rating
      FROM user_league_seasons uls
      JOIN users u ON u.id = uls.user_id
      WHERE uls.season_id = $1
      ORDER BY uls.points DESC, uls.matches_played ASC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [seasonId, limit, offset]);
    return result.rows;
  }

  /**
   * Get user's rank in a season
   */
  static async getUserRank(userId, seasonId) {
    const query = `
      WITH ranked_users AS (
        SELECT 
          user_id,
          ROW_NUMBER() OVER (ORDER BY points DESC, matches_played ASC) as rank
        FROM user_league_seasons
        WHERE season_id = $2
      )
      SELECT rank FROM ranked_users WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId, seasonId]);
    return result.rows[0]?.rank || null;
  }

  /**
   * Get leaderboard centered around a specific user
   */
  static async getLeaderboardAroundUser(userId, seasonId, range = 25) {
    const query = `
      WITH ranked_users AS (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY uls.points DESC, uls.matches_played ASC) as rank,
          uls.*,
          u.username,
          u.display_name,
          u.avatar_url,
          u.rating
        FROM user_league_seasons uls
        JOIN users u ON u.id = uls.user_id
        WHERE uls.season_id = $2
      ),
      user_rank AS (
        SELECT rank FROM ranked_users WHERE user_id = $1
      )
      SELECT * FROM ranked_users
      WHERE rank BETWEEN (SELECT rank FROM user_rank) - $3 
                     AND (SELECT rank FROM user_rank) + $3
      ORDER BY rank ASC
    `;
    const result = await pool.query(query, [userId, seasonId, range]);
    return result.rows;
  }

  /**
   * Count total participants in a season
   */
  static async countParticipants(seasonId) {
    const query = 'SELECT COUNT(*) FROM user_league_seasons WHERE season_id = $1';
    const result = await pool.query(query, [seasonId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get top performers across all active seasons
   */
  static async getTopPerformers(limit = 10) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.rating,
        uls.points,
        uls.matches_played,
        l.name as league_name,
        l.icon as league_icon
      FROM user_league_seasons uls
      JOIN users u ON u.id = uls.user_id
      JOIN seasons s ON s.id = uls.season_id AND s.is_active = true
      JOIN leagues l ON l.id = s.league_id
      ORDER BY uls.points DESC, uls.matches_played ASC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

export default UserLeagueSeason;
