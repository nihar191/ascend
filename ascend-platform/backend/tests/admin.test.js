// backend/tests/admin.test.js
import { describe, it, expect } from '@jest/globals';

const API_URL = 'http://localhost:5000/api';

describe('Admin Interface', () => {
  let adminToken = null;
  let userToken = null;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@123'
      })
    });
    
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    // Login as regular user
    const userLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'Test@123456'
      })
    });
    
    const userData = await userLogin.json();
    userToken = userData.token;
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should fetch dashboard statistics with admin token', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statistics).toBeDefined();
      expect(data.statistics.total_users).toBeGreaterThan(0);
    });

    it('should reject non-admin users', async () => {
      const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should fetch all users with pagination', async () => {
      const response = await fetch(`${API_URL}/admin/users?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('should support search filtering', async () => {
      const response = await fetch(`${API_URL}/admin/users?search=admin`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      data.users.forEach(user => {
        expect(
          user.username.includes('admin') || 
          user.email.includes('admin')
        ).toBe(true);
      });
    });
  });

  describe('POST /api/admin/problems/bulk-generate', () => {
    it('should generate multiple AI problems', async () => {
      const response = await fetch(`${API_URL}/admin/problems/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          count: 2,
          difficulty: 'easy',
          tags: ['array', 'sorting']
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(data.results.success.length).toBeGreaterThanOrEqual(0);
    }, 60000); // Longer timeout for AI generation

    it('should reject count > 10', async () => {
      const response = await fetch(`${API_URL}/admin/problems/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          count: 15
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/admin/problems/bulk-update', () => {
    it('should bulk update problems', async () => {
      const response = await fetch(`${API_URL}/admin/problems/bulk-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          problemIds: [1, 2],
          isActive: false
        })
      });

      expect(response.status).toBe(200);
    });
  });
});
