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

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no extra text. NO NEWLINES in description field.

{
  "title": "Problem Title",
  "description": "Problem statement with constraints. Use \\n for line breaks. Keep description concise.",
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

Generate exactly 3-5 test cases. Use \\n for line breaks in all strings. No actual newlines.`;
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
        
        // Last resort: try to manually parse the response
        try {
          const manualData = this._manualParseResponse(responseText);
          if (manualData) {
            console.log('Successfully parsed response manually');
            return manualData;
          }
        } catch (manualError) {
          console.error('Manual parsing also failed:', manualError);
        }
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
    
    // Fix unescaped newlines in string values
    cleaned = this._fixUnescapedNewlines(cleaned);
    
    return cleaned;
  }

  /**
   * Fix unescaped newlines in JSON string values
   */
  _fixUnescapedNewlines(jsonString) {
    // More robust approach: find all string values and properly escape them
    let result = '';
    let i = 0;
    
    while (i < jsonString.length) {
      if (jsonString[i] === '"') {
        // Found start of string, find the end
        let stringStart = i;
        i++; // Skip opening quote
        
        while (i < jsonString.length) {
          if (jsonString[i] === '"' && jsonString[i-1] !== '\\') {
            // Found end of string
            let stringContent = jsonString.substring(stringStart + 1, i);
            
            // Escape the content
            const escaped = stringContent
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
            
            result += `"${escaped}"`;
            i++; // Skip closing quote
            break;
          }
          i++;
        }
      } else {
        result += jsonString[i];
        i++;
      }
    }
    
    return result;
  }

  /**
   * Manual parsing as last resort when JSON parsing fails
   */
  _manualParseResponse(responseText) {
    try {
      // Extract key fields using regex patterns
      const titleMatch = responseText.match(/"title":\s*"([^"]+)"/);
      const descriptionMatch = responseText.match(/"description":\s*"([^"]+(?:\\n[^"]*)*)"/);
      const difficultyMatch = responseText.match(/"difficulty":\s*"([^"]+)"/);
      const pointsMatch = responseText.match(/"points":\s*(\d+)/);
      
      if (!titleMatch || !descriptionMatch || !difficultyMatch) {
        return null;
      }

      const title = titleMatch[1];
      const description = descriptionMatch[1].replace(/\\n/g, '\n');
      const difficulty = difficultyMatch[1];
      const points = pointsMatch ? parseInt(pointsMatch[1]) : this._getPointsByDifficulty(difficulty);

      // Extract test cases
      const testCases = [];
      const testCaseMatches = responseText.match(/"testCases":\s*\[([\s\S]*?)\]/);
      if (testCaseMatches) {
        const testCaseText = testCaseMatches[1];
        const inputMatches = testCaseText.match(/"input":\s*"([^"]+)"/g);
        const outputMatches = testCaseText.match(/"output":\s*"([^"]+)"/g);
        
        if (inputMatches && outputMatches) {
          for (let i = 0; i < Math.min(inputMatches.length, outputMatches.length); i++) {
            const input = inputMatches[i].match(/"input":\s*"([^"]+)"/)[1];
            const output = outputMatches[i].match(/"output":\s*"([^"]+)"/)[1];
            testCases.push({
              input: input.replace(/\\n/g, '\n'),
              output: output.replace(/\\n/g, '\n'),
              explanation: `Test case ${i + 1}`
            });
          }
        }
      }

      // If no test cases found, create a simple one
      if (testCases.length === 0) {
        testCases.push({
          input: "1\n1",
          output: "1",
          explanation: "Simple test case"
        });
      }

      return {
        title,
        description,
        difficulty,
        points,
        tags: ['array'],
        sampleInput: testCases[0]?.input || "1\n1",
        sampleOutput: testCases[0]?.output || "1",
        testCases,
        timeLimitMs: 2000,
        memoryLimitMb: 256
      };
    } catch (error) {
      console.error('Manual parsing error:', error);
      return null;
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
