/**
 * HISTORY SURFERS - COLYSEUS GAME ROOM
 *
 * Main multiplayer room logic
 */

import pkg from 'colyseus';
const { Room } = pkg;
import { GameState, Player } from '../schema/GameState.js';

// Player color palette
const PLAYER_COLORS = [
  { shirt: 0xff0000, shorts: 0x8b0000 }, // Red
  { shirt: 0x0000ff, shorts: 0x00008b }, // Blue
  { shirt: 0x00ff00, shorts: 0x006400 }, // Green
  { shirt: 0xff00ff, shorts: 0x8b008b }, // Magenta
  { shirt: 0xffa500, shorts: 0xff8c00 }, // Orange
  { shirt: 0x00ffff, shorts: 0x008b8b }, // Cyan
  { shirt: 0xffff00, shorts: 0xcccc00 }, // Yellow
  { shirt: 0xff1493, shorts: 0xc71585 }, // Deep Pink
  { shirt: 0x9370db, shorts: 0x663399 }, // Purple
  { shirt: 0x20b2aa, shorts: 0x008b8b } // Light Sea Green
];

export class GameRoom extends Room {
  maxClients = 50;
  reconnectTimeout = 10; // seconds
  roomMode = 'public';

  onCreate(options) {
    console.log('🎮 GameRoom created:', this.roomId);

    this.setState(new GameState());
    this.state.maxPlayers = this.maxClients;
    this.roomMode = options?.mode === 'classroom' ? 'classroom' : 'public';
    this.state.mode = this.roomMode;
    console.log(`⚙️ Room mode set to: ${this.roomMode}`);

    // Set up message handlers
    this.onMessage('playerReady', (client, message) => {
      this.handlePlayerReady(client, message);
    });

    this.onMessage('playerUpdate', (client, message) => {
      this.handlePlayerUpdate(client, message);
    });

    this.onMessage('playerFinished', (client, message) => {
      this.handlePlayerFinished(client, message);
    });

    this.onMessage('startRace', (client) => {
      this.handleStartRace(client);
    });

    // Auto-start race when all players are ready
    this.state.players.onAdd((player, sessionId) => {
      this.checkAutoStart();
    });
  }

  onJoin(client, options) {
    console.log(`👤 ${options.playerName || 'Player'} joined room ${this.roomId}`);

    // Create player with all default values
    const player = new Player();
    const isFirstPlayer = this.state.players.size === 0;
    const isClassroomSpectator = this.roomMode === 'classroom' && isFirstPlayer;
    player.name = options.playerName || `Player${this.state.players.size + 1}`;
    player.score = 0;
    player.lane = 0;
    player.posX = 0;
    player.posY = 0;
    player.posZ = -4000;
    player.isJumping = false;
    player.finished = false;
    player.finishTime = 0;
    player.ready = false;
    player.status = 'online';
    player.spectator = isClassroomSpectator;

    // Assign color
    const colorIndex = this.state.players.size % PLAYER_COLORS.length;
    const colors = PLAYER_COLORS[colorIndex];
    player.colorShirt = colors.shirt;
    player.colorShorts = colors.shorts;

    // Set host if first player
    if (isFirstPlayer) {
      this.state.hostId = client.sessionId;
      console.log(`👑 ${player.name} is the host`);
    }

    this.state.players.set(client.sessionId, player);

    // Send welcome message
    this.broadcast(
      'notification',
      {
        type: 'info',
        title: 'Player Joined',
        message: `${player.name} joined the room (${this.state.players.size}/${this.maxClients})`,
        duration: 3000
      },
      { except: client }
    );

    client.send('notification', {
      type: 'success',
      title: 'Welcome!',
      message: `You joined room ${this.roomId}`,
      duration: 3000
    });

    if (isClassroomSpectator) {
      client.send('notification', {
        type: 'info',
        title: 'Classroom Mode',
        message: 'Bạn là quản trị viên và sẽ không tham gia chạy đua. Hãy bấm Start khi tất cả học viên sẵn sàng.',
        duration: 4000
      });
    }
  }

  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;

    console.log(`👋 ${player.name} left room ${this.roomId} (consented: ${consented})`);

    if (consented) {
      // Player intentionally left
      this.removePlayer(client.sessionId);
    } else {
      // Player disconnected - allow reconnection
      player.status = 'offline';

      this.broadcast('notification', {
        type: 'warning',
        title: 'Player Disconnected',
        message: `${player.name} disconnected. Waiting for reconnection...`,
        duration: 5000
      });

      // Pause race if in progress
      if (this.state.state === 'racing') {
        this.state.state = 'paused';
        this.broadcast('racePaused', {
          reason: 'player_disconnected',
          playerName: player.name,
          message: `Waiting for ${player.name} to reconnect...`
        });
      }

      try {
        // Wait for reconnection
        await this.allowReconnection(client, this.reconnectTimeout);

        // Player reconnected
        player.status = 'online';
        console.log(`✅ ${player.name} reconnected`);

        this.broadcast('notification', {
          type: 'success',
          title: 'Player Reconnected',
          message: `${player.name} is back!`,
          duration: 3000
        });

        // Resume race if all players are online
        if (this.state.state === 'paused' && this.allPlayersOnline()) {
          this.state.state = 'racing';
          this.broadcast('raceResumed', {
            message: 'All players reconnected! Race resumed.'
          });
        }
      } catch (e) {
        // Reconnection timeout - remove player
        console.log(`⏰ ${player.name} did not reconnect in time`);
        this.removePlayer(client.sessionId);

        // Resume race if it was paused
        if (this.state.state === 'paused') {
          this.state.state = 'racing';
          this.broadcast('raceResumed', {
            message: `Race resumed without ${player.name}`
          });
        }
      }
    }
  }

  onDispose() {
    console.log('🗑️ GameRoom disposed:', this.roomId);
  }

  // Message handlers

  handlePlayerReady(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (player.spectator) {
      client.send('notification', {
        type: 'warning',
        title: 'Spectator',
        message: 'Chỉ người chơi mới cần đánh dấu sẵn sàng.',
        duration: 2500
      });
      return;
    }

    const readyState = !!message.ready;
    player.ready = readyState;
    console.log(`${player.name} is ${readyState ? 'ready' : 'not ready'}`);

    const activePlayers = this.getActivePlayers().map(([, activePlayer]) => activePlayer);
    const readyCount = activePlayers.filter((p) => p.ready).length;
    const totalPlayers = activePlayers.length;

    this.broadcast('notification', {
      type: 'info',
      title: readyState ? 'Player Ready' : 'Player Not Ready',
      message: `${player.name} is ${readyState ? 'ready' : 'not ready'} (${readyCount}/${totalPlayers})`,
      duration: 2000
    });

    this.checkAutoStart();
  }

  handlePlayerUpdate(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.spectator || this.state.state !== 'racing') return;

    // Update player position and state
    player.posX = message.position?.x ?? player.posX;
    player.posY = message.position?.y ?? player.posY;
    player.posZ = message.position?.z ?? player.posZ;
    player.lane = message.lane ?? player.lane;
    player.isJumping = message.isJumping ?? player.isJumping;
    player.score = message.score ?? player.score;
  }

  handlePlayerFinished(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.finished || player.spectator) return;

    player.finished = true;
    player.finishTime = Date.now() - this.state.startTime;
    player.score = message.score || player.score;

    console.log(`🏁 ${player.name} finished with score ${player.score}`);

    this.broadcast('playerFinished', {
      sessionId: client.sessionId,
      playerName: player.name,
      score: player.score,
      time: player.finishTime
    });

    // Check if all players finished
    const activePlayers = this.getActivePlayers();
    const allFinished = activePlayers.length > 0 && activePlayers.every(([, activePlayer]) => activePlayer.finished);
    if (allFinished) {
      this.endRace();
    }
  }

  handleStartRace(client) {
    const requester = this.state.players.get(client.sessionId);
    if (!requester) return;

    if (client.sessionId !== this.state.hostId) {
      client.send('notification', {
        type: 'error',
        title: 'Not Allowed',
        message: 'Only the host can start the race.',
        duration: 2500
      });
      return;
    }

    if (this.state.state !== 'waiting') {
      client.send('notification', {
        type: 'warning',
        title: 'Race Busy',
        message: 'Race is already in progress or finished.',
        duration: 2500
      });
      return;
    }

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      client.send('notification', {
        type: 'warning',
        title: 'Need More Players',
        message: 'At least 2 players are required to start the race.',
        duration: 3000
      });
      return;
    }

    if (!this.allActivePlayersReady()) {
      client.send('notification', {
        type: 'warning',
        title: 'Players Not Ready',
        message: 'Wait until all players are ready before starting.',
        duration: 3000
      });
      return;
    }

    console.log(`🎯 Host ${requester.name} requested race start`);
    this.startRace();
  }

  // Helper methods

  checkAutoStart() {
    if (this.state.mode === 'classroom') return;
    if (this.state.state !== 'waiting') return;
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) return;

    const allReady = activePlayers.every(([, player]) => player.ready);
    if (allReady) {
      this.startRace();
    }
  }

  async startRace() {
    if (this.state.state !== 'waiting') return;

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 1) {
      console.warn(`⚠️ Unable to start race in room ${this.roomId}: no active players`);
      return;
    }

    if (this.roomMode === 'classroom' && !this.allActivePlayersReady()) {
      console.warn(`⚠️ Unable to start race in room ${this.roomId}: not all players are ready`);
      return;
    }

    console.log(`🏁 Starting race in room ${this.roomId} with ${activePlayers.length} active players`);

    this.state.state = 'countdown';

    // Countdown
    for (let i = 3; i > 0; i--) {
      this.state.countdown = i;
      this.broadcast('raceCountdown', { countdown: i });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Start race
    this.state.state = 'racing';
    this.state.startTime = Date.now();
    this.state.countdown = 0;

    // Reset all players
    this.state.players.forEach((player) => {
      if (player.spectator) return;
      player.finished = false;
      player.finishTime = 0;
      player.score = 0;
    });

    this.broadcast('raceStart', {
      startTime: this.state.startTime
    });

    this.broadcast('notification', {
      type: 'success',
      title: 'GO! 🏁',
      message: 'Race has started! Good luck!',
      duration: 2000
    });
  }

  endRace() {
    this.state.state = 'finished';
    console.log(`🏁 Race ended in room ${this.roomId}`);

    // Calculate rankings
    const rankings = this.getActivePlayers()
      .map(([sessionId, player]) => ({
        rank: 0,
        sessionId: sessionId,
        playerName: player.name,
        score: player.score,
        time: player.finishTime
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => {
        entry.rank = index + 1;
        return entry;
      });

    this.broadcast('raceEnded', { rankings });

    // Reset after 10 seconds
    if (this.roomMode === 'classroom') {
      this.broadcast('notification', {
        type: 'info',
        title: 'Session Complete',
        message: 'Kết thúc lượt classroom. Tạo phòng mới để bắt đầu lượt tiếp theo.',
        duration: 5000
      });
      return;
    }

    setTimeout(() => {
      this.resetRoom();
    }, 10000);
  }

  resetRoom() {
    this.state.state = 'waiting';
    this.state.startTime = 0;
    this.state.countdown = 3;

    this.state.players.forEach((player) => {
      if (player.spectator) {
        player.ready = false;
        player.finished = false;
        player.finishTime = 0;
        return;
      }
      player.ready = false;
      player.finished = false;
      player.finishTime = 0;
      player.score = 0;
    });

    this.broadcast('raceReset');
    console.log(`🔄 Room ${this.roomId} reset`);
  }

  removePlayer(sessionId) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    const playerName = player.name;
    this.state.players.delete(sessionId);

    this.broadcast('notification', {
      type: 'warning',
      title: 'Player Left',
      message: `${playerName} left the room (${this.state.players.size} remaining)`,
      duration: 3000
    });

    // Assign new host if needed
    if (this.state.hostId === sessionId && this.state.players.size > 0) {
      const newHostId = Array.from(this.state.players.keys())[0];
      const newHost = this.state.players.get(newHostId);
      this.state.hostId = newHostId;

      this.broadcast('notification', {
        type: 'info',
        title: 'New Host',
        message: `${newHost.name} is now the room host.`,
        duration: 3000
      });

      console.log(`👑 New host: ${newHost.name}`);
    }
  }

  allPlayersOnline() {
    return Array.from(this.state.players.values()).every((p) => p.status === 'online');
  }

  getActivePlayers() {
    return Array.from(this.state.players.entries()).filter(([, player]) => !player.spectator);
  }

  allActivePlayersReady() {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return false;
    return activePlayers.every(([, player]) => player.ready);
  }
}
