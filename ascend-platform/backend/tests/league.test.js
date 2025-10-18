// backend/tests/league.test.js
import { describe, it, expect } from '@jest/globals';

const API_URL = 'http://localhost:5000/api';

describe('League & Season System', () => {
  let userToken = null;

  beforeAll(async () => {
    // Register and login test user
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `league_test_${Date.now()}`,
        email: `leaguetest_${Date.now()}@example.com`,
        password: 'Test@123456',
      })
    });
    
    const data = await registerRes.json();
    userToken = data.token;
  });

  describe('GET /api/leagues', () => {
    it('should fetch all leagues', async () => {
      const response = await fetch(`${API_URL}/leagues`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leagues).toBeDefined();
      expect(Array.isArray(data.leagues)).toBe(true);
      expect(data.leagues.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/leagues/:id', () => {
    it('should fetch single league with seasons', async () => {
      const response = await fetch(`${API_URL}/leagues/1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.seasons).toBeDefined();
      expect(data.stats).toBeDefined();
    });
  });

  describe('POST /api/leagues/seasons/:seasonId/join', () => {
    it('should allow authenticated user to join season', async () => {
      const response = await fetch(`${API_URL}/leagues/seasons/1/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      expect([200, 201]).toContain(response.status);
    });

    it('should reject unauthenticated join request', async () => {
      const response = await fetch(`${API_URL}/leagues/seasons/1/join`, {
        method: 'POST'
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/leagues/seasons/:seasonId/leaderboard', () => {
    it('should fetch season leaderboard', async () => {
      const response = await fetch(`${API_URL}/leagues/seasons/1/leaderboard`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toBeDefined();
      expect(Array.isArray(data.leaderboard)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await fetch(`${API_URL}/leagues/seasons/1/leaderboard?page=1&limit=10`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/leagues/top-performers', () => {
    it('should fetch global top performers', async () => {
      const response = await fetch(`${API_URL}/leagues/top-performers?limit=5`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topPerformers).toBeDefined();
      expect(data.topPerformers.length).toBeLessThanOrEqual(5);
    });
  });
});
