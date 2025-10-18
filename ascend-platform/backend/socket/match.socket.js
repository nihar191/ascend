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

/**
 * Socket.IO event handlers for live match flow
 */
export const handleMatchEvents = (io) => {
  
  io.on('connection', (socket) => {

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

        // Get problem details
        const problem = await Problem.findById(match.problem_id);

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

      try {
        const match = await Match.findById(matchId);

        if (!match) {
          return socket.emit('submission:error', { message: 'Match not found' });
        }

        if (match.status !== 'in_progress') {
          return socket.emit('submission:error', { message: 'Match not in progress' });
        }

        // Validate code
        const validation = judgeService.validateCode(code, language);
        if (!validation.valid) {
          return socket.emit('submission:error', { message: validation.error });
        }

        // Create submission
        const submission = await Submission.create({
          matchId,
          userId,
          problemId: match.problem_id,
          code,
          language,
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
        this._judgeSubmission(io, submission, match);

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
      const problem = await Problem.findById(match.problem_id);
      const testCases = typeof problem.test_cases === 'string'
        ? JSON.parse(problem.test_cases)
        : problem.test_cases;

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
        difficulty: problem.difficulty,
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
      
      await Submission.updateResults(submission.id, {
        status: 'runtime_error',
        executionTimeMs: 0,
        memoryUsedKb: 0,
        testResults: [],
        score: 0,
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
      // Get participants sorted by rank
      const participants = match.participants.sort((a, b) => a.rank - b.rank);

      if (participants.length === 2) {
        // 1v1 rating calculation
        const winner = participants[0];
        const loser = participants[1];

        const ratingChanges = ratingService.calculate1v1RatingChange(
          winner.rating,
          loser.rating
        );

        // Update user ratings (simplified - should use transaction)
        await User.updateStats(winner.user_id, { won: true });
        await User.updateStats(loser.user_id, { won: false });

        console.log(`Rating changes: Winner +${ratingChanges.winnerChange}, Loser ${ratingChanges.loserChange}`);
      }

      // Update season points for all participants
      for (const participant of participants) {
        if (match.season_id) {
          await UserLeagueSeason.updatePoints(
            participant.user_id,
            match.season_id,
            participant.score || 0
          );
        }
      }

    } catch (error) {
      console.error('Update ratings error:', error);
    }
  };

  return io;
};
