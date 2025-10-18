// backend/models/Season.js
import pool from '../config/database.js';

/**
 * Season model for database operations
 */
class Season {
  /**
   * Create a new season
   */
  static async create({ leagueId, seasonNumber, startDate, endDate, isActive = false }) {
    const query = `
      INSERT INTO seasons (league_id, season_number, start_date, end_date, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [leagueId, seasonNumber, startDate, endDate, isActive]);
    return result.rows[0];
  }

  /**
   * Find season by ID
   */
  static async findById(id) {
    const query = `
      SELECT s.*, l.name as league_name, l.icon as league_icon
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all seasons for a league
   */
  static async findByLeague(leagueId) {
    const query = `
      SELECT * FROM seasons
      WHERE league_id = $1
      ORDER BY season_number DESC
    `;
    const result = await pool.query(query, [leagueId]);
    return result.rows;
  }

  /**
   * Get active season for a league
   */
  static async getActiveSeason(leagueId) {
    const query = `
      SELECT * FROM seasons
      WHERE league_id = $1 AND is_active = true
      LIMIT 1
    `;
    const result = await pool.query(query, [leagueId]);
    return result.rows[0];
  }

  /**
   * Get all active seasons
   */
  static async getActiveSeasons() {
    const query = `
      SELECT s.*, l.name as league_name, l.icon as league_icon
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE s.is_active = true
      ORDER BY l.min_rating ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Activate a season (deactivate others in same league)
   */
  static async activate(seasonId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get league_id for this season
      const seasonResult = await client.query(
        'SELECT league_id FROM seasons WHERE id = $1',
        [seasonId]
      );

      if (seasonResult.rows.length === 0) {
        throw new Error('Season not found');
      }

      const leagueId = seasonResult.rows[0].league_id;

      // Deactivate all seasons in this league
      await client.query(
        'UPDATE seasons SET is_active = false WHERE league_id = $1',
        [leagueId]
      );

      // Activate the target season
      await client.query(
        'UPDATE seasons SET is_active = true WHERE id = $1',
        [seasonId]
      );

      await client.query('COMMIT');

      return await Season.findById(seasonId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * End a season and calculate final ranks
   */
  static async endSeason(seasonId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update ranks based on points
      await client.query(`
        UPDATE user_league_seasons
        SET rank = subquery.rank
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, matches_played ASC) as rank
          FROM user_league_seasons
          WHERE season_id = $1
        ) as subquery
        WHERE user_league_seasons.id = subquery.id
      `, [seasonId]);

      // Deactivate season
      await client.query(
        'UPDATE seasons SET is_active = false WHERE id = $1',
        [seasonId]
      );

      await client.query('COMMIT');

      return await Season.findById(seasonId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update season details
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['season_number', 'start_date', 'end_date', 'is_active'];

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
      UPDATE seasons
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

export default Season;
