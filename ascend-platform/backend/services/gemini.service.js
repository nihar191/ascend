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
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
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

    return `Generate a competitive programming problem. Difficulty: ${difficulty}, Topics: ${tagsList}${hintText}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no extra text.

{
  "title": "Problem Title",
  "description": "Problem statement with constraints. Keep description concise.",
  "difficulty": "${difficulty}",
  "points": ${difficulty === 'easy' ? 100 : difficulty === 'medium' ? 200 : 300},
  "tags": ["${tags.length > 0 ? tags[0] : 'array'}"],
  "sampleInput": "5\\n1 2 3 4 5",
  "sampleOutput": "15",
  "testCases": [
    {
      "input": "3\\n1 2 3",
      "output": "6",
      "explanation": "Sum of array elements"
    },
    {
      "input": "1\\n42",
      "output": "42",
      "explanation": "Single element"
    },
    {
      "input": "0\\n",
      "output": "0",
      "explanation": "Empty array"
    }
  ],
  "timeLimitMs": 2000,
  "memoryLimitMb": 256
}

Generate exactly 3-5 test cases. Keep all strings simple and avoid special characters.`;
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

      // Clean up common JSON issues
      cleanedText = this._cleanJsonString(cleanedText);

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
      
      // Try to extract JSON from the response using regex
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = this._cleanJsonString(jsonMatch[0]);
          const problemData = JSON.parse(extractedJson);
          
          // Validate required fields
          const required = ['title', 'description', 'difficulty', 'testCases'];
          for (const field of required) {
            if (!problemData[field]) {
              throw new Error(`Missing required field: ${field}`);
            }
          }
          
          // Set defaults
          problemData.points = problemData.points || this._getPointsByDifficulty(problemData.difficulty);
          problemData.tags = problemData.tags || [];
          problemData.timeLimitMs = problemData.timeLimitMs || 2000;
          problemData.memoryLimitMb = problemData.memoryLimitMb || 256;
          
          console.log('Successfully extracted JSON from malformed response');
          return problemData;
        }
      } catch (extractError) {
        console.error('Failed to extract JSON:', extractError);
      }
      
      throw new Error('Invalid response format from AI');
    }
  }

  /**
   * Clean JSON string to fix common issues
   */
  _cleanJsonString(jsonString) {
    // Remove control characters except newlines and tabs
    let cleaned = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Fix common JSON issues
    cleaned = cleaned
      // Fix unescaped quotes in strings
      .replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":')
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between properties
      .replace(/"\s*\n\s*"/g, '",\n"')
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Remove any text before the first {
      .replace(/^[^{]*/, '')
      // Remove any text after the last }
      .replace(/[^}]*$/, '');
    
    return cleaned;
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
