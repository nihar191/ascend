// backend/controllers/scoring.controller.js
import scoringService from '../services/scoring.service.js';
import rankingService from '../services/ranking.service.js';
import Achievement from '../models/Achievement.js';

/**
 * Get user statistics
 */
export const getUserStatistics = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await pool.query(
      'SELECT * FROM user_statistics WHERE user_id = $1',
      [userId]
    );

    const achievements = await Achievement.getUserAchievements(userId);

    res.json({
      statistics: stats.rows[0] || null,
      achievements,
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * Get user's rank percentile
 */
export const getUserPercentile = async (req, res) => {
  try {
    const { seasonId } = req.params;
    const userId = req.user.id;

    const percentile = await rankingService.getUserPercentile(userId, seasonId);

    res.json({ percentile });

  } catch (error) {
    console.error('Get percentile error:', error);
    res.status(500).json({ error: 'Failed to calculate percentile' });
  }
};

/**
 * Get scoring breakdown for a submission
 */
export const getScoringBreakdown = async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Fetch submission and match details
    const submission = await Submission.findById(submissionId);
    const match = await Match.findById(submission.match_id);
    const problem = await Problem.findById(submission.problem_id);

    const solveTime = (new Date(submission.submitted_at) - new Date(match.start_time)) / 1000;
    const submissionCount = await Submission.countUserSubmissions(match.id, submission.user_id);

    const scoringResult = scoringService.calculateMatchScore({
      difficulty: problem.difficulty,
      solveTime,
      timeLimit: match.duration_minutes * 60,
      solved: submission.status === 'accepted',
      submissionCount,
      testsPassed: submission.test_results?.passedTests || 0,
      totalTests: submission.test_results?.totalTests || 0,
      executionTime: submission.execution_time_ms,
      memoryUsed: submission.memory_used_kb,
    });

    res.json({
      submissionId,
      scoring: scoringResult,
    });

  } catch (error) {
    console.error('Get scoring breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch scoring breakdown' });
  }
};
