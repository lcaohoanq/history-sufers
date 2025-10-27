/**
 * HISTORY SURFERS - MULTIPLAYER NETWORKING
 *
 * Client-side Socket.IO networking for multiplayer functionality
 */

class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    this.playerName = 'Player';
    this.opponents = new Map();
    this.eventHandlers = new Map();
    this.isMultiplayer = false;
  }

  /**
   * Merge incoming opponent data while preserving known fields
   */
  _mergeOpponentData(playerId, data = {}) {
    if (!playerId || playerId === this.playerId) {
      return;
    }

    const existing = this.opponents.get(playerId) || {};
    const merged = { ...existing };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        merged[key] = value;
      }
    });

    if (!merged.playerName) {
      merged.playerName = data.playerName || data.name || existing.playerName;
    }

    merged.id = playerId;
    this.opponents.set(playerId, merged);
  }

  /**
   * Update opponent cache using full player list payloads
   */
  _updateOpponentsFromList(players = []) {
    players.forEach((player) => {
      if (!player || player.id === this.playerId) {
        return;
      }

      this._mergeOpponentData(player.id, {
        playerName: player.name,
        score: player.score,
        lane: player.lane,
        isJumping: player.isJumping,
        position: player.position,
        colors: player.colors,
        status: player.status
      });
    });
  }

  /**
   * Connect to the multiplayer server
   */
  connect(serverUrl = '') {
    return new Promise((resolve, reject) => {
      try {
        // Tránh connect nhiều lần
        if (this.socket && this.connected) {
          console.log('Already connected');
          resolve();
          return;
        }

        this.socket = io(serverUrl || window.location.origin, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to server, socket ID:', this.socket.id);
          this.connected = true;
          this.playerId = this.socket.id;
          this.emit('connected');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from server, reason:', reason);
          this.connected = false;
          this.emit('disconnected', { reason });
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Reconnected after', attemptNumber, 'attempts');
          this.connected = true;
          this.playerId = this.socket.id;
          this.emit('reconnected', { attemptNumber });
        });

        this.socket.on('error', (data) => {
          console.error('❌ Server error:', data.message);
          this.emit('error', data);
        });

        // Room events
        this.socket.on('roomCreated', (data) => {
          console.log('🎉 Room created:', data.roomId);
          this.roomId = data.roomId;
          this.playerId = data.playerId;
          this.isMultiplayer = true;
          if (data.players) {
            this._updateOpponentsFromList(data.players);
          }
          this.emit('roomCreated', data);
        });

        this.socket.on('roomJoined', (data) => {
          console.log('✅ Room joined:', data.roomId);
          this.roomId = data.roomId;
          this.playerId = data.playerId;
          this.isMultiplayer = true;
          if (data.players) {
            this._updateOpponentsFromList(data.players);
          }
          this.emit('roomJoined', data);
        });

        this.socket.on('roomList', (rooms) => {
          console.log('📋 Room list received:', rooms.length, 'rooms');
          this.emit('roomList', rooms);
        });

        this.socket.on('playerJoined', (data) => {
          const playerName = data.playerName || data.name || 'Unknown';
          console.log('👤 Player joined:', playerName);
          if (data.players) {
            this._updateOpponentsFromList(data.players);
          }
          this.emit('playerJoined', data);
        });

        this.socket.on('playerLeft', (data) => {
          console.log('👋 Player left:', data.playerId);
          this.opponents.delete(data.playerId);
          this.emit('playerLeft', data);
        });

        this.socket.on('playersUpdated', (data) => {
          console.log('📝 Players updated');
          if (data.players) {
            this._updateOpponentsFromList(data.players);
          }
          this.emit('playersUpdated', data);
        });

        this.socket.on('newHost', (data) => {
          console.log('👑 New host:', data.hostId);
          this.emit('newHost', data);
        });

        // Race events
        this.socket.on('raceCountdown', (data) => {
          console.log('⏱️ Race countdown:', data.countdown);
          this.emit('raceCountdown', data);
        });

        this.socket.on('raceStart', (data) => {
          console.log('🏁 Race started with', data.players?.length || 0, 'players');
          if (data.players) {
            this._updateOpponentsFromList(data.players);
          }
          this.emit('raceStart', data);
        });

        this.socket.on('opponentUpdate', (data) => {
          // Không log để tránh spam console
          this._mergeOpponentData(data.playerId, data.data);
          this.emit('opponentUpdate', data);
        });

        this.socket.on('playerFinishedRace', (data) => {
          console.log('🏆 Player finished:', data.playerName);
          this.emit('playerFinishedRace', data);
        });

        this.socket.on('raceEnded', (data) => {
          console.log('🏁 Race ended, rankings:', data.rankings);
          this.emit('raceEnded', data);
        });

        this.socket.on('raceReset', (data) => {
          console.log('🔄 Race reset');
          this.opponents.clear();
          this.emit('raceReset', data);
        });

        // Notification system (optional)
        this.socket.on('notification', (notification) => {
          console.log('🔔 Notification:', notification.message);
          this.emit('notification', notification);
        });

        // Server config (optional)
        this.socket.on('serverConfig', (config) => {
          console.log('⚙️ Server config received:', config);
          this.emit('serverConfig', config);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      } catch (error) {
        console.error('❌ Connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Create a new room
   */
  createRoom(playerName) {
    if (!this.connected) {
      console.error('❌ Not connected to server');
      return;
    }
    this.playerName = playerName || 'Player';
    console.log('🎮 Creating room with name:', this.playerName);
    this.socket.emit('createRoom', { playerName: this.playerName });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, playerName) {
    if (!this.connected) {
      console.error('❌ Not connected to server');
      return;
    }
    this.playerName = playerName || 'Player';
    console.log('🚪 Joining room:', roomId, 'as', this.playerName);
    this.socket.emit('joinRoom', {
      roomId: roomId,
      playerName: this.playerName
    });
  }

  /**
   * 🆕 Rejoin a room after page reload/reconnect
   */
  rejoinRoom(roomId, playerName) {
    if (!this.connected) {
      console.error('❌ Not connected to server');
      return;
    }
    this.playerName = playerName || 'Player';
    console.log('🔄 Rejoining room:', roomId, 'as', this.playerName);

    this.socket.emit('rejoinRoom', {
      roomId: roomId,
      playerName: this.playerName
    });
  }

  /**
   * Get list of available rooms
   */
  listRooms() {
    if (!this.connected) {
      console.error('❌ Not connected to server');
      return;
    }
    console.log('📋 Requesting room list...');
    this.socket.emit('listRooms');
  }

  /**
   * Toggle player ready state
   */
  setReady(ready) {
    if (!this.connected || !this.roomId) {
      console.error('❌ Not in a room');
      return;
    }
    console.log('✅ Setting ready state:', ready);
    this.socket.emit('playerReady', { ready: ready });
  }

  /**
   * Send player update during race
   */
  sendPlayerUpdate(data) {
    if (!this.isMultiplayer || !this.connected) return;

    this.socket.emit('playerUpdate', {
      position: data.position,
      lane: data.lane,
      isJumping: data.isJumping,
      score: data.score,
      rotation: data.rotation
    });
  }

  /**
   * Notify server that player finished
   */
  sendPlayerFinished(score) {
    if (!this.isMultiplayer || !this.connected) return;
    console.log('🏆 Sending finish with score:', score);
    this.socket.emit('playerFinished', { score: score });
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.socket && this.connected && this.roomId) {
      console.log('🚪 Leaving room:', this.roomId);
      this.socket.emit('leaveRoom');
      this.roomId = null;
      this.opponents.clear();
      this.isMultiplayer = false;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.roomId = null;
      this.opponents.clear();
      this.isMultiplayer = false;
    }
  }

  /**
   * Register event handler
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }

  /**
   * Unregister event handler
   */
  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get opponent data by player ID
   */
  getOpponent(playerId) {
    return this.opponents.get(playerId);
  }

  /**
   * Get all opponents
   */
  getAllOpponents() {
    return Array.from(this.opponents.entries()).map(([id, data]) => ({
      id: id,
      ...data
    }));
  }

  /**
   * Check if in multiplayer mode
   */
  isInMultiplayer() {
    return this.isMultiplayer && this.connected && this.roomId !== null;
  }

  /**
   * 🆕 Get current connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      isMultiplayer: this.isMultiplayer,
      roomId: this.roomId,
      playerId: this.playerId,
      playerName: this.playerName,
      opponentCount: this.opponents.size
    };
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
  window.networkManager = new NetworkManager();

  // Auto-connect on load (optional, có thể bỏ nếu muốn manual connect)
  window.addEventListener('load', () => {
    console.log('🚀 NetworkManager initialized');
  });
}