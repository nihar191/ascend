// backend/controllers/league.controller.js
import League from '../models/League.js';
import Season from '../models/Season.js';
import UserLeagueSeason from '../models/UserLeagueSeason.js';
import pool from '../config/database.js';
import matchmakingService from '../services/matchmaking.service.js';
import { createInitialLeague } from '../scripts/createInitialLeague.js';

/**
 * Get all leagues with their active seasons
 */
export const getAllLeagues = async (req, res) => {
  try {
    const leagues = await League.findAll();
    
    // Fetch active seasons for each league
    const leaguesWithSeasons = await Promise.all(
      leagues.map(async (league) => {
        const activeSeason = await Season.getActiveSeason(league.id);
        const stats = await League.getStats(league.id);
        
        return {
          ...league,
          activeSeason,
          stats,
        };
      })
    );

    res.json({ leagues: leaguesWithSeasons });

  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
};

/**
 * Get single league with details
 */
export const getLeague = async (req, res) => {
  try {
    const { id } = req.params;
    
    const league = await League.findById(id);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const seasons = await Season.findByLeague(id);
    const stats = await League.getStats(id);

    res.json({
      ...league,
      seasons,
      stats,
    });

  } catch (error) {
    console.error('Get league error:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
};

/**
 * Get global leaderboard (all users by rating)
 */
export const getGlobalLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY u.rating DESC, u.total_matches ASC) as rank,
        u.id as userId,
        u.username,
        u.display_name,
        u.avatar_url,
        u.rating,
        u.total_matches as matches_played,
        u.wins,
        u.losses,
        CASE 
          WHEN u.total_matches > 0 THEN ROUND((u.wins::numeric / u.total_matches) * 100, 1)
          ELSE 0 
        END as win_rate
      FROM users u
      ORDER BY u.rating DESC, u.total_matches ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [parseInt(limit), offset]);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users'
    );
    
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      leaderboard: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
};

/**
 * Get leaderboard for a season
 */
export const getSeasonLeaderboard = async (req, res) => {
  try {
    const { seasonId } = req.params;
    const { page = 1, limit = 50, centered = false } = req.query;

    const season = await Season.findById(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    let leaderboard;
    let userRank = null;

    if (centered && req.user) {
      // Get leaderboard centered around authenticated user
      leaderboard = await UserLeagueSeason.getLeaderboardAroundUser(
        req.user.id,
        seasonId,
        25
      );
      userRank = await UserLeagueSeason.getUserRank(req.user.id, seasonId);
    } else {
      // Get standard paginated leaderboard
      const offset = (parseInt(page) - 1) * parseInt(limit);
      leaderboard = await UserLeagueSeason.getLeaderboard(seasonId, {
        limit: parseInt(limit),
        offset,
      });
    }

    const totalParticipants = await UserLeagueSeason.countParticipants(seasonId);

    res.json({
      season,
      leaderboard,
      userRank,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalParticipants,
        totalPages: Math.ceil(totalParticipants / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

/**
 * Join a season (requires authentication)
 */
export const joinSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const season = await Season.findById(seasonId);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    if (!season.is_active) {
      return res.status(400).json({ error: 'Season is not active' });
    }

    const result = await UserLeagueSeason.join(req.user.id, seasonId);

    res.json({
      message: 'Successfully joined season',
      data: result,
    });

  } catch (error) {
    console.error('Join season error:', error);
    res.status(500).json({ error: 'Failed to join season' });
  }
};

/**
 * Get user's season statistics
 */
export const getUserSeasonStats = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const seasonData = await UserLeagueSeason.getUserSeasonData(req.user.id, seasonId);
    
    if (!seasonData) {
      return res.status(404).json({ error: 'Not enrolled in this season' });
    }

    const rank = await UserLeagueSeason.getUserRank(req.user.id, seasonId);

    res.json({
      ...seasonData,
      rank,
    });

  } catch (error) {
    console.error('Get user season stats error:', error);
    res.status(500).json({ error: 'Failed to fetch season stats' });
  }
};

/**
 * Create a new league (admin only)
 */
export const createLeague = async (req, res) => {
  try {
    const { name, description, minRating, maxRating, icon } = req.body;

    const league = await League.create({
      name,
      description,
      minRating,
      maxRating,
      icon,
    });

    // Restart matchmaking service now that we have a league
    matchmakingService.restart();

    res.status(201).json({
      message: 'League created successfully',
      league,
    });

  } catch (error) {
    console.error('Create league error:', error);
    res.status(500).json({ error: 'Failed to create league' });
  }
};

/**
 * Create a new season (admin only)
 */
export const createSeason = async (req, res) => {
  try {
    const { leagueId, seasonNumber, startDate, endDate, isActive = true } = req.body;

    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    const season = await Season.create({
      leagueId,
      seasonNumber,
      startDate,
      endDate,
      isActive,
    });

    // Restart matchmaking service now that we have an active season
    if (isActive) {
      matchmakingService.restart();
    }

    res.status(201).json({
      message: 'Season created successfully',
      season,
    });

  } catch (error) {
    console.error('Create season error:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
};

/**
 * End a season and calculate final ranks (admin only)
 */
export const endSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const season = await Season.endSeason(seasonId);

    res.json({
      message: 'Season ended successfully',
      season,
    });

  } catch (error) {
    console.error('End season error:', error);
    res.status(500).json({ error: 'Failed to end season' });
  }
};

/**
 * Get global top performers
 */
export const getTopPerformers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topPerformers = await UserLeagueSeason.getTopPerformers(parseInt(limit));

    res.json({ topPerformers });

  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
};

/**
 * Create initial league and season (admin only)
 */
export const createInitialLeagueEndpoint = async (req, res) => {
  try {
    await createInitialLeague();
    res.json({ message: 'Initial league and season created successfully' });
  } catch (error) {
    console.error('Create initial league error:', error);
    res.status(500).json({ error: 'Failed to create initial league' });
  }
};
