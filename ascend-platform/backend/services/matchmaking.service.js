// backend/services/matchmaking.service.js
import Match from '../models/Match.js';
import Problem from '../models/Problem.js';
import Season from '../models/Season.js';
import UserLeagueSeason from '../models/UserLeagueSeason.js';
import League from '../models/League.js';

/**
 * Matchmaking service for pairing players and creating matches
 */
class MatchmakingService {
  constructor() {
    // Queue structure: { userId, rating, preferences, joinedAt, socketId }
    this.queues = {
      '1v1': [],
      '2v2': [],
      'ffa': [], // Free-for-all
    };
    
    // Active lobbies waiting for players
    this.lobbies = new Map();
    
    // Matchmaking interval (runs every 5 seconds)
    this.matchmakingInterval = null;
  }

  /**
   * Start matchmaking service
   */
  start() {
    if (this.matchmakingInterval) return;

    console.log('🎮 Matchmaking service started');
    
    this.matchmakingInterval = setInterval(() => {
      this.processQueues();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Stop matchmaking service
   */
  stop() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
      console.log('🛑 Matchmaking service stopped');
    }
  }

  /**
   * Add player to matchmaking queue
   */
  joinQueue(userId, rating, matchType = '1v1', preferences = {}, socketId = null) {
    if (!this.queues[matchType]) {
      throw new Error(`Invalid match type: ${matchType}`);
    }

    // Check if already in queue
    const alreadyInQueue = this.queues[matchType].some(p => p.userId === userId);
    if (alreadyInQueue) {
      return { success: false, message: 'Already in queue' };
    }

    const queueEntry = {
      userId,
      rating,
      preferences: {
        difficulty: preferences.difficulty || 'medium',
        ...preferences,
      },
      joinedAt: Date.now(),
      socketId,
    };

    this.queues[matchType].push(queueEntry);

    console.log(`✓ User ${userId} joined ${matchType} queue (Rating: ${rating}, Difficulty: ${preferences.difficulty})`);
    console.log(`📊 Queue status: ${this.queues[matchType].length} players in ${matchType} queue`);

    return {
      success: true,
      queuePosition: this.queues[matchType].length,
      queueSize: this.queues[matchType].length,
    };
  }

  /**
   * Remove player from all queues
   */
  leaveQueue(userId) {
    let removed = false;

    for (const matchType in this.queues) {
      const initialLength = this.queues[matchType].length;
      this.queues[matchType] = this.queues[matchType].filter(p => p.userId !== userId);
      
      if (this.queues[matchType].length < initialLength) {
        removed = true;
        console.log(`✗ User ${userId} left ${matchType} queue`);
      }
    }

    return { success: removed };
  }

  /**
   * Get queue status for a user
   */
  getQueueStatus(userId) {
    for (const matchType in this.queues) {
      const position = this.queues[matchType].findIndex(p => p.userId === userId);
      
      if (position !== -1) {
        const entry = this.queues[matchType][position];
        const waitTime = Date.now() - entry.joinedAt;
        
        return {
          inQueue: true,
          matchType,
          position: position + 1,
          queueSize: this.queues[matchType].length,
          waitTime,
        };
      }
    }

    return { inQueue: false };
  }

  /**
   * Process matchmaking queues
   */
  async processQueues() {
    for (const matchType in this.queues) {
      const queueSize = this.queues[matchType].length;
      const minPlayers = this._getMinPlayers(matchType);
      
      if (queueSize > 0) {
        console.log(`🎮 Processing ${matchType} queue: ${queueSize} players (min: ${minPlayers})`);
      }
      
      if (queueSize >= minPlayers) {
        await this._createMatches(matchType);
      }
    }
  }

  /**
   * Create matches from queue
   */
  async _createMatches(matchType) {
    const queue = this.queues[matchType];
    const minPlayers = this._getMinPlayers(matchType);

    // Sort queue by wait time (FIFO with rating tolerance)
    queue.sort((a, b) => a.joinedAt - b.joinedAt);

    const matches = [];

    while (queue.length >= minPlayers) {
      const players = [];
      const firstPlayer = queue[0];

      // Find compatible players
      for (let i = 0; i < queue.length && players.length < minPlayers; i++) {
        const player = queue[i];

        if (players.length === 0 || this._arePlayersCompatible(firstPlayer, player)) {
          players.push(player);
        }
      }

      // Not enough compatible players found
      if (players.length < minPlayers) {
        // Check if first player has been waiting too long (>60s)
        const waitTime = Date.now() - firstPlayer.joinedAt;
        if (waitTime > 60000) {
          // Relax rating requirements and try again
          const relaxedPlayers = queue.slice(0, minPlayers);
          if (relaxedPlayers.length === minPlayers) {
            players.push(...relaxedPlayers.filter(p => !players.includes(p)));
          }
        }

        if (players.length < minPlayers) break;
      }

      // Remove matched players from queue
      players.forEach(player => {
        const index = queue.indexOf(player);
        if (index !== -1) queue.splice(index, 1);
      });

      // Create match
      try {
        const match = await this._createMatch(matchType, players);
        matches.push(match);
        
        console.log(`✓ Match ${match.id} created (${matchType}) with ${players.length} players`);
      } catch (error) {
        console.error('Failed to create match:', error.message);
        // Return players to queue
        players.forEach(p => queue.push(p));
        
        // If it's a league/season issue, stop processing to prevent spam
        if (error.message.includes('No league found') || error.message.includes('No active season')) {
          console.log('⚠️  Stopping matchmaking due to missing leagues/seasons. Please create them first.');
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Check if two players are compatible for matching
   */
  _arePlayersCompatible(player1, player2) {
    // Same difficulty preference
    if (player1.preferences.difficulty !== player2.preferences.difficulty) {
      return false;
    }

    // Rating difference tolerance
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    const waitTime = Date.now() - Math.max(player1.joinedAt, player2.joinedAt);

    // Base tolerance: ±100 rating
    let tolerance = 100;

    // Increase tolerance based on wait time (±50 every 20 seconds)
    tolerance += Math.floor(waitTime / 20000) * 50;

    // Max tolerance: ±300 rating
    tolerance = Math.min(tolerance, 300);

    return ratingDiff <= tolerance;
  }

  /**
   * Create a match in database
   */
  async _createMatch(matchType, players) {
    // Get appropriate season based on average rating
    const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
    const league = await League.getLeagueForRating(avgRating);
    
    if (!league) {
      throw new Error('No league found for rating range. Please create leagues first.');
    }
    
    const season = await Season.getActiveSeason(league.id);

    if (!season) {
      throw new Error('No active season available');
    }

    // Get difficulty preference (we'll generate the problem live when match starts)
    const difficulty = players[0].preferences.difficulty;

    // Create match without a specific problem (will be generated live)
    const match = await Match.create({
      seasonId: season.id,
      matchType,
      problemId: null, // No problem assigned yet - will be generated live
      durationMinutes: 15,
    });

    // Add participants
    const teamAssignments = this._assignTeams(matchType, players.length);
    
    for (let i = 0; i < players.length; i++) {
      await Match.addParticipant(match.id, players[i].userId, teamAssignments[i]);
      
      // Ensure user is enrolled in season
      await UserLeagueSeason.join(players[i].userId, season.id);
    }

    // Store match metadata for Socket.IO
    const lobbyData = {
      matchId: match.id,
      players: players.map(p => ({ 
        userId: p.userId, 
        socketId: p.socketId,
        preferences: p.preferences // ✅ Include preferences for problem generation
      })),
      createdAt: Date.now(),
    };
    
    this.lobbies.set(match.id, lobbyData);
    console.log(`🏠 Lobby created for match ${match.id}:`, {
      players: lobbyData.players.length,
      preferences: lobbyData.players[0]?.preferences
    });
    console.log(`   Total lobbies now:`, this.lobbies.size);
    console.log(`   Lobby keys:`, Array.from(this.lobbies.keys()));

    // Notify players via Socket.IO (if io instance is available)
    if (global.io && global.io.notifyMatchFound) {
      await global.io.notifyMatchFound(match.id);
    }

    return match;
  }

  /**
   * Assign team numbers based on match type
   */
  _assignTeams(matchType, playerCount) {
    if (matchType === '1v1') {
      return [1, 2];
    } else if (matchType === '2v2') {
      return [1, 1, 2, 2];
    } else if (matchType === 'ffa') {
      // Free-for-all: everyone on their own team
      return Array.from({ length: playerCount }, (_, i) => i + 1);
    }
    return [];
  }

  /**
   * Get minimum players required for match type
   */
  _getMinPlayers(matchType) {
    const minPlayers = {
      '1v1': 2,
      '2v2': 4,
      'ffa': 3,
    };
    return minPlayers[matchType] || 2;
  }

  /**
   * Get current queue statistics
   */
  getQueueStats() {
    const stats = {};

    for (const matchType in this.queues) {
      const queue = this.queues[matchType];
      const avgWaitTime = queue.length > 0
        ? queue.reduce((sum, p) => sum + (Date.now() - p.joinedAt), 0) / queue.length
        : 0;

      stats[matchType] = {
        playersInQueue: queue.length,
        avgWaitTimeMs: Math.round(avgWaitTime),
      };
    }

    return stats;
  }

  /**
   * Get lobby data for a match
   */
  getLobby(matchId) {
    return this.lobbies.get(matchId);
  }

  /**
   * Remove lobby (when match starts)
   */
  removeLobby(matchId) {
    this.lobbies.delete(matchId);
  }
}

export default new MatchmakingService();
