// backend/controllers/admin.controller.js
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import League from '../models/League.js';
import Season from '../models/Season.js';
import Match from '../models/Match.js';
import Submission from '../models/Submission.js';
import pool from '../config/database.js';
import geminiService from '../services/gemini.service.js';

/**
 * Get platform statistics dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM problems WHERE is_active = true) as total_problems,
        (SELECT COUNT(*) FROM problems WHERE is_ai_generated = true) as ai_problems,
        (SELECT COUNT(*) FROM matches) as total_matches,
        (SELECT COUNT(*) FROM matches WHERE status = 'in_progress') as active_matches,
        (SELECT COUNT(*) FROM submissions) as total_submissions,
        (SELECT COUNT(*) FROM submissions WHERE status = 'accepted') as accepted_submissions,
        (SELECT COUNT(*) FROM leagues) as total_leagues,
        (SELECT COUNT(*) FROM seasons WHERE is_active = true) as active_seasons
    `);

    // Recent activity
    const recentUsers = await pool.query(`
      SELECT id, username, display_name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const recentMatches = await pool.query(`
      SELECT m.id, m.status, m.created_at, p.title as problem_title
      FROM matches m
      LEFT JOIN problems p ON p.id = m.problem_id
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    res.json({
      statistics: stats.rows[0],
      recentUsers: recentUsers.rows,
      recentMatches: recentMatches.rows,
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

/**
 * Get all users with filtering and pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, sortBy = 'created_at', order = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const validSortFields = ['username', 'email', 'rating', 'total_matches', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        id, username, email, display_name, avatar_url, role, rating,
        total_matches, wins, losses, created_at
      FROM users
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    queryParams.push(parseInt(limit), offset);

    const users = await pool.query(query, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, paramCount - 1));

    res.json({
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Update user role or status
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, rating } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(rating);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, rating
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Ban/unban user
 */
export const toggleUserBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { banned, reason } = req.body;

    // For now, we'll use a simple flag. In production, add a bans table
    const query = `
      UPDATE users
      SET role = CASE 
        WHEN $2 = true THEN 'banned'
        ELSE 'user'
      END
      WHERE id = $1
      RETURNING id, username, role
    `;

    const result = await pool.query(query, [id, banned]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
      user: result.rows[0],
    });

  } catch (error) {
    console.error('Toggle user ban error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

/**
 * Bulk generate AI problems
 */
export const bulkGenerateProblems = async (req, res) => {
  try {
    const { count = 5, difficulty = 'medium', tags = [] } = req.body;

    if (count > 10) {
      return res.status(400).json({ error: 'Maximum 10 problems per bulk generation' });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (let i = 0; i < count; i++) {
      try {
        const result = await geminiService.generateProblem({
          difficulty,
          tags: tags.length > 0 ? tags : ['array', 'string', 'hash-table'],
        });

        if (result.success) {
          const generatedProblem = result.problem;

          let slug = generatedProblem.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');

          let counter = 1;
          while (await Problem.slugExists(slug)) {
            slug = `${slug}-${counter}`;
            counter++;
          }

          const problem = await Problem.create({
            title: generatedProblem.title,
            slug,
            description: generatedProblem.description,
            difficulty: generatedProblem.difficulty,
            points: generatedProblem.points,
            timeLimitMs: generatedProblem.timeLimitMs,
            memoryLimitMb: generatedProblem.memoryLimitMb,
            tags: generatedProblem.tags,
            sampleInput: generatedProblem.sampleInput,
            sampleOutput: generatedProblem.sampleOutput,
            testCases: generatedProblem.testCases,
            authorId: req.user.id,
            isAiGenerated: true,
          });

          results.success.push(problem);
        } else {
          results.failed.push({ error: result.error });
        }

        // Delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.failed.push({ error: error.message });
      }
    }

    res.json({
      message: `Generated ${results.success.length} problems, ${results.failed.length} failed`,
      results,
    });

  } catch (error) {
    console.error('Bulk generate problems error:', error);
    res.status(500).json({ error: 'Failed to generate problems' });
  }
};

/**
 * Get all matches with admin details
 */
export const getAllMatches = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const queryParams = [parseInt(limit), offset];

    if (status) {
      whereClause = 'WHERE m.status = $3';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        m.*,
        p.title as problem_title,
        p.difficulty as problem_difficulty,
        COUNT(mp.user_id) as participant_count
      FROM matches m
      LEFT JOIN problems p ON p.id = m.problem_id
      LEFT JOIN match_participants mp ON mp.match_id = m.id
      ${whereClause}
      GROUP BY m.id, p.title, p.difficulty
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const matches = await pool.query(query, queryParams);

    const countQuery = `SELECT COUNT(*) FROM matches m ${whereClause}`;
    const countParams = status ? [status] : [];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      matches: matches.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });

  } catch (error) {
    console.error('Get all matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

/**
 * Force end a match (emergency)
 */
export const forceEndMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match already completed' });
    }

    await Match.calculateRanks(id);
    await Match.complete(id);

    res.json({
      message: 'Match force-ended successfully',
      matchId: id,
    });

  } catch (error) {
    console.error('Force end match error:', error);
    res.status(500).json({ error: 'Failed to end match' });
  }
};

/**
 * Get system logs (simplified)
 */
export const getSystemLogs = async (req, res) => {
  try {
    const { limit = 100, type } = req.query;

    // In production, implement proper logging system (Winston, etc.)
    const logs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'System running normally',
        type: 'system',
      },
    ];

    res.json({ logs });

  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

/**
 * Bulk update problems (activate/deactivate)
 */
export const bulkUpdateProblems = async (req, res) => {
  try {
    const { problemIds, isActive } = req.body;

    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: 'Invalid problem IDs' });
    }

    if (problemIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 problems per bulk operation' });
    }

    const query = `
      UPDATE problems
      SET is_active = $1
      WHERE id = ANY($2::int[])
      RETURNING id, title, is_active
    `;

    const result = await pool.query(query, [isActive, problemIds]);

    res.json({
      message: `Updated ${result.rows.length} problems`,
      problems: result.rows,
    });

  } catch (error) {
    console.error('Bulk update problems error:', error);
    res.status(500).json({ error: 'Failed to update problems' });
  }
};

/**
 * Delete multiple problems
 */
export const bulkDeleteProblems = async (req, res) => {
  try {
    const { problemIds } = req.body;

    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({ error: 'Invalid problem IDs' });
    }

    // Soft delete
    const query = `
      UPDATE problems
      SET is_active = false
      WHERE id = ANY($1::int[])
      RETURNING id
    `;

    const result = await pool.query(query, [problemIds]);

    res.json({
      message: `Deleted ${result.rows.length} problems`,
      deletedIds: result.rows.map(r => r.id),
    });

  } catch (error) {
    console.error('Bulk delete problems error:', error);
    res.status(500).json({ error: 'Failed to delete problems' });
  }
};

/**
 * Create or update platform settings
 */
export const updatePlatformSettings = async (req, res) => {
  try {
    const settings = req.body;

    // In production, store in a settings table
    // For now, return success
    res.json({
      message: 'Settings updated successfully',
      settings,
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
