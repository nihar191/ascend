// backend/scripts/seedAIProblems.js
import dotenv from 'dotenv';
import geminiService from '../services/gemini.service.js';
import Problem from '../models/Problem.js';

dotenv.config();

/**
 * Create a fallback problem when AI generation fails
 */
async function createFallbackProblem(difficulty, tags) {
  const fallbackProblems = {
    easy: {
      title: `Array Sum Problem`,
      description: `Given an array of integers, find the sum of all elements.

Constraints:
- 1 ≤ n ≤ 1000
- -1000 ≤ arr[i] ≤ 1000

Input: First line contains n, second line contains n integers.
Output: Print the sum of all elements.`,
      points: 100,
      sampleInput: `5
1 2 3 4 5`,
      sampleOutput: `15`,
      testCases: [
        { input: `3\n1 2 3`, output: `6`, explanation: `Sum of 1+2+3` },
        { input: `1\n42`, output: `42`, explanation: `Single element` },
        { input: `4\n-1 2 -3 4`, output: `2`, explanation: `Sum with negatives` }
      ]
    },
    medium: {
      title: `Two Sum Problem`,
      description: `Given an array of integers and a target sum, find two numbers that add up to the target.

Constraints:
- 2 ≤ n ≤ 1000
- -1000 ≤ arr[i] ≤ 1000
- -2000 ≤ target ≤ 2000

Input: First line contains n, second line contains n integers, third line contains target.
Output: Print the indices of the two numbers (1-indexed).`,
      points: 200,
      sampleInput: `4
2 7 11 15
9`,
      sampleOutput: `1 2`,
      testCases: [
        { input: `4\n2 7 11 15\n9`, output: `1 2`, explanation: `2+7=9` },
        { input: `3\n3 2 4\n6`, output: `2 3`, explanation: `2+4=6` },
        { input: `2\n3 3\n6`, output: `1 2`, explanation: `3+3=6` }
      ]
    },
    hard: {
      title: `Longest Increasing Subsequence`,
      description: `Given an array of integers, find the length of the longest increasing subsequence.

Constraints:
- 1 ≤ n ≤ 1000
- -1000 ≤ arr[i] ≤ 1000

Input: First line contains n, second line contains n integers.
Output: Print the length of the longest increasing subsequence.`,
      points: 300,
      sampleInput: `6
10 9 2 5 3 7`,
      sampleOutput: `3`,
      testCases: [
        { input: `6\n10 9 2 5 3 7`, output: `3`, explanation: `[2,3,7] or [2,5,7]` },
        { input: `1\n1`, output: `1`, explanation: `Single element` },
        { input: `5\n5 4 3 2 1`, output: `1`, explanation: `All decreasing` }
      ]
    }
  };

  const problem = fallbackProblems[difficulty];
  const slug = `${difficulty}-fallback-${Date.now()}`;

  await Problem.create({
    title: problem.title,
    slug,
    description: problem.description,
    difficulty,
    points: problem.points,
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    tags: tags.length > 0 ? tags : ['array'],
    sampleInput: problem.sampleInput,
    sampleOutput: problem.sampleOutput,
    testCases: problem.testCases,
    authorId: 1,
    isAiGenerated: false,
  });

  console.log(`  ✓ Created fallback: ${problem.title}`);
}

/**
 * Generate and seed AI problems for each difficulty
 */
async function seedAIProblems() {
  const difficulties = ['easy', 'medium', 'hard'];
  const tagSets = [
    ['array', 'sorting'],
    ['dynamic-programming', 'recursion'],
    ['graph', 'bfs'],
    ['string', 'hash-table'],
    ['tree', 'binary-search'],
  ];

  console.log('🤖 Starting AI problem generation...\n');

  for (const difficulty of difficulties) {
    console.log(`Generating ${difficulty} problems...`);

    for (let i = 0; i < 2; i++) {
      const tags = tagSets[Math.floor(Math.random() * tagSets.length)];

      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        attempts++;
        
        try {
          const result = await geminiService.generateProblem({
            difficulty,
            tags,
          });

          if (result.success) {
            const generatedProblem = result.problem;

            // Generate unique slug
            let slug = generatedProblem.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-');

            let counter = 1;
            while (await Problem.slugExists(slug)) {
              slug = `${slug}-${counter}`;
              counter++;
            }

            await Problem.create({
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
              authorId: 1, // Admin user
              isAiGenerated: true,
            });

            console.log(`  ✓ Generated: ${generatedProblem.title}`);
            success = true;
          } else {
            console.log(`  ✗ Attempt ${attempts} failed: ${result.error}`);
            if (attempts < maxAttempts) {
              console.log(`  🔄 Retrying...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }

        } catch (error) {
          console.error(`  ✗ Attempt ${attempts} error:`, error.message);
          if (attempts < maxAttempts) {
            console.log(`  🔄 Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }

      if (!success) {
        console.log(`  ⚠️  All attempts failed, creating fallback problem...`);
        await createFallbackProblem(difficulty, tags);
      }

      // Wait 2 seconds between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('');
  }

  console.log('✓ AI problem seeding completed!\n');
  process.exit(0);
}

seedAIProblems().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
