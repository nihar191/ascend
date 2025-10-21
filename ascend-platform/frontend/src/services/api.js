// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

export const problemsAPI = {
  getAll: (params) => api.get('/problems', { params }),
  getOne: (id) => api.get(`/problems/${id}`),
  getRandom: (difficulty) => api.get('/problems/random', { params: { difficulty } }),
};

export const leaguesAPI = {
  getAll: () => api.get('/leagues'),
  getLeaderboard: (seasonId, params) => api.get(`/leagues/seasons/${seasonId}/leaderboard`, { params }),
  getGlobalLeaderboard: (params) => api.get('/leagues/global-leaderboard', { params }),
  joinSeason: (seasonId) => api.post(`/leagues/seasons/${seasonId}/join`),
  // Admin only
  createLeague: (data) => api.post('/leagues', data),
  createSeason: (data) => api.post('/leagues/seasons', data),
};

export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getSystemLogs: (params) => api.get('/admin/logs', { params }),
  
  // User Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  banUser: (id, data) => api.post(`/admin/users/${id}/ban`, data),
  resetUserStats: (id) => api.post(`/admin/users/${id}/reset-stats`),
  bulkUpdateUsers: (data) => api.patch('/admin/users/bulk-update', data),
  
  // League Management
  getAllLeagues: (params) => api.get('/admin/leagues', { params }),
  createLeague: (data) => api.post('/admin/leagues', data),
  updateLeague: (id, data) => api.patch(`/admin/leagues/${id}`, data),
  deleteLeague: (id) => api.delete(`/admin/leagues/${id}`),
  createSeason: (leagueId, data) => api.post(`/admin/leagues/${leagueId}/seasons`, data),
  updateSeason: (id, data) => api.patch(`/admin/seasons/${id}`, data),
  
  // Problem Management
  getAllProblems: (params) => api.get('/admin/problems', { params }),
  getProblemDetails: (id) => api.get(`/admin/problems/${id}`),
  createProblem: (data) => api.post('/admin/problems', data),
  updateProblem: (id, data) => api.patch(`/admin/problems/${id}`, data),
  deleteProblem: (id) => api.delete(`/admin/problems/${id}`),
  bulkGenerateProblems: (data) => api.post('/admin/problems/bulk-generate', data),
  bulkUpdateProblems: (data) => api.patch('/admin/problems/bulk-update', data),
  bulkDeleteProblems: (data) => api.delete('/admin/problems/bulk-delete', data),
  
  // Match Management
  getAllMatches: (params) => api.get('/admin/matches', { params }),
  forceEndMatch: (id) => api.post(`/admin/matches/${id}/force-end`),
  
  // Platform Settings
  updatePlatformSettings: (data) => api.patch('/admin/settings', data),
};

export const matchesAPI = {
  joinQueue: (data) => api.post('/matches/queue/join', data),
  leaveQueue: () => api.post('/matches/queue/leave'),
  getQueueStatus: () => api.get('/matches/queue/status'),
  getActive: () => api.get('/matches/active'),
  getOne: (id) => api.get(`/matches/${id}`),
};

export default api;
