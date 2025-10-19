// frontend/src/services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.pendingListeners = new Map(); // Store listeners to set up when socket connects
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('🔌 Connecting to socket with token:', token ? 'Present' : 'Missing');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('✓ Socket connected');
      this.connected = true;
      
      // Set up any pending listeners
      this.setupPendingListeners();
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication required' || error.message === 'Invalid token') {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });

    // Add debugging for matchmaking events
    this.socket.on('matchmaking:joined', (data) => {
      console.log('🎮 Joined matchmaking queue:', data);
    });

    this.socket.on('matchmaking:error', (error) => {
      console.error('🎮 Matchmaking error:', error);
    });

    // Add debugging for all socket events
    this.socket.onAny((eventName, ...args) => {
      console.log(`📡 Received socket event: ${eventName}`, args);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Matchmaking
  joinMatchmaking(data) {
    console.log('🎮 Joining matchmaking queue:', data);
    this.socket?.emit('matchmaking:join', data);
  }

  leaveMatchmaking() {
    this.socket?.emit('matchmaking:leave');
  }

  onMatchFound(callback) {
    console.log('🎯 Setting up match_found listener in socket service');
    if (this.socket && this.socket.connected) {
      console.log('📡 Socket is connected, setting up listener immediately');
      this.socket.on('matchmaking:match_found', callback);
      console.log('✅ match_found listener registered successfully');
    } else {
      console.log('📡 Socket not ready, queuing listener for later');
      this.pendingListeners.set('matchmaking:match_found', callback);
    }
  }

  setupPendingListeners() {
    console.log('🔧 Setting up pending listeners...');
    for (const [event, callback] of this.pendingListeners) {
      console.log(`📡 Setting up pending listener for: ${event}`);
      this.socket.on(event, callback);
    }
    this.pendingListeners.clear();
    console.log('✅ All pending listeners set up');
  }

  // Match
  joinLobby(matchId) {
    this.socket?.emit('lobby:join', { matchId });
  }

  onMatchStarted(callback) {
    this.socket?.on('match:started', callback);
  }

  submitCode(matchId, code, language) {
    console.log('📤 Submitting code via socket:', { matchId, language, codeLength: code.length });
    this.socket?.emit('match:submit', { matchId, code, language });
  }

  onSubmissionResult(callback) {
    this.socket?.on('submission:result', callback);
  }

  onScoreboardUpdate(callback) {
    this.socket?.on('match:scoreboard_update', callback);
  }

  onTimeSync(callback) {
    this.socket?.on('match:time_sync', callback);
  }

  onMatchEnded(callback) {
    this.socket?.on('match:ended', callback);
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event) {
    this.socket?.off(event);
  }
}

export default new SocketService();
