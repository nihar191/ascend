// backend/services/gemini.service.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service for generating coding problems using Google Gemini AI
 */
class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 45536,
    };
  }

  /**
   * Generate a coding problem with test cases
   * @param {Object} params - Problem generation parameters
   * @param {string} params.difficulty - easy, medium, or hard
   * @param {string[]} params.tags - Array of topic tags (e.g., ['array', 'dynamic-programming'])
   * @param {string} params.hint - Optional hint for problem theme
   * @returns {Object} Generated problem with title, description, test cases
   */
  async generateProblem({ difficulty = 'medium', tags = [], hint = '' }) {
    try {
      const prompt = this._buildProblemPrompt(difficulty, tags, hint);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      const response = result.response;
      const problemText = response.text();

      // Parse the JSON response from Gemini
      const problemData = this._parseProblemResponse(problemText);
      
      return {
        success: true,
        problem: problemData,
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate problem',
      };
    }
  }

  /**
   * Build detailed prompt for problem generation
   */
  _buildProblemPrompt(difficulty, tags, hint) {
    const tagsList = tags.length > 0 ? tags.join(', ') : 'any suitable topics';
    const hintText = hint ? `\nTheme/Hint: ${hint}` : '';

    return `Generate a unique competitive programming problem suitable for a coding contest.

Requirements:
- Difficulty: ${difficulty}
- Topics/Tags: ${tagsList}${hintText}
- The problem should be original and engaging
- Include clear input/output specifications
- Provide comprehensive test cases

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "title": "Problem Title",
  "description": "Detailed problem statement with constraints and examples",
  "difficulty": "${difficulty}",
  "points": <integer based on difficulty: easy=100, medium=200, hard=300>,
  "tags": ["tag1", "tag2"],
  "sampleInput": "Example input as string",
  "sampleOutput": "Example output as string",
  "testCases": [
    {
      "input": {"param1": "value1"},
      "output": "expected output",
      "explanation": "why this is the answer"
    }
  ],
  "timeLimitMs": <reasonable time limit in milliseconds>,
  "memoryLimitMb": <reasonable memory limit in MB>
}

Generate at least 5 diverse test cases covering edge cases, normal cases, and boundary conditions.`;
  }

  /**
   * Parse and validate Gemini's response
   */
  _parseProblemResponse(responseText) {
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedText = responseText.trim();

      // Remove code block fences if present (either ```json ... ``` or just ```)
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/```$/, '').trim();
      }

      const problemData = JSON.parse(cleanedText);

      // Validate required fields
      const required = ['title', 'description', 'difficulty', 'testCases'];
      for (const field of required) {
        if (!problemData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Set defaults for optional fields
      problemData.points = problemData.points || this._getPointsByDifficulty(problemData.difficulty);
      problemData.tags = problemData.tags || [];
      problemData.timeLimitMs = problemData.timeLimitMs || 2000;
      problemData.memoryLimitMb = problemData.memoryLimitMb || 256;

      return problemData;

    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.log('Raw AI output length:', responseText.length);
      console.log('Raw AI output preview:', responseText.substring(0, 500));
      console.log('Raw AI output ending:', responseText.substring(Math.max(0, responseText.length - 200)));
      throw new Error('Invalid response format from AI');
    }
  }

  /**
   * Get default points based on difficulty
   */
  _getPointsByDifficulty(difficulty) {
    const pointsMap = {
      easy: 100,
      medium: 200,
      hard: 300,
    };
    return pointsMap[difficulty] || 200;
  }

  /**
   * Generate hints for a specific problem
   */
  async generateHints(problemDescription) {
    try {
      const prompt = `Given this coding problem:

${problemDescription}

Generate 3 progressive hints that help solve the problem without giving away the complete solution.
Return as JSON array: ["hint1", "hint2", "hint3"]`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      const response = result.response.text();
      const hints = JSON.parse(response.replace(/``````$/, ''));

      return { success: true, hints };

    } catch (error) {
      console.error('Hint generation error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new GeminiService();
