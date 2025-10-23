/**
 * Base Network Strategy - Interface cho cả Single và Multiplayer
 */
export class NetworkStrategy {
  constructor() {
    this.isMultiplayer = false;
  }

  init() { }

  onGameStart() { }

  onGameLoop(playerData) { }

  onGameOver(score) { }

  cleanup() { }

  getOpponents() {
    return [];
  }
}

/**
 * Single Player Strategy - Không có network
 */
export class SinglePlayerStrategy extends NetworkStrategy {
  constructor() {
    super();
    this.isMultiplayer = false;
  }

  init() {
    console.log('Single player mode initialized');
  }

  onGameStart() {
    // Không cần làm gì
  }

  onGameLoop(playerData) {
    // Không cần gửi update
  }

  onGameOver(score) {
    console.log('Game over, score:', score);
  }

  cleanup() {
    // Không cần cleanup
  }
}

/**
 * Multiplayer Strategy - Có network
 */
export class MultiplayerStrategy extends NetworkStrategy {
  constructor(networkManager) {
    super();
    this.isMultiplayer = true;
    this.networkManager = networkManager;
    this.opponents = new Map();
    this.lastUpdateTime = 0;
    this.updateInterval = 50; // ms between updates
    this.eventHandlers = [];
  }

  init() {
    if (!this.networkManager || !this.networkManager.isInMultiplayer()) {
      console.error('Network manager not available');
      return;
    }

    // Register network event handlers
    this.registerHandler('opponentUpdate', (data) => {
      this.updateOpponent(data.playerId, data.data);
    });

    this.registerHandler('playerJoined', (data) => {
      console.log('Player joined:', data);
      if (this.onPlayerJoined) {
        this.onPlayerJoined(data);
      }
    });

    this.registerHandler('playerLeft', (data) => {
      this.removeOpponent(data.playerId);
      if (this.onPlayerLeft) {
        this.onPlayerLeft(data);
      }
    });

    this.registerHandler('raceStart', (data) => {
      console.log('Race started!');
      if (this.onRaceStart) {
        this.onRaceStart(data);
      }
    });

    this.registerHandler('raceEnded', (data) => {
      if (this.onRaceEnded) {
        this.onRaceEnded(data);
      }
    });

    this.registerHandler('raceCountdown', (data) => {
      if (this.onRaceCountdown) {
        this.onRaceCountdown(data);
      }
    });

    console.log('Multiplayer mode initialized');
  }

  registerHandler(event, callback) {
    this.networkManager.on(event, callback);
    this.eventHandlers.push({ event, callback });
  }

  onGameStart() {
    // Game đã bắt đầu, có thể thông báo server nếu cần
  }

  onGameLoop(playerData) {
    // Throttle updates để tránh spam server
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.networkManager.sendPlayerUpdate({
      position: playerData.position,
      lane: playerData.lane,
      isJumping: playerData.isJumping,
      score: playerData.score
    });

    this.lastUpdateTime = currentTime;
  }

  onGameOver(score) {
    this.networkManager.sendPlayerFinished(score);
  }

  updateOpponent(playerId, data) {
    this.opponents.set(playerId, data);
    if (this.onOpponentUpdate) {
      this.onOpponentUpdate(playerId, data);
    }
  }

  removeOpponent(playerId) {
    this.opponents.delete(playerId);
  }

  getOpponents() {
    return Array.from(this.opponents.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  cleanup() {
    // Unregister all event handlers
    this.eventHandlers.forEach(({ event, callback }) => {
      this.networkManager.off(event, callback);
    });
    this.eventHandlers = [];
    this.opponents.clear();
  }
}
