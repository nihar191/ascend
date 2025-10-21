// backend/scripts/testJudge0.js
import judgeService from '../services/judge.service.js';

async function testJudge0() {
  console.log('🧪 Testing Judge0 Integration...\n');

  // Test case 1: Simple JavaScript solution
  const testSubmission = {
    code: `
function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}

// Test the function
const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);
console.log(result);
`,
    language: 'javascript',
    problemId: 'test',
    testCases: [
      {
        input: '',
        output: '[0,1]'
      }
    ]
  };

  try {
    console.log('📤 Submitting test code...');
    const result = await judgeService.executeCode(testSubmission);
    
    console.log('✅ Execution completed!');
    console.log('Status:', result.status);
    console.log('Score:', result.score);
    console.log('Test Results:', result.testResults);
    console.log('Execution Time:', result.executionTimeMs, 'ms');
    console.log('Memory Used:', result.memoryUsedKb, 'KB');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testJudge0();
}

export default testJudge0;