// backend/models/Submission.js
import pool from '../config/database.js';

/**
 * Submission model for code submissions
 */
class Submission {
  /**
   * Create a new submission (for individual problems)
   */
  static async create({ userId, problemId, code, language, status = 'pending', score = 0 }) {
    const query = `
      INSERT INTO submissions (user_id, problem_id, code, language, status, score)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, problemId, code, language, status, score]);
    return result.rows[0];
  }

  /**
   * Create a new submission (for matches)
   */
  static async createMatchSubmission({ matchId, userId, problemId, code, language }) {
    const query = `
      INSERT INTO submissions (match_id, user_id, problem_id, code, language, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    const result = await pool.query(query, [matchId, userId, problemId, code, language]);
    return result.rows[0];
  }

  /**
   * Find submission by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM submissions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update submission status and results
   */
  static async updateResults(id, { status, executionTimeMs, memoryUsedKb, testResults, score }) {
    const query = `
      UPDATE submissions
      SET 
        status = $2,
        execution_time_ms = $3,
        memory_used_kb = $4,
        test_results = $5,
        score = $6
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      status,
      executionTimeMs,
      memoryUsedKb,
      JSON.stringify(testResults),
      score,
    ]);
    return result.rows[0];
  }

  /**
   * Get all submissions for a match
   */
  static async getMatchSubmissions(matchId) {
    const query = `
      SELECT 
        s.*,
        u.username,
        u.display_name
      FROM submissions s
      JOIN users u ON u.id = s.user_id
      WHERE s.match_id = $1
      ORDER BY s.submitted_at DESC
    `;
    const result = await pool.query(query, [matchId]);
    return result.rows;
  }

  /**
   * Get user's submissions for a match
   */
  static async getUserMatchSubmissions(matchId, userId) {
    const query = `
      SELECT * FROM submissions
      WHERE match_id = $1 AND user_id = $2
      ORDER BY submitted_at DESC
    `;
    const result = await pool.query(query, [matchId, userId]);
    return result.rows;
  }

  /**
   * Get best submission for a user in a match
   */
  static async getBestSubmission(matchId, userId) {
    const query = `
      SELECT * FROM submissions
      WHERE match_id = $1 AND user_id = $2 AND status = 'accepted'
      ORDER BY score DESC, execution_time_ms ASC
      LIMIT 1
    `;
    const result = await pool.query(query, [matchId, userId]);
    return result.rows[0];
  }

  /**
   * Count submissions by user in a match
   */
  static async countUserSubmissions(matchId, userId) {
    const query = `
      SELECT COUNT(*) FROM submissions
      WHERE match_id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [matchId, userId]);
    return parseInt(result.rows[0].count);
  }
}

export default Submission;
