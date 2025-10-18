// backend/models/Problem.js
import pool from '../config/database.js';

/**
 * Problem model for database operations
 */
class Problem {
  /**
   * Create a new problem
   */
  static async create(problemData) {
    const {
      title,
      slug,
      description,
      difficulty,
      points,
      timeLimitMs = 2000,
      memoryLimitMb = 256,
      tags = [],
      sampleInput,
      sampleOutput,
      testCases,
      authorId,
      isAiGenerated = false,
    } = problemData;

    const query = `
      INSERT INTO problems (
        title, slug, description, difficulty, points,
        time_limit_ms, memory_limit_mb, tags,
        sample_input, sample_output, test_cases,
        author_id, is_ai_generated, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      slug,
      description,
      difficulty,
      points,
      timeLimitMs,
      memoryLimitMb,
      tags,
      sampleInput,
      sampleOutput,
      JSON.stringify(testCases),
      authorId,
      isAiGenerated,
    ]);

    return result.rows[0];
  }

  /**
   * Find problem by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM problems WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find problem by slug
   */
  static async findBySlug(slug) {
    const query = 'SELECT * FROM problems WHERE slug = $1 AND is_active = true';
    const result = await pool.query(query, [slug]);
    return result.rows[0];
  }

  /**
   * Get all problems with optional filtering
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM problems WHERE is_active = true';
    const values = [];
    let paramCount = 1;

    // Apply difficulty filter
    if (filters.difficulty) {
      query += ` AND difficulty = $${paramCount++}`;
      values.push(filters.difficulty);
    }

    // Apply tag filter (check if array contains any of the tags)
    if (filters.tags && filters.tags.length > 0) {
      query += ` AND tags && $${paramCount++}`;
      values.push(filters.tags);
    }

    // Apply search filter (search in title and description)
    if (filters.search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Ordering
    query += ' ORDER BY created_at DESC';

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount++}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count total problems with filters
   */
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) FROM problems WHERE is_active = true';
    const values = [];
    let paramCount = 1;

    if (filters.difficulty) {
      query += ` AND difficulty = $${paramCount++}`;
      values.push(filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      query += ` AND tags && $${paramCount++}`;
      values.push(filters.tags);
    }

    if (filters.search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Update a problem
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'title', 'description', 'difficulty', 'points',
      'time_limit_ms', 'memory_limit_mb', 'tags',
      'sample_input', 'sample_output', 'test_cases', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramCount++}`);
        values.push(field === 'test_cases' ? JSON.stringify(updates[field]) : updates[field]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE problems
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft delete a problem
   */
  static async delete(id) {
    const query = 'UPDATE problems SET is_active = false WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(id) {
    const query = `
      UPDATE problems
      SET usage_count = usage_count + 1
      WHERE id = $1
      RETURNING usage_count
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get random problem by difficulty
   */
  static async getRandomByDifficulty(difficulty) {
    const query = `
      SELECT * FROM problems
      WHERE difficulty = $1 AND is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const result = await pool.query(query, [difficulty]);
    return result.rows[0];
  }

  /**
   * Check if slug exists
   */
  static async slugExists(slug) {
    const query = 'SELECT EXISTS(SELECT 1 FROM problems WHERE slug = $1)';
    const result = await pool.query(query, [slug]);
    return result.rows[0].exists;
  }
}

export default Problem;
