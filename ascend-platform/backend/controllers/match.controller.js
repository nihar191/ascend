// backend/controllers/match.controller.js
import Match from '../models/Match.js';
import matchmakingService from '../services/matchmaking.service.js';

/**
 * Join matchmaking queue
 */
export const joinMatchmaking = async (req, res) => {
  try {
    const { matchType = '1v1', preferences = {} } = req.body;
    const userId = req.user.id;
    const rating = req.user.rating;

    const result = matchmakingService.joinQueue(
      userId,
      rating,
      matchType,
      preferences,
      req.socketId // Will be set by Socket.IO
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: 'Joined matchmaking queue',
      ...result,
    });

  } catch (error) {
    console.error('Join matchmaking error:', error);
    res.status(500).json({ error: 'Failed to join matchmaking' });
  }
};

/**
 * Leave matchmaking queue
 */
export const leaveMatchmaking = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = matchmakingService.leaveQueue(userId);

    res.json({
      message: result.success ? 'Left matchmaking queue' : 'Not in queue',
      success: result.success,
    });

  } catch (error) {
    console.error('Leave matchmaking error:', error);
    res.status(500).json({ error: 'Failed to leave matchmaking' });
  }
};

/**
 * Get matchmaking queue status
 */
export const getQueueStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = matchmakingService.getQueueStatus(userId);

    res.json(status);

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
};

/**
 * Get queue statistics (public)
 */
export const getQueueStats = async (req, res) => {
  try {
    const stats = matchmakingService.getQueueStats();
    res.json(stats);

  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
};

/**
 * Get match details
 */
export const getMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findWithParticipants(id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);

  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
};

/**
 * Get user's active matches
 */
export const getActiveMatches = async (req, res) => {
  try {
    const matches = await Match.getUserActiveMatches(req.user.id);
    res.json({ matches });

  } catch (error) {
    console.error('Get active matches error:', error);
    res.status(500).json({ error: 'Failed to fetch active matches' });
  }
};

/**
 * Get user's match history
 */
export const getMatchHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const matches = await Match.getUserMatchHistory(req.user.id, {
      limit: parseInt(limit),
      offset,
    });

    res.json({
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Get match history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
};

/**
 * Get list of waiting matches (lobbies)
 */
export const getWaitingMatches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const matches = await Match.getWaitingMatches({ limit: parseInt(limit) });

    res.json({ matches });

  } catch (error) {
    console.error('Get waiting matches error:', error);
    res.status(500).json({ error: 'Failed to fetch waiting matches' });
  }
};

/**
 * Join an existing match lobby
 */
export const joinMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ error: 'Match has already started' });
    }

    await Match.addParticipant(id, req.user.id);

    res.json({
      message: 'Joined match successfully',
      matchId: id,
    });

  } catch (error) {
    console.error('Join match error:', error);
    res.status(500).json({ error: 'Failed to join match' });
  }
};

/**
 * Leave a match lobby
 */
export const leaveMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ error: 'Cannot leave match in progress' });
    }

    await Match.removeParticipant(id, req.user.id);

    res.json({
      message: 'Left match successfully',
    });

  } catch (error) {
    console.error('Leave match error:', error);
    res.status(500).json({ error: 'Failed to leave match' });
  }
};
