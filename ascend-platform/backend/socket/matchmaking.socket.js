// backend/socket/matchmaking.socket.js
import matchmakingService from '../services/matchmaking.service.js';
import Match from '../models/Match.js';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';

/**
 * Socket.IO event handlers for matchmaking
 */
export const handleMatchmakingEvents = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✓ Socket connected: ${socket.username} (${socket.id})`);

    /**
     * Join matchmaking queue via Socket.IO
     */
    socket.on('matchmaking:join', async (data) => {
      const { matchType = '1v1', preferences = {} } = data;

      try {
        const result = matchmakingService.joinQueue(
          socket.userId,
          preferences.rating || 1000,
          matchType,
          preferences,
          socket.id
        );

        socket.emit('matchmaking:joined', result);

        // Broadcast updated queue stats
        io.emit('matchmaking:stats', matchmakingService.getQueueStats());

      } catch (error) {
        socket.emit('matchmaking:error', { message: error.message });
      }
    });

    /**
     * Leave matchmaking queue
     */
    socket.on('matchmaking:leave', () => {
      const result = matchmakingService.leaveQueue(socket.userId);
      socket.emit('matchmaking:left', result);

      // Broadcast updated queue stats
      io.emit('matchmaking:stats', matchmakingService.getQueueStats());
    });

    /**
     * Get queue status
     */
    socket.on('matchmaking:status', () => {
      const status = matchmakingService.getQueueStatus(socket.userId);
      socket.emit('matchmaking:status', status);
    });

    /**
     * Join match lobby room
     */
    socket.on('lobby:join', async (data) => {
      const { matchId } = data;

      try {
        const match = await Match.findWithParticipants(matchId);

        if (!match) {
          return socket.emit('lobby:error', { message: 'Match not found' });
        }

        // Join Socket.IO room for this match
        socket.join(`match:${matchId}`);

        socket.emit('lobby:joined', { match });

        // Notify other players in lobby
        socket.to(`match:${matchId}`).emit('lobby:player_joined', {
          userId: socket.userId,
          username: socket.username,
        });

        console.log(`✓ ${socket.username} joined match ${matchId} lobby`);

      } catch (error) {
        socket.emit('lobby:error', { message: error.message });
      }
    });

    /**
     * Leave match lobby
     */
    socket.on('lobby:leave', async (data) => {
      const { matchId } = data;

      socket.leave(`match:${matchId}`);

      // Notify other players
      socket.to(`match:${matchId}`).emit('lobby:player_left', {
        userId: socket.userId,
        username: socket.username,
      });

      console.log(`✗ ${socket.username} left match ${matchId} lobby`);
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      // Remove from matchmaking queue
      matchmakingService.leaveQueue(socket.userId);

      console.log(`✗ Socket disconnected: ${socket.username}`);

      // Broadcast updated queue stats
      io.emit('matchmaking:stats', matchmakingService.getQueueStats());
    });
  });

  /**
   * Notify players when match is found
   * Called by matchmaking service after creating match
   */
  const notifyMatchFound = async (matchId) => {
    const lobby = matchmakingService.getLobby(matchId);

    if (!lobby) return;

    const match = await Match.findWithParticipants(matchId);

    // Emit to each player's socket
    lobby.players.forEach(player => {
      if (player.socketId) {
        io.to(player.socketId).emit('matchmaking:match_found', {
          matchId,
          match,
        });
      }
    });

    console.log(`✓ Notified players about match ${matchId}`);
  };

  // Expose notification function
  io.notifyMatchFound = notifyMatchFound;

  return io;
};
