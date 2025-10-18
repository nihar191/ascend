// backend/scripts/seedAIProblems.js
import dotenv from 'dotenv';
import geminiService from '../services/gemini.service.js';
import Problem from '../models/Problem.js';

dotenv.config();

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
        } else {
          console.log(`  ✗ Failed: ${result.error}`);
        }

        // Wait 2 seconds between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ✗ Error:`, error.message);
      }
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
