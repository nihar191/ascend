// backend/controllers/problem.controller.js
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import geminiService from '../services/gemini.service.js';
import judgeService from '../services/judge.service.js';

/**
 * Generate URL-safe slug from title
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
};

/**
 * Get all problems with filtering and pagination
 */
export const getAllProblems = async (req, res) => {
  try {
    const { difficulty, tags, search, page = 1, limit = 20 } = req.query;

    const filters = {
      difficulty,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    };

    const [problems, total] = await Promise.all([
      Problem.findAll(filters),
      Problem.count(filters),
    ]);

    res.json({
      problems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
};

/**
 * Get single problem by ID or slug
 */
export const getProblem = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is a number (ID) or string (slug)
    const problem = /^\d+$/.test(identifier)
      ? await Problem.findById(parseInt(identifier))
      : await Problem.findBySlug(identifier);

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Parse test_cases from JSONB
    problem.test_cases = typeof problem.test_cases === 'string' 
      ? JSON.parse(problem.test_cases) 
      : problem.test_cases;

    res.json(problem);

  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
};

/**
 * Create a new problem (admin only)
 */
export const createProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      points,
      timeLimitMs,
      memoryLimitMb,
      tags,
      sampleInput,
      sampleOutput,
      testCases,
    } = req.body;

    // Generate unique slug
    let slug = generateSlug(title);
    let slugExists = await Problem.slugExists(slug);
    let counter = 1;

    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await Problem.slugExists(slug);
      counter++;
    }

    const problem = await Problem.create({
      title,
      slug,
      description,
      difficulty,
      points,
      timeLimitMs,
      memoryLimitMb,
      tags: tags || [],
      sampleInput,
      sampleOutput,
      testCases,
      authorId: req.user.id,
      isAiGenerated: false,
    });

    res.status(201).json({
      message: 'Problem created successfully',
      problem,
    });

  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Failed to create problem' });
  }
};

/**
 * Generate problem using AI (admin only)
 */
export const generateAIProblem = async (req, res) => {
  try {
    const { difficulty = 'medium', tags = [], hint = '', autoSave = false } = req.body;

    // Call Gemini service to generate problem
    const result = await geminiService.generateProblem({
      difficulty,
      tags,
      hint,
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: 'AI generation failed', 
        details: result.error 
      });
    }

    const generatedProblem = result.problem;

    // Optionally auto-save to database
    if (autoSave) {
      let slug = generateSlug(generatedProblem.title);
      let slugExists = await Problem.slugExists(slug);
      let counter = 1;

      while (slugExists) {
        slug = `${generateSlug(generatedProblem.title)}-${counter}`;
        slugExists = await Problem.slugExists(slug);
        counter++;
      }

      const savedProblem = await Problem.create({
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

      return res.status(201).json({
        message: 'AI problem generated and saved',
        problem: savedProblem,
        aiGenerated: true,
      });
    }

    // Return generated problem without saving
    res.json({
      message: 'AI problem generated successfully',
      problem: generatedProblem,
      aiGenerated: true,
    });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate AI problem' });
  }
};

/**
 * Update a problem (admin only)
 */
export const updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const updatedProblem = await Problem.update(id, updates);

    res.json({
      message: 'Problem updated successfully',
      problem: updatedProblem,
    });

  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({ error: 'Failed to update problem' });
  }
};

/**
 * Delete a problem (admin only)
 */
export const deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    await Problem.delete(id);

    res.json({ message: 'Problem deleted successfully' });

  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({ error: 'Failed to delete problem' });
  }
};

/**
 * Get random problem by difficulty
 */
export const getRandomProblem = async (req, res) => {
  try {
    const { difficulty = 'medium' } = req.query;

    const problem = await Problem.getRandomByDifficulty(difficulty);

    if (!problem) {
      return res.status(404).json({ 
        error: `No ${difficulty} problems available` 
      });
    }

    res.json(problem);

  } catch (error) {
    console.error('Get random problem error:', error);
    res.status(500).json({ error: 'Failed to fetch random problem' });
  }
};

/**
 * Submit solution for a problem
 */
export const submitSolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, language = 'javascript' } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Get the problem
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Validate code syntax
    const validation = judgeService.validateCode(code, language);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Prepare test cases for Judge0
    const testCases = [
      {
        input: problem.sampleInput || '',
        output: problem.sampleOutput || ''
      }
    ];

    // Execute code using Judge0
    console.log(`🚀 Executing problem submission for problem ${id}`);
    const executionResult = await judgeService.executeCode({
      code,
      language,
      problemId: id,
      testCases
    });

    const isAccepted = executionResult.status === 'accepted';
    const score = isAccepted ? problem.points : 0;

    // Save submission to database
    await Submission.create({
      userId: req.user.id,
      problemId: id,
      code,
      language,
      status: executionResult.status,
      score: score
    });

    res.json({
      status: executionResult.status,
      score: score,
      message: isAccepted ? 'Solution accepted!' : 'Solution incorrect. Try again.',
      testResults: executionResult.testResults,
      executionTime: executionResult.executionTimeMs,
      memoryUsed: executionResult.memoryUsedKb
    });

  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({ error: 'Failed to submit solution' });
  }
};

/**
 * Simple solution validation (placeholder)
 * In production, this would run the code against test cases
 */
const validateSolution = (code, problem) => {
  // This is a very basic validation
  // In production, you'd run the code against the problem's test cases
  
  // For demo purposes, accept any non-empty code
  return code.trim().length > 10;
};