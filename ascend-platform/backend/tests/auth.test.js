// backend/tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock test (basic structure - requires jest setup)
const API_URL = 'http://localhost:5000/api';

describe('Authentication System', () => {
  let authToken = null;
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test@123456',
    displayName: 'Test User'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(testUser.username);
      expect(data.token).toBeDefined();
      
      authToken = data.token;
    });

    it('should reject duplicate username', async () => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      expect(response.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'new@example.com',
          password: 'weak'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUser.username,
          password: testUser.password
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(data.user.username).toBe(testUser.username);
    });

    it('should reject invalid password', async () => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUser.username,
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get profile with valid token', async () => {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.username).toBe(testUser.username);
      expect(data.stats).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${API_URL}/auth/profile`);
      expect(response.status).toBe(401);
    });
  });
});
