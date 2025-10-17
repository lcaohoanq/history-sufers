/**
 * BOXY RUN - MULTIPLAYER NETWORKING
 *
 * Client-side Socket.IO networking for multiplayer functionality
 */

class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    this.playerName = "Player";
    this.opponents = new Map();
    this.eventHandlers = new Map();
    this.isMultiplayer = false;
  }

  /**
   * Connect to the multiplayer server
   */
  connect(serverUrl = "") {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl || window.location.origin);

        this.socket.on("connect", () => {
          console.log("Connected to server");
          this.connected = true;
          this.playerId = this.socket.id;
          resolve();
        });

        this.socket.on("disconnect", () => {
          console.log("Disconnected from server");
          this.connected = false;
          this.emit("disconnected");
        });

        this.socket.on("error", (data) => {
          console.error("Server error:", data.message);
          this.emit("error", data);
        });

        // Room events
        this.socket.on("roomCreated", (data) => {
          this.roomId = data.roomId;
          this.playerId = data.playerId;
          this.isMultiplayer = true;
          this.emit("roomCreated", data);
        });

        this.socket.on("roomJoined", (data) => {
          this.roomId = data.roomId;
          this.playerId = data.playerId;
          this.isMultiplayer = true;
          this.emit("roomJoined", data);
        });

        this.socket.on("roomList", (rooms) => {
          this.emit("roomList", rooms);
        });

        this.socket.on("playerJoined", (data) => {
          this.emit("playerJoined", data);
        });

        this.socket.on("playerLeft", (data) => {
          this.opponents.delete(data.playerId);
          this.emit("playerLeft", data);
        });

        this.socket.on("playersUpdated", (data) => {
          this.emit("playersUpdated", data);
        });

        this.socket.on("newHost", (data) => {
          this.emit("newHost", data);
        });

        // Race events
        this.socket.on("raceCountdown", (data) => {
          this.emit("raceCountdown", data);
        });

        this.socket.on("raceStart", (data) => {
          this.emit("raceStart", data);
        });

        this.socket.on("opponentUpdate", (data) => {
          this.opponents.set(data.playerId, data.data);
          this.emit("opponentUpdate", data);
        });

        this.socket.on("playerFinishedRace", (data) => {
          this.emit("playerFinishedRace", data);
        });

        this.socket.on("raceEnded", (data) => {
          this.emit("raceEnded", data);
        });

        this.socket.on("raceReset", (data) => {
          this.opponents.clear();
          this.emit("raceReset", data);
        });

        setTimeout(() => {
          if (!this.connected) {
            reject(new Error("Connection timeout"));
          }
        }, 5000);
      } catch (error) {
        console.error("Connection error:", error);
        reject(error);
      }
    });
  }

  /**
   * Create a new room
   */
  createRoom(playerName) {
    this.playerName = playerName || "Player";
    this.socket.emit("createRoom", { playerName: this.playerName });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId, playerName) {
    this.playerName = playerName || "Player";
    this.socket.emit("joinRoom", {
      roomId: roomId,
      playerName: this.playerName,
    });
  }

  /**
   * Get list of available rooms
   */
  listRooms() {
    this.socket.emit("listRooms");
  }

  /**
   * Toggle player ready state
   */
  setReady(ready) {
    this.socket.emit("playerReady", { ready: ready });
  }

  /**
   * Send player update during race
   */
  sendPlayerUpdate(data) {
    if (!this.isMultiplayer || !this.connected) return;

    this.socket.emit("playerUpdate", {
      position: data.position,
      lane: data.lane,
      isJumping: data.isJumping,
      score: data.score,
      rotation: data.rotation,
    });
  }

  /**
   * Notify server that player finished
   */
  sendPlayerFinished(score) {
    if (!this.isMultiplayer || !this.connected) return;
    this.socket.emit("playerFinished", { score: score });
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.socket && this.connected) {
      this.socket.emit("leaveRoom");
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
          console.error(`Error in event handler for ${event}:`, error);
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
      ...data,
    }));
  }

  /**
   * Check if in multiplayer mode
   */
  isInMultiplayer() {
    return this.isMultiplayer && this.connected && this.roomId !== null;
  }
}

// Create global instance
if (typeof window !== "undefined") {
  window.NetworkManager = NetworkManager;
  window.networkManager = new NetworkManager();
}
