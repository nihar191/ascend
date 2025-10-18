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
}

export default User;
