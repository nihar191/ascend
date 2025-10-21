// backend/models/User.js
import pool from '../config/database.js';

/**
 * User model for database operations
 */
class User {
  /**
   * Create a new user in the database
   */
  static async create({ username, email, passwordHash, displayName = null }) {
    const query = `
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, display_name, rating, created_at
    `;
    
    const result = await pool.query(query, [
      username,
      email,
      passwordHash,
      displayName || username
    ]);
    
    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)';
    const result = await pool.query(query, [username]);
    return result.rows[0].exists;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)';
    const result = await pool.query(query, [email]);
    return result.rows[0].exists;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic UPDATE query based on provided fields
    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramCount++}`);
      values.push(updates.displayName);
    }
    
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, display_name, avatar_url, rating
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user stats after a match
   */
  static async updateStats(userId, { won = false }) {
    const query = `
      UPDATE users
      SET 
        total_matches = total_matches + 1,
        wins = wins + $2,
        losses = losses + $3
      WHERE id = $1
      RETURNING id, username, total_matches, wins, losses
    `;

    const result = await pool.query(query, [
      userId,
      won ? 1 : 0,
      won ? 0 : 1
    ]);

    return result.rows[0];
  }

  /**
   * Update user rating
   */
  static async updateRating(userId, newRating) {
    const query = `
      UPDATE users
      SET rating = $2
      WHERE id = $1
      RETURNING id, username, rating
    `;

    const result = await pool.query(query, [userId, newRating]);
    return result.rows[0];
  }

  /**
   * Get user statistics with calculated fields
   */
  static async getStats(userId) {
    const query = `
      SELECT 
        id, username, display_name, avatar_url, role, rating,
        total_matches, wins, losses,
        CASE 
          WHEN total_matches > 0 THEN ROUND((wins::float / total_matches) * 100, 2)
          ELSE 0
        END as win_rate,
        created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Get all users with stats for admin/leaderboard
   */
  static async getAllWithStats({ page = 1, limit = 50, sortBy = 'rating', order = 'desc' } = {}) {
    const offset = (page - 1) * limit;
    const validSortFields = ['rating', 'total_matches', 'wins', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'rating';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        id, username, display_name, avatar_url, role, rating,
        total_matches, wins, losses,
        CASE 
          WHEN total_matches > 0 THEN ROUND((wins::float / total_matches) * 100, 2)
          ELSE 0
        END as win_rate,
        created_at
      FROM users
      WHERE role != 'banned'
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get user count for pagination
   */
  static async getCount() {
    const query = 'SELECT COUNT(*) FROM users WHERE role != \'banned\'';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   */
  static async delete(userId) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING id, username
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Get user by role for admin management
   */
  static async getByRole(role, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id, username, display_name, email, role, rating,
        total_matches, wins, losses,
        CASE 
          WHEN total_matches > 0 THEN ROUND((wins::float / total_matches) * 100, 2)
          ELSE 0
        END as win_rate,
        created_at
      FROM users
      WHERE role = $1
      ORDER BY rating DESC, total_matches DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [role, limit, offset]);
    return result.rows;
  }
}

export default User;
