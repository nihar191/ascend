// backend/scripts/testJudge0.js
import judgeService from '../services/judge.service.js';

async function testJudge0() {
  console.log('🧪 Testing Judge0 Integration\n');

  // Test Case 1: JavaScript Two Sum
  const testCase1 = {
    code: `
const input = require('fs').readFileSync(0, 'utf-8').trim();
const data = JSON.parse(input);
const nums = data.nums;
const target = data.target;

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(JSON.stringify(twoSum(nums, target)));
    `,
    language: 'javascript',
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, output: '[0,1]' },
      { input: { nums: [3, 2, 4], target: 6 }, output: '[1,2]' },
    ],
  };

  console.log('Test 1: JavaScript Two Sum');
  const result1 = await judgeService.executeCode(testCase1);
  console.log('Result:', result1.status);
  console.log('Passed:', result1.passedTests, '/', result1.totalTests);
  console.log('Score:', result1.score);
  console.log('---\n');

  // Test Case 2: Python Hello World
  const testCase2 = {
    code: `
name = input()
print(f"Hello, {name}!")
    `,
    language: 'python',
    testCases: [
      { input: 'Alice', output: 'Hello, Alice!' },
      { input: 'Bob', output: 'Hello, Bob!' },
    ],
  };

  console.log('Test 2: Python Hello World');
  const result2 = await judgeService.executeCode(testCase2);
  console.log('Result:', result2.status);
  console.log('Passed:', result2.passedTests, '/', result2.totalTests);
  console.log('---\n');

  // Test Case 3: Compilation Error
  const testCase3 = {
    code: `
int main() {
  printf("Missing include");
  return 0;
}
    `,
    language: 'c',
    testCases: [
      { input: '', output: 'Missing include' },
    ],
  };

  console.log('Test 3: C Compilation Error');
  const result3 = await judgeService.executeCode(testCase3);
  console.log('Result:', result3.status);
  console.log('---\n');

  // Get supported languages
  console.log('Supported Languages:');
  const languages = judgeService.getSupportedLanguages();
  languages.forEach(lang => {
    console.log(`- ${lang.name} (ID: ${lang.judge0Id})`);
  });
}

testJudge0().catch(console.error).finally(() => process.exit(0));
