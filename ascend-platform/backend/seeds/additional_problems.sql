-- backend/seeds/additional_problems.sql
-- Additional sample problems for testing

INSERT INTO problems (
  title, slug, description, difficulty, points, 
  sample_input, sample_output, test_cases, is_active, tags
) VALUES 
(
  'Longest Increasing Subsequence',
  'longest-increasing-subsequence',
  'Given an integer array nums, return the length of the longest strictly increasing subsequence.

A subsequence is a sequence that can be derived from an array by deleting some or no elements without changing the order of the remaining elements.

Example 1:
Input: nums = [10,9,2,5,3,7,101,18]
Output: 4
Explanation: The longest increasing subsequence is [2,3,7,18], therefore the length is 4.

Example 2:
Input: nums = [0,1,0,3,2,3]
Output: 4

Constraints:
- 1 <= nums.length <= 2500
- -10^4 <= nums[i] <= 10^4',
  'hard',
  300,
  '[10,9,2,5,3,7,101,18]',
  '4',
  '[
    {"input": {"nums": [10,9,2,5,3,7,101,18]}, "output": 4},
    {"input": {"nums": [0,1,0,3,2,3]}, "output": 4},
    {"input": {"nums": [7,7,7,7,7,7,7]}, "output": 1}
  ]'::jsonb,
  true,
  ARRAY['dynamic-programming', 'binary-search']
),
(
  'Two Sum Problem',
  'two-sum-problem',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9',
  'medium',
  200,
  '[2,7,11,15], target = 9',
  '[0,1]',
  '[
    {"input": {"nums": [2,7,11,15], "target": 9}, "output": [0,1]},
    {"input": {"nums": [3,2,4], "target": 6}, "output": [1,2]},
    {"input": {"nums": [3,3], "target": 6}, "output": [0,1]}
  ]'::jsonb,
  true,
  ARRAY['array', 'hash-table']
),
(
  'Valid Parentheses',
  'valid-parentheses',
  'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "()[]{}"
Output: true

Example 3:
Input: s = "(]"
Output: false

Constraints:
- 1 <= s.length <= 10^4
- s consists of parentheses only ''()[]{}''.',
  'easy',
  100,
  '"()"',
  'true',
  '[
    {"input": {"s": "()"}, "output": true},
    {"input": {"s": "()[]{}"}, "output": true},
    {"input": {"s": "(]"}, "output": false},
    {"input": {"s": "([)]"}, "output": false},
    {"input": {"s": "{[]}"}, "output": true}
  ]'::jsonb,
  true,
  ARRAY['string', 'stack']
),
(
  'Maximum Subarray',
  'maximum-subarray',
  'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous part of an array.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.

Example 2:
Input: nums = [1]
Output: 1

Example 3:
Input: nums = [5,4,-1,7,8]
Output: 23

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4',
  'medium',
  200,
  '[-2,1,-3,4,-1,2,1,-5,4]',
  '6',
  '[
    {"input": {"nums": [-2,1,-3,4,-1,2,1,-5,4]}, "output": 6},
    {"input": {"nums": [1]}, "output": 1},
    {"input": {"nums": [5,4,-1,7,8]}, "output": 23},
    {"input": {"nums": [-1]}, "output": -1}
  ]'::jsonb,
  true,
  ARRAY['array', 'divide-and-conquer', 'dynamic-programming']
),
(
  'Binary Tree Inorder Traversal',
  'binary-tree-inorder-traversal',
  'Given the root of a binary tree, return the inorder traversal of its nodes'' values.

Inorder traversal: Left -> Root -> Right

Example 1:
Input: root = [1,null,2,3]
Output: [1,3,2]

Example 2:
Input: root = []
Output: []

Example 3:
Input: root = [1]
Output: [1]

Constraints:
- The number of nodes in the tree is in the range [0, 100].
- -100 <= Node.val <= 100',
  'easy',
  150,
  '[1,null,2,3]',
  '[1,3,2]',
  '[
    {"input": {"root": [1,null,2,3]}, "output": [1,3,2]},
    {"input": {"root": []}, "output": []},
    {"input": {"root": [1]}, "output": [1]},
    {"input": {"root": [1,2]}, "output": [2,1]},
    {"input": {"root": [1,null,2]}, "output": [1,2]}
  ]'::jsonb,
  true,
  ARRAY['stack', 'tree', 'depth-first-search']
)
ON CONFLICT (slug) DO NOTHING;
