// backend/socket/match.socket.js
import Match from '../models/Match.js';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import judgeService from '../services/judge.service.js';
import ratingService from '../services/rating.service.js';
import scoringService from '../services/scoring.service.js';
import rankingService from '../services/ranking.service.js';
import UserLeagueSeason from '../models/UserLeagueSeason.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';

/**
 * Socket.IO event handlers for live match flow
 */
export const handleMatchEvents = (io) => {
  
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
    console.log(`✓ Match socket connected: ${socket.id} (User: ${socket.userId})`);

    socket.on('disconnect', () => {
      console.log(`✗ Match socket disconnected: ${socket.id}`);
    });

    /**
     * Join match lobby room
     */
    socket.on('lobby:join', async (data) => {
      const { matchId } = data;
      
      try {
        const match = await Match.findById(matchId);
        
        if (!match) {
          return socket.emit('lobby:error', { message: 'Match not found' });
        }

        // Join the match room
        socket.join(`match:${matchId}`);
        
        console.log(`✓ User ${socket.userId} joined lobby for match ${matchId}`);
        
        // Notify other players
        socket.to(`match:${matchId}`).emit('lobby:player_joined', {
          userId: socket.userId,
          username: socket.username,
        });

      } catch (error) {
        console.error('Lobby join error:', error);
        socket.emit('lobby:error', { message: error.message });
      }
    });

    /**
     * Start a match (called by server when all players ready)
     */
    socket.on('match:start', async (data) => {
      const { matchId } = data;

      try {
        const match = await Match.findWithParticipants(matchId);

        if (!match || match.status !== 'waiting') {
          return socket.emit('match:error', { message: 'Invalid match state' });
        }

        // Start match
        await Match.start(matchId);

        // Get problem details or create fallback
        let problem = null;
        if (match.problem_id) {
          problem = await Problem.findById(match.problem_id);
        }
        
        // Use fallback problem if none exists
        if (!problem) {
          console.log(`⚠️ No problem assigned to match, using fallback problem`);
          problem = {
            id: 'fallback',
            title: 'Sample Problem',
            description: 'Write a function that returns the sum of two numbers.',
            difficulty: 'easy',
            sample_input: '2 3',
            sample_output: '5',
            time_limit_ms: 2000,
            memory_limit_mb: 256
          };
        }

        // Calculate end time (server authoritative)
        const endTime = Date.now() + (match.duration_minutes * 60 * 1000);

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
          duration: match.duration_minutes * 60 * 1000,
          startTime: Date.now(),
          endTime,
          participants: match.participants,
        });

        // Start server-side timer
        this._startMatchTimer(io, matchId, match.duration_minutes);

        console.log(`✓ Match ${matchId} started`);

      } catch (error) {
        console.error('Match start error:', error);
        socket.emit('match:error', { message: error.message });
      }
    });

    /**
     * Submit code during match
     */
    socket.on('match:submit', async (data) => {
      const { matchId, code, language } = data;
      const userId = socket.userId;

      console.log(`📤 Received submission from user ${userId} for match ${matchId}:`, {
        language,
        codeLength: code.length,
        codePreview: code.substring(0, 100) + '...'
      });

      try {
        const match = await Match.findById(matchId);

        if (!match) {
          console.log(`❌ Match ${matchId} not found`);
          return socket.emit('submission:error', { message: 'Match not found' });
        }

        if (match.status !== 'in_progress') {
          console.log(`❌ Match ${matchId} not in progress (status: ${match.status})`);
          return socket.emit('submission:error', { message: 'Match not in progress' });
        }

        // Validate code
        const validation = judgeService.validateCode(code, language);
        if (!validation.valid) {
          console.log(`❌ Code validation failed: ${validation.error}`);
          console.log(`❌ Code preview: ${code.substring(0, 200)}...`);
          return socket.emit('submission:error', { message: validation.error });
        }

        console.log(`✅ Code validation passed`);

        // Create submission
        console.log(`🔄 Creating submission in database...`);
        const submission = await Submission.createMatchSubmission({
          matchId,
          userId,
          problemId: match.problem_id,
          code,
          language,
        });

        console.log(`✅ Submission created with ID: ${submission.id}`);
        console.log(`✅ Submission details:`, {
          id: submission.id,
          matchId: submission.matchId,
          userId: submission.userId,
          problemId: submission.problemId,
          language: submission.language,
          codeLength: submission.code.length
        });

        // Notify user submission received
        socket.emit('submission:received', {
          submissionId: submission.id,
          status: 'pending',
        });

        // Broadcast submission to other players (without code)
        socket.to(`match:${matchId}`).emit('match:player_submitted', {
          userId,
          timestamp: Date.now(),
        });

        // Execute code asynchronously
        console.log(`🔄 Starting code execution for submission ${submission.id}`);
        console.log(`🔄 Calling _judgeSubmission with:`, {
          submissionId: submission.id,
          matchId: match.id,
          userId: submission.user_id
        });
        io._judgeSubmission(io, submission, match);

        console.log(`✓ User ${userId} submitted code for match ${matchId}`);

      } catch (error) {
        console.error('Submission error:', error);
        socket.emit('submission:error', { message: error.message });
      }
    });

    /**
     * Request current scoreboard
     */
    socket.on('match:get_scoreboard', async (data) => {
      const { matchId } = data;

      try {
        const scoreboard = await this._getMatchScoreboard(matchId);
        socket.emit('match:scoreboard', scoreboard);

      } catch (error) {
        console.error('Get scoreboard error:', error);
        socket.emit('match:error', { message: error.message });
      }
    });

    /**
     * Player ready signal
     */
    socket.on('match:ready', async (data) => {
      const { matchId } = data;
      
      socket.to(`match:${matchId}`).emit('match:player_ready', {
        userId: socket.userId,
        username: socket.username,
      });
    });

  });

  /**
   * Judge a submission with enhanced scoring
   */
  io._judgeSubmission = async (io, submission, match) => {
    console.log(`🎯 _judgeSubmission called for submission ${submission.id}`);
    try {
      // Update status to running
      await Submission.updateResults(submission.id, {
        status: 'running',
        executionTimeMs: null,
        memoryUsedKb: null,
        testResults: [],
        score: 0,
      });

      // Notify user judging started
      io.to(`match:${match.id}`).emit('submission:judging', {
        submissionId: submission.id,
        userId: submission.user_id,
      });

      // Get problem test cases
      console.log(`🔍 Match object:`, {
        id: match.id,
        problem_id: match.problem_id,
        status: match.status,
        start_time: match.start_time
      });
      
      let problem;
      let testCases;
      
      if (match.problem_id) {
        console.log(`🔍 Looking up problem with ID: ${match.problem_id}`);
        problem = await Problem.findById(match.problem_id);
        console.log(`🔍 Problem lookup result:`, problem);
        
        if (problem) {
          console.log(`✅ Problem found:`, { id: problem.id, title: problem.title });
          testCases = typeof problem.test_cases === 'string'
            ? JSON.parse(problem.test_cases)
            : problem.test_cases;
        }
      }
      
      // Fallback: Create a default problem if none exists
      if (!problem) {
        console.log(`⚠️ No problem found, creating fallback problem...`);
        problem = {
          id: 'fallback',
          title: 'Sample Problem',
          description: 'Write a function that returns the sum of two numbers.',
          difficulty: 'easy',
          test_cases: [
            { input: '2 3', output: '5' },
            { input: '10 20', output: '30' },
            { input: '0 0', output: '0' }
          ]
        };
        testCases = problem.test_cases;
        console.log(`✅ Using fallback problem with ${testCases.length} test cases`);
      }
      
      console.log(`🔍 Test cases:`, testCases);

      // Execute code (mock judge)
      const results = await judgeService.executeCode({
        code: submission.code,
        language: submission.language,
        problemId: match.problem_id,
        testCases,
      });

      await Submission.updateResults(submission.id, results);

      // Enhanced scoring calculation
      const solveTime = (Date.now() - new Date(match.start_time).getTime()) / 1000;
      const submissionCount = await Submission.countUserSubmissions(
        match.id,
        submission.user_id
      );

      const scoringResult = scoringService.calculateMatchScore({
        difficulty: problem.difficulty || 'easy',
        solveTime,
        timeLimit: match.duration_minutes * 60,
        solved: results.status === 'accepted',
        submissionCount,
        testsPassed: results.passedTests,
        totalTests: results.totalTests,
        executionTime: results.executionTimeMs,
        memoryUsed: results.memoryUsedKb,
      });

      // Update participant score
      if (results.status === 'accepted') {
        await Match.updateParticipantScore(
          match.id,
          submission.user_id,
          scoringResult.totalScore
        );

        // Check for achievements
        const achievements = await Achievement.checkAndAward(submission.user_id, {
          solved: true,
          solveTime,
          submissionCount,
          firstSolve: submissionCount === 1,
        });

        // Broadcast achievements
        if (achievements.length > 0) {
          io.to(`match:${match.id}`).emit('achievements:unlocked', {
            userId: submission.user_id,
            achievements,
          });
        }

        // End the match when someone gets accepted
        console.log(`🎯 Match ${match.id} ended due to successful submission by user ${submission.user_id}`);
        
        // Calculate final ranks
        console.log(`🔄 Calculating final ranks for match ${match.id}...`);
        await Match.calculateRanks(match.id);
        
        // Complete match
        console.log(`🔄 Completing match ${match.id}...`);
        await Match.complete(match.id);
        
        // Stop the match timer
        if (io.matchTimers && io.matchTimers.has(match.id)) {
          clearInterval(io.matchTimers.get(match.id));
          io.matchTimers.delete(match.id);
        }
        
        // Update user ratings and season points
        console.log(`🔄 Updating ratings and points for match ${match.id}...`);
        await io._updateRatingsAndPoints(match);
        
        // Get final scoreboard
        console.log(`🔄 Getting final scoreboard for match ${match.id}...`);
        const finalScoreboard = await io._getMatchScoreboard(match.id);
        
        // Broadcast match end with final results
        console.log(`📤 Broadcasting match end for match ${match.id}...`);
        io.to(`match:${match.id}`).emit('match:ended', {
          matchId: match.id,
          finalScoreboard,
          participants: match.participants,
          winner: finalScoreboard[0], // First place is winner
        });
        
        // Update user statistics after match completion
        try {
          console.log(`📊 Updating user stats for match ${match.id}...`);
          await rankingService.updateUserStatsAfterMatch(match.id);
        } catch (error) {
          console.error(`❌ Failed to update user stats for match ${match.id}:`, error);
        }
        
        console.log(`✅ Match ${match.id} completed successfully with winner: ${finalScoreboard[0]?.username || 'Unknown'}`);
      }

      // Broadcast enhanced results
      io.to(`match:${match.id}`).emit('submission:result', {
        submissionId: submission.id,
        userId: submission.user_id,
        status: results.status,
        score: scoringResult.totalScore,
        breakdown: scoringResult.breakdown,
        passedTests: results.passedTests,
        totalTests: results.totalTests,
        executionTime: results.executionTimeMs,
      });

      // Update rankings
      await rankingService.updateMatchRankings(match.id);

      // Broadcast updated scoreboard
      const scoreboard = await io._getMatchScoreboard(match.id);
      io.to(`match:${match.id}`).emit('match:scoreboard_update', scoreboard);

      console.log(`✓ Judged submission ${submission.id}: ${results.status} (${scoringResult.totalScore} pts)`);

    } catch (error) {
      console.error('Judge submission error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        submissionId: submission.id,
        matchId: match.id,
        problemId: match.problem_id
      });
      
      // Update submission with error status
      try {
        await Submission.updateResults(submission.id, {
          status: 'runtime_error',
          executionTimeMs: 0,
          memoryUsedKb: 0,
          testResults: [],
          score: 0,
        });
        console.log(`✅ Updated submission ${submission.id} with error status`);
      } catch (updateError) {
        console.error('Failed to update submission with error status:', updateError);
      }
      
      // Notify user of the error
      io.to(`match:${match.id}`).emit('submission:result', {
        submissionId: submission.id,
        userId: submission.user_id,
        status: 'runtime_error',
        score: 0,
        passedTests: 0,
        totalTests: 0,
        executionTime: 0,
      });
    }
  };

  /**
   * Start match timer (server-side authoritative)
   */
  io._startMatchTimer = (io, matchId, durationMinutes) => {
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    
    // Send time sync every 5 seconds
    const timerInterval = setInterval(() => {
      const timeLeft = endTime - Date.now();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        io._endMatch(io, matchId);
      } else {
        io.to(`match:${matchId}`).emit('match:time_sync', {
          timeLeft,
          serverTime: Date.now(),
        });
      }
    }, 5000);

    // Store interval for cleanup
    if (!io.matchTimers) io.matchTimers = new Map();
    io.matchTimers.set(matchId, timerInterval);
  };

  /**
   * End match and calculate final results
   */
  io._endMatch = async (io, matchId) => {
    try {
      console.log(`⏱️ Match ${matchId} time expired, calculating results...`);

      // Calculate final ranks
      await Match.calculateRanks(matchId);

      // Complete match
      await Match.complete(matchId);

      // Get final match data
      const match = await Match.findWithParticipants(matchId);

      // Update user ratings and season points
      await io._updateRatingsAndPoints(match);

      // Get final scoreboard
      const finalScoreboard = await io._getMatchScoreboard(matchId);

      // Broadcast match end
      io.to(`match:${matchId}`).emit('match:ended', {
        matchId,
        finalScoreboard,
        participants: match.participants,
      });

      // Update user statistics after match completion
      try {
        console.log(`📊 Updating user stats for force-ended match ${matchId}...`);
        await rankingService.updateUserStatsAfterMatch(matchId);
      } catch (error) {
        console.error(`❌ Failed to update user stats for match ${matchId}:`, error);
      }

      // Cleanup timer
      if (io.matchTimers && io.matchTimers.has(matchId)) {
        clearInterval(io.matchTimers.get(matchId));
        io.matchTimers.delete(matchId);
      }

      console.log(`✓ Match ${matchId} completed`);

    } catch (error) {
      console.error('End match error:', error);
    }
  };

  /**
   * Get current match scoreboard
   */
  io._getMatchScoreboard = async (matchId) => {
    const match = await Match.findWithParticipants(matchId);

    const scoreboard = match.participants.map(participant => ({
      userId: participant.user_id,
      username: participant.username,
      displayName: participant.display_name,
      avatarUrl: participant.avatar_url,
      rating: participant.rating,
      score: participant.score || 0,
      rank: participant.rank,
      submissionCount: participant.submission_count || 0,
      lastSubmissionAt: participant.last_submission_at,
    }));

    // Sort by score descending
    scoreboard.sort((a, b) => b.score - a.score);

    return scoreboard;
  };

  /**
   * Update user ratings and season points after match
   */
  io._updateRatingsAndPoints = async (match) => {
    try {
      console.log(`🔄 Updating ratings for match ${match.id}...`);
      
      // Get participants sorted by rank
      const participants = match.participants.sort((a, b) => a.rank - b.rank);
      console.log(`🔍 Participants:`, participants.map(p => ({ 
        userId: p.user_id, 
        username: p.username, 
        rank: p.rank, 
        score: p.score 
      })));

      if (participants.length >= 2) {
        // 1v1 rating calculation
        const winner = participants[0];
        const loser = participants[1];

        console.log(`🏆 Winner: ${winner.username} (${winner.user_id})`);
        console.log(`😞 Loser: ${loser.username} (${loser.user_id})`);

        const ratingChanges = ratingService.calculate1v1RatingChange(
          winner.rating,
          loser.rating
        );

        // Update user stats and ratings
        console.log(`🔄 Updating stats for winner ${winner.username} (ID: ${winner.user_id})...`);
        const winnerStats = await User.updateStats(winner.user_id, { won: true });
        console.log(`✅ Winner stats updated:`, winnerStats);
        
        console.log(`🔄 Updating stats for loser ${loser.username} (ID: ${loser.user_id})...`);
        const loserStats = await User.updateStats(loser.user_id, { won: false });
        console.log(`✅ Loser stats updated:`, loserStats);

        // Update ratings in database
        console.log(`🔄 Updating ratings: Winner +${ratingChanges.winnerChange}, Loser ${ratingChanges.loserChange}`);
        await User.updateRating(winner.user_id, ratingChanges.winnerNewRating);
        await User.updateRating(loser.user_id, ratingChanges.loserNewRating);
        console.log(`✅ Ratings updated: Winner ${ratingChanges.winnerNewRating}, Loser ${ratingChanges.loserNewRating}`);
      }

      // Update season points for all participants
      for (const participant of participants) {
        if (match.season_id) {
          console.log(`🔄 Updating season points for ${participant.username}...`);
          await UserLeagueSeason.updatePoints(
            participant.user_id,
            match.season_id,
            participant.score || 0
          );
        }
      }

      console.log(`✅ Successfully updated ratings and points for match ${match.id}`);

    } catch (error) {
      console.error('❌ Update ratings error:', error);
    }
  };

  return io;
};
