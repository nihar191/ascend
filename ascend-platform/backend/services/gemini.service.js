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
      temperature: 0.3,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,
    };
  }

  /**
   * Generate a coding problem with test cases
   */
  async generateProblem({ difficulty = 'medium', tags = [], hint = '' }) {
    try {
      const prompt = this._buildProblemPrompt(difficulty, tags, hint);
      
      console.log('🤖 Sending request to Gemini API...');
      console.log('📝 Prompt length:', prompt.length);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      const response = result.response;
      const problemText = response.text();
      
      console.log('📥 Received response from Gemini');
      console.log('📏 Response length:', problemText.length);

      // Parse the JSON response from Gemini
      const problemData = this._parseProblemResponse(problemText);
      
      return {
        success: true,
        problem: problemData,
      };

    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      console.error('🔍 Error type:', error.constructor.name);
      
      // Check if it's an API key issue
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        console.error('🔑 Possible API key issue - check GEMINI_API_KEY');
      }
      
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

    return `Create a competitive programming problem.

Difficulty: ${difficulty}
Topics: ${tagsList}${hintText}

Return ONLY this JSON format (no markdown, no extra text):

{
  "title": "Problem Name",
  "description": "Problem description here",
  "difficulty": "${difficulty}",
  "points": ${difficulty === 'easy' ? 100 : difficulty === 'medium' ? 200 : 300},
  "tags": ["${tags.length > 0 ? tags[0] : 'array'}"],
  "sampleInput": "3\\n1 2 3",
  "sampleOutput": "6",
  "testCases": [
    {
      "input": "3\\n1 2 3",
      "output": "6",
      "explanation": "Test case 1"
    }
  ],
  "timeLimitMs": 2000,
  "memoryLimitMb": 256
}`;
  }

  /**
   * Parse and validate Gemini's response with robust error handling
   */
  _parseProblemResponse(responseText) {
    try {
      // Step 1: Clean up response
      let cleanedText = responseText.trim();

      // Remove markdown code blocks
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

      // Step 2: Fix JSON formatting issues BEFORE parsing
      cleanedText = this._fixJsonFormatting(cleanedText);

      // Step 3: Try to parse
      const problemData = JSON.parse(cleanedText);

      // Step 4: Validate and set defaults
      return this._validateAndSetDefaults(problemData);

    } catch (error) {
      console.error('Failed to parse Gemini response:', error.message);
      console.log('Raw AI output length:', responseText.length);
      console.log('Raw AI output preview:', responseText.substring(0, 500));
      
      // Fallback: Try extracting JSON with regex
      try {
        const extracted = this._extractJsonFromText(responseText);
        if (extracted) {
          console.log('✓ Successfully extracted JSON from malformed response');
          return this._validateAndSetDefaults(extracted);
        }
      } catch (extractError) {
        console.error('JSON extraction failed:', extractError.message);
      }
      
      // Last resort: Manual parsing
      try {
        const manual = this._manualParseResponse(responseText);
        if (manual) {
          console.log('✓ Successfully parsed response manually');
          return this._validateAndSetDefaults(manual);
        }
      } catch (manualError) {
        console.error('Manual parsing failed:', manualError.message);
      }
      
      throw new Error('Invalid response format from AI');
    }
  }

  /**
   * Fix JSON formatting issues - THE KEY FIX
   */
  _fixJsonFormatting(jsonString) {
    // Remove any text before first { and after last }
    jsonString = jsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

    // Fix actual newlines in string values by replacing them with \n
    // This is the critical fix for "Bad control character" errors
    let inString = false;
    let escaped = false;
    let result = '';
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (char === '\\' && !escaped) {
        escaped = true;
        result += char;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
        result += char;
        escaped = false;
        continue;
      }
      
      // Replace actual newlines with \n when inside strings
      if (inString && (char === '\n' || char === '\r')) {
        if (char === '\n') {
          result += '\\n';
        }
        escaped = false;
        continue;
      }
      
      // Remove other control characters when inside strings
      if (inString && char.charCodeAt(0) < 32 && char !== '\t') {
        escaped = false;
        continue;
      }
      
      result += char;
      escaped = false;
    }
    
    // Additional cleanup
    result = result
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
      .replace(/"(\s+)"/g, '""')       // Fix spaces between quotes
      .trim();
    
    return result;
  }

  /**
   * Extract JSON from text with regex
   */
  _extractJsonFromText(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const cleaned = this._fixJsonFormatting(jsonMatch[0]);
    return JSON.parse(cleaned);
  }

  /**
   * Manual parsing as last resort
   */
  _manualParseResponse(responseText) {
    // Extract key fields using regex
    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
    const difficultyMatch = responseText.match(/"difficulty"\s*:\s*"([^"]+)"/);
    const pointsMatch = responseText.match(/"points"\s*:\s*(\d+)/);
    
    // Extract description (more complex due to possible newlines)
    let description = '';
    const descMatch = responseText.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (descMatch) {
      description = descMatch[1].replace(/\\n/g, '\n');
    }
    
    if (!titleMatch || !difficultyMatch) {
      return null;
    }

    // Extract test cases
    const testCases = [];
    const testCaseSection = responseText.match(/"testCases"\s*:\s*\[([\s\S]*?)\]/);
    
    if (testCaseSection) {
      const cases = testCaseSection[1].match(/\{[^}]+\}/g);
      if (cases) {
        cases.forEach((caseStr, idx) => {
          const inputMatch = caseStr.match(/"input"\s*:\s*"([^"]*)"/);
          const outputMatch = caseStr.match(/"output"\s*:\s*"([^"]*)"/);
          const explanationMatch = caseStr.match(/"explanation"\s*:\s*"([^"]*)"/);
          
          if (inputMatch && outputMatch) {
            testCases.push({
              input: inputMatch[1].replace(/\\n/g, '\n'),
              output: outputMatch[1].replace(/\\n/g, '\n'),
              explanation: explanationMatch ? explanationMatch[1] : `Test case ${idx + 1}`
            });
          }
        });
      }
    }

    // Fallback test case
    if (testCases.length === 0) {
      testCases.push({
        input: "1\n1",
        output: "1",
        explanation: "Simple test case"
      });
    }

    return {
      title: titleMatch[1],
      description: description || 'Problem description',
      difficulty: difficultyMatch[1],
      points: pointsMatch ? parseInt(pointsMatch[1]) : this._getPointsByDifficulty(difficultyMatch[1]),
      tags: ['array'],
      sampleInput: testCases[0]?.input || "1\n1",
      sampleOutput: testCases[0]?.output || "1",
      testCases,
      timeLimitMs: 2000,
      memoryLimitMb: 256
    };
  }

  /**
   * Validate and set defaults for parsed data
   */
  _validateAndSetDefaults(problemData) {
    // Validate required fields
    const required = ['title', 'description', 'difficulty', 'testCases'];
    for (const field of required) {
      if (!problemData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Set defaults
    return {
      ...problemData,
      points: problemData.points || this._getPointsByDifficulty(problemData.difficulty),
      tags: problemData.tags || ['array'],
      timeLimitMs: problemData.timeLimitMs || 2000,
      memoryLimitMb: problemData.memoryLimitMb || 256,
      sampleInput: problemData.sampleInput || problemData.testCases[0]?.input || '',
      sampleOutput: problemData.sampleOutput || problemData.testCases[0]?.output || ''
    };
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
Return ONLY a JSON array with no markdown: ["hint1", "hint2", "hint3"]`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      const response = result.response.text();
      const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      const hints = JSON.parse(cleaned);

      return { success: true, hints };

    } catch (error) {
      console.error('Hint generation error:', error);
      return { 
        success: false, 
        error: error.message,
        hints: ['Think about the problem constraints', 'Consider edge cases', 'Try to optimize your approach']
      };
    }
  }
}

export default new GeminiService();