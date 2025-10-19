// backend/socket/matchmaking.socket.js
import matchmakingService from '../services/matchmaking.service.js';
import Match from '../models/Match.js';
import Problem from '../models/Problem.js';
import geminiService from '../services/gemini.service.js';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';

/**
 * Socket.IO event handlers for matchmaking
 */
export const handleMatchmakingEvents = (io) => {
  // Store user to socket mapping
  const userSockets = new Map();

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
    
    // Store user to socket mapping
    userSockets.set(socket.userId, socket.id);

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

        // Debug: Check if lobby exists
        const lobby = matchmakingService.getLobby(parseInt(matchId));
        console.log(`🔍 Lobby check for match ${matchId}:`, lobby ? 'EXISTS' : 'NOT FOUND');
        if (lobby) {
          console.log(`   Lobby players:`, lobby.players.length);
          console.log(`   Lobby preferences:`, lobby.players[0]?.preferences);
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

        // Check if all players have joined and auto-start the match
        await checkAndStartMatch(io, matchId, match);

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
      
      // Remove from user socket mapping
      userSockets.delete(socket.userId);

      console.log(`✗ Socket disconnected: ${socket.username}`);

      // Broadcast updated queue stats
      io.emit('matchmaking:stats', matchmakingService.getQueueStats());
    });
  });

  /**
   * Helper function to start match with a given problem
   */
  const startMatchWithProblem = async (io, matchId, currentMatch, problem) => {
    // Start the match
    await Match.start(matchId);
    console.log(`✅ Match ${matchId} started in database (fallback)`);

    // Calculate end time (server authoritative)
    const endTime = Date.now() + (currentMatch.duration_minutes * 60 * 1000);

    // Broadcast match start to all participants
    io.to(`match:${matchId}`).emit('match:started', {
      matchId,
      problem: {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        sampleInput: problem.sample_input,
        sampleOutput: problem.sample_output,
        timeLimitMs: problem.time_limit_ms,
        memoryLimitMb: problem.memory_limit_mb,
      },
      duration: currentMatch.duration_minutes * 60 * 1000,
      startTime: Date.now(),
      endTime,
      participants: currentMatch.participants,
    });
    console.log(`✅ Match:started event sent to frontend for match ${matchId} (fallback)`);

    // Start server-side timer (if the function exists)
    if (global.startMatchTimer) {
      global.startMatchTimer(io, matchId, currentMatch.duration_minutes);
    }

    console.log(`✓ Match ${matchId} started with fallback problem`);
  };

  /**
   * Check if all players have joined and start the match
   */
  const checkAndStartMatch = async (io, matchId, match) => {
    try {
      // Get current match status
      const currentMatch = await Match.findWithParticipants(matchId);
      
      if (!currentMatch || currentMatch.status !== 'waiting') {
        return; // Match already started or doesn't exist
      }

      // Check if all participants have joined the lobby
      const lobby = matchmakingService.getLobby(parseInt(matchId));
      console.log(`🔍 checkAndStartMatch - Lobby for match ${matchId}:`, lobby ? 'EXISTS' : 'NOT FOUND');
      if (!lobby) {
        console.log(`❌ No lobby found for match ${matchId}`);
        console.log(`   Available lobbies:`, Array.from(matchmakingService.lobbies.keys()));
        return;
      }

      // Get the number of players currently in the match room
      const room = io.sockets.adapter.rooms.get(`match:${matchId}`);
      const playersInRoom = room ? room.size : 0;
      const expectedPlayers = currentMatch.participants.length;

      console.log(`🔍 Match ${matchId}: ${playersInRoom}/${expectedPlayers} players in lobby`);

      if (playersInRoom >= expectedPlayers) {
        console.log(`🚀 Starting match ${matchId} - all players joined!`);
        
        // Generate a fresh problem using Gemini AI
        console.log(`🤖 Generating live problem for match ${matchId}...`);
        
        // Get difficulty from the first player's preferences (they should all be the same)
        const lobby = matchmakingService.getLobby(parseInt(matchId));
        if (!lobby || !lobby.players || lobby.players.length === 0) {
          console.error(`❌ Invalid lobby data for match ${matchId}:`, lobby);
          return;
        }
        
        const difficulty = lobby.players[0]?.preferences?.difficulty || 'medium';
        console.log(`🎯 Using difficulty: ${difficulty} for match ${matchId}`);
        
        const problemResult = await geminiService.generateProblem({
          difficulty,
          tags: ['array', 'string', 'algorithm'], // Default tags for variety
          hint: `Competitive programming problem for ${difficulty} level match`
        });

        if (!problemResult.success) {
          console.error(`❌ Failed to generate problem for match ${matchId}:`, problemResult.error);
          // Fallback: try to find an existing problem
          console.log(`🔄 Attempting fallback to existing ${difficulty} problem...`);
          const fallbackProblem = await Problem.getRandomByDifficulty(difficulty);
          if (!fallbackProblem) {
            console.error(`❌ No fallback problem available for difficulty: ${difficulty}`);
            // Try with any difficulty as last resort
            const anyProblem = await Problem.getRandomByDifficulty('medium');
            if (!anyProblem) {
              console.error(`❌ No problems available in database at all!`);
              return;
            }
            console.log(`⚠️ Using medium difficulty problem as last resort`);
            await startMatchWithProblem(io, matchId, currentMatch, anyProblem);
            return;
          }
          console.log(`✅ Using fallback problem: "${fallbackProblem.title}"`);
          await startMatchWithProblem(io, matchId, currentMatch, fallbackProblem);
          console.log(`✅ Fallback match started for match ${matchId}`);
          return;
        }

        const generatedProblem = problemResult.problem;
        console.log(`✅ Generated problem: "${generatedProblem.title}" (${difficulty})`);

        // Start the match
        await Match.start(matchId);
        console.log(`✅ Match ${matchId} started in database`);

        // Calculate end time (server authoritative)
        const endTime = Date.now() + (currentMatch.duration_minutes * 60 * 1000);

        // Broadcast match start to all participants with the generated problem
        io.to(`match:${matchId}`).emit('match:started', {
          matchId,
          problem: {
            id: `generated-${matchId}`, // Use match ID as problem ID for generated problems
            title: generatedProblem.title,
            description: generatedProblem.description,
            difficulty: generatedProblem.difficulty,
            sampleInput: generatedProblem.sampleInput,
            sampleOutput: generatedProblem.sampleOutput,
            timeLimitMs: generatedProblem.timeLimitMs,
            memoryLimitMb: generatedProblem.memoryLimitMb,
            testCases: generatedProblem.testCases, // Include test cases for judging
          },
          duration: currentMatch.duration_minutes * 60 * 1000,
          startTime: Date.now(),
          endTime,
          participants: currentMatch.participants,
        });
        console.log(`✅ Match:started event sent to frontend for match ${matchId}`);

        // Start server-side timer (if the function exists)
        if (global.startMatchTimer) {
          global.startMatchTimer(io, matchId, currentMatch.duration_minutes);
        }

        console.log(`✓ Match ${matchId} started with live-generated problem`);
      }
    } catch (error) {
      console.error('Error checking/starting match:', error);
    }
  };

  /**
   * Notify players when match is found
   * Called by matchmaking service after creating match
   */
  const notifyMatchFound = async (matchId) => {
    const lobby = matchmakingService.getLobby(matchId);

    if (!lobby) {
      console.log(`❌ No lobby found for match ${matchId}`);
      return;
    }

    const match = await Match.findWithParticipants(matchId);

    console.log(`📡 Attempting to notify ${lobby.players.length} players about match ${matchId}`);

    // Emit to each player's current socket
    lobby.players.forEach(player => {
      const currentSocketId = userSockets.get(player.userId);
      if (currentSocketId) {
        console.log(`📡 Sending match_found to user ${player.userId} via socket: ${currentSocketId}`);
        io.to(currentSocketId).emit('matchmaking:match_found', {
          matchId,
          match,
        });
      } else {
        console.log(`❌ No active socket found for user ${player.userId}`);
      }
    });

    console.log(`✓ Notified players about match ${matchId}`);
  };

  // Expose notification function
  io.notifyMatchFound = notifyMatchFound;

  return io;
};
