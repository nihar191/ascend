// backend/models/League.js
import pool from '../config/database.js';

/**
 * League model for database operations
 */
class League {
  /**
   * Get all leagues
   */
  static async findAll() {
    const query = 'SELECT * FROM leagues ORDER BY min_rating ASC';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Find league by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM leagues WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get appropriate league for a user based on rating
   */
  static async getLeagueForRating(rating) {
    const query = `
      SELECT * FROM leagues
      WHERE min_rating <= $1 AND (max_rating >= $1 OR max_rating IS NULL)
      ORDER BY min_rating DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [rating]);
    return result.rows[0];
  }

  /**
   * Create a new league (admin only)
   */
  static async create({ name, description, minRating, maxRating, icon }) {
    const query = `
      INSERT INTO leagues (name, description, min_rating, max_rating, icon)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, minRating, maxRating, icon]);
    return result.rows[0];
  }

  /**
   * Update league
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'min_rating', 'max_rating', 'icon'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramCount++}`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE leagues
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get league statistics
   */
  static async getStats(leagueId) {
    const query = `
      SELECT 
        COUNT(DISTINCT uls.user_id) as total_users,
        COUNT(DISTINCT m.id) as total_matches,
        AVG(u.rating) as avg_rating
      FROM leagues l
      LEFT JOIN seasons s ON s.league_id = l.id AND s.is_active = true
      LEFT JOIN user_league_seasons uls ON uls.season_id = s.id
      LEFT JOIN users u ON u.id = uls.user_id
      LEFT JOIN matches m ON m.season_id = s.id
      WHERE l.id = $1
      GROUP BY l.id
    `;
    const result = await pool.query(query, [leagueId]);
    return result.rows[0] || { total_users: 0, total_matches: 0, avg_rating: 0 };
  }
}

export default League;
