// backend/tests/matchmaking.test.js
import { describe, it, expect } from '@jest/globals';

const API_URL = 'http://localhost:5000/api';

describe('Matchmaking System', () => {
  let userToken = null;

  beforeAll(async () => {
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `mm_test_${Date.now()}`,
        email: `mmtest_${Date.now()}@example.com`,
        password: 'Test@123456',
      })
    });
    
    const data = await registerRes.json();
    userToken = data.token;
  });

  describe('GET /api/matches/queue/stats', () => {
    it('should fetch queue statistics', async () => {
      const response = await fetch(`${API_URL}/matches/queue/stats`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data['1v1']).toBeDefined();
      expect(data['1v1'].playersInQueue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/matches/queue/join', () => {
    it('should allow joining matchmaking queue', async () => {
      const response = await fetch(`${API_URL}/matches/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          matchType: '1v1',
          preferences: { difficulty: 'medium' }
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.queuePosition).toBeGreaterThan(0);
    });

    it('should reject invalid match type', async () => {
      const response = await fetch(`${API_URL}/matches/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          matchType: 'invalid'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/matches/queue/status', () => {
    it('should get user queue status', async () => {
      const response = await fetch(`${API_URL}/matches/queue/status`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inQueue).toBeDefined();
    });
  });

  describe('POST /api/matches/queue/leave', () => {
    it('should allow leaving queue', async () => {
      const response = await fetch(`${API_URL}/matches/queue/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/matches/active', () => {
    it('should fetch user active matches', async () => {
      const response = await fetch(`${API_URL}/matches/active`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matches).toBeDefined();
      expect(Array.isArray(data.matches)).toBe(true);
    });
  });
});
