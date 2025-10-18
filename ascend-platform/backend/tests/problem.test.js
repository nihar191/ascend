// backend/tests/problem.test.js
import { describe, it, expect } from '@jest/globals';

const API_URL = 'http://localhost:5000/api';

describe('Problem Management', () => {
  let adminToken = null;

  beforeAll(async () => {
    // Login as admin
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@123'
      })
    });
    
    const data = await response.json();
    adminToken = data.token;
  });

  describe('GET /api/problems', () => {
    it('should fetch all problems', async () => {
      const response = await fetch(`${API_URL}/problems`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.problems).toBeDefined();
      expect(Array.isArray(data.problems)).toBe(true);
    });

    it('should filter by difficulty', async () => {
      const response = await fetch(`${API_URL}/problems?difficulty=easy`);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.problems.forEach(problem => {
        expect(problem.difficulty).toBe('easy');
      });
    });
  });

  describe('POST /api/problems', () => {
    it('should create problem with admin token', async () => {
      const newProblem = {
        title: 'Test Problem',
        description: 'This is a test problem description that is sufficiently long.',
        difficulty: 'easy',
        points: 100,
        tags: ['test', 'array'],
        sampleInput: '[1,2,3]',
        sampleOutput: '6',
        testCases: [
          { input: [1,2,3], output: 6 }
        ]
      };

      const response = await fetch(`${API_URL}/problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newProblem)
      });

      expect(response.status).toBe(201);
    });

    it('should reject creation without admin token', async () => {
      const response = await fetch(`${API_URL}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/problems/generate', () => {
    it('should generate AI problem with admin token', async () => {
      const response = await fetch(`${API_URL}/problems/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          difficulty: 'medium',
          tags: ['array', 'sorting']
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.problem).toBeDefined();
      expect(data.aiGenerated).toBe(true);
    }, 30000); // Longer timeout for AI generation
  });
});
