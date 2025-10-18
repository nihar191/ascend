// frontend/src/services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✓ Socket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Add debugging for matchmaking events
    this.socket.on('matchmaking:joined', (data) => {
      console.log('🎮 Joined matchmaking queue:', data);
    });

    this.socket.on('matchmaking:error', (error) => {
      console.error('🎮 Matchmaking error:', error);
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
    console.log('🎯 Setting up match_found listener');
    this.socket?.on('matchmaking:match_found', callback);
  }

  // Match
  joinLobby(matchId) {
    this.socket?.emit('lobby:join', { matchId });
  }

  onMatchStarted(callback) {
    this.socket?.on('match:started', callback);
  }

  submitCode(matchId, code, language) {
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

  off(event) {
    this.socket?.off(event);
  }
}

export default new SocketService();
