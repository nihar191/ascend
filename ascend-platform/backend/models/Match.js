// backend/models/Match.js
import pool from '../config/database.js';

/**
 * Match model for database operations
 */
class Match {
  /**
   * Create a new match
   */
  static async create({ seasonId, matchType, problemId, durationMinutes }) {
    const query = `
      INSERT INTO matches (season_id, match_type, problem_id, status, duration_minutes)
      VALUES ($1, $2, $3, 'waiting', $4)
      RETURNING *
    `;
    const result = await pool.query(query, [seasonId, matchType, problemId, durationMinutes]);
    return result.rows[0];
  }

  /**
   * Find match by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        m.*,
        p.title as problem_title,
        p.difficulty as problem_difficulty,
        s.season_number,
        l.name as league_name
      FROM matches m
      LEFT JOIN problems p ON p.id = m.problem_id
      LEFT JOIN seasons s ON s.id = m.season_id
      LEFT JOIN leagues l ON l.id = s.league_id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get match with all participants
   */
  static async findWithParticipants(id) {
    const match = await Match.findById(id);
    
    if (!match) return null;

    const participantsQuery = `
      SELECT 
        mp.*,
        u.username,
        u.display_name,
        u.avatar_url,
        u.rating
      FROM match_participants mp
      JOIN users u ON u.id = mp.user_id
      WHERE mp.match_id = $1
      ORDER BY mp.team_number, mp.joined_at
    `;
    const participantsResult = await pool.query(participantsQuery, [id]);

    return {
      ...match,
      participants: participantsResult.rows,
    };
  }

  /**
   * Add participant to match
   */
  static async addParticipant(matchId, userId, teamNumber = 1) {
    const query = `
      INSERT INTO match_participants (match_id, user_id, team_number)
      VALUES ($1, $2, $3)
      ON CONFLICT (match_id, user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [matchId, userId, teamNumber]);
    return result.rows[0];
  }

  /**
   * Remove participant from match
   */
  static async removeParticipant(matchId, userId) {
    const query = `
      DELETE FROM match_participants
      WHERE match_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [matchId, userId]);
    return result.rows[0];
  }

  /**
   * Update match status
   */
  static async updateStatus(id, status, additionalUpdates = {}) {
    const updates = { status, ...additionalUpdates };
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramCount++}`);
      values.push(value);
    }

    values.push(id);

    const query = `
      UPDATE matches
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Start a match
   */
  static async start(id) {
    return await Match.updateStatus(id, 'in_progress', {
      start_time: new Date(),
    });
  }

  /**
   * Complete a match
   */
  static async complete(id) {
    return await Match.updateStatus(id, 'completed', {
      end_time: new Date(),
    });
  }

  /**
   * Get active matches for a user
   */
  static async getUserActiveMatches(userId) {
    const query = `
      SELECT 
        m.*,
        p.title as problem_title,
        p.difficulty as problem_difficulty
      FROM matches m
      JOIN match_participants mp ON mp.match_id = m.id
      LEFT JOIN problems p ON p.id = m.problem_id
      WHERE mp.user_id = $1 AND m.status IN ('waiting', 'in_progress')
      ORDER BY m.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get match history for a user
   */
  static async getUserMatchHistory(userId, { limit = 20, offset = 0 } = {}) {
    const query = `
      SELECT 
        m.*,
        mp.score,
        mp.rank,
        p.title as problem_title,
        p.difficulty as problem_difficulty
      FROM matches m
      JOIN match_participants mp ON mp.match_id = m.id
      LEFT JOIN problems p ON p.id = m.problem_id
      WHERE mp.user_id = $1 AND m.status = 'completed'
      ORDER BY m.end_time DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Update participant score
   */
  static async updateParticipantScore(matchId, userId, score) {
    const query = `
      UPDATE match_participants
      SET score = $3, last_submission_at = CURRENT_TIMESTAMP
      WHERE match_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [matchId, userId, score]);
    return result.rows[0];
  }

  /**
   * Calculate and update final ranks
   */
  static async calculateRanks(matchId) {
    const query = `
      UPDATE match_participants
      SET rank = subquery.rank
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, last_submission_at ASC) as rank
        FROM match_participants
        WHERE match_id = $1
      ) as subquery
      WHERE match_participants.id = subquery.id
      RETURNING *
    `;
    const result = await pool.query(query, [matchId]);
    return result.rows;
  }

  /**
   * Get waiting matches (for lobby list)
   */
  static async getWaitingMatches({ limit = 10 } = {}) {
    const query = `
      SELECT 
        m.*,
        p.title as problem_title,
        p.difficulty as problem_difficulty,
        COUNT(mp.user_id) as current_players
      FROM matches m
      LEFT JOIN problems p ON p.id = m.problem_id
      LEFT JOIN match_participants mp ON mp.match_id = m.id
      WHERE m.status = 'waiting'
      GROUP BY m.id, p.title, p.difficulty
      ORDER BY m.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

export default Match;
