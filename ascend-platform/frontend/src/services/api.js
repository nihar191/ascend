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
  joinSeason: (seasonId) => api.post(`/leagues/seasons/${seasonId}/join`),
};

export const matchesAPI = {
  joinQueue: (data) => api.post('/matches/queue/join', data),
  leaveQueue: () => api.post('/matches/queue/leave'),
  getQueueStatus: () => api.get('/matches/queue/status'),
  getActive: () => api.get('/matches/active'),
  getOne: (id) => api.get(`/matches/${id}`),
};

export default api;
