/**
 * HISTORY SUFERS - MULTIPLAYER SERVER
 *
 * Node.js + Socket.IO server for real-time multiplayer racing
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 🔧 Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express setup
const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS) || 50;
const DISCONNECT_TIMEOUT = 10000; // 10 seconds to rejoin

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    activePlayers: playerRooms.size,
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM
  });
});

// API endpoint for server info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'History Sufers Multiplayer Server',
    version: '2.0.0',
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    activeRooms: rooms.size,
    activePlayers: playerRooms.size
  });
});

// Game rooms and players
const rooms = new Map();
const playerRooms = new Map();
const disconnectTimers = new Map(); // 🔥 Track disconnect timers

// Extended player colors for up to 50 players
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
  { shirt: 0x20b2aa, shorts: 0x008b8b }, // Light Sea Green
  { shirt: 0xff6347, shorts: 0xff4500 }, // Tomato
  { shirt: 0x4169e1, shorts: 0x000080 }, // Royal Blue
  { shirt: 0x32cd32, shorts: 0x228b22 }, // Lime Green
  { shirt: 0xff69b4, shorts: 0xff1493 }, // Hot Pink
  { shirt: 0x00ced1, shorts: 0x008b8b }, // Dark Turquoise
  { shirt: 0xffd700, shorts: 0xdaa520 }, // Gold
  { shirt: 0xdc143c, shorts: 0x8b0000 }, // Crimson
  { shirt: 0x7fff00, shorts: 0x32cd32 }, // Chartreuse
  { shirt: 0xff8c00, shorts: 0xff4500 }, // Dark Orange
  { shirt: 0x9932cc, shorts: 0x8b008b }, // Dark Orchid
  { shirt: 0x00fa9a, shorts: 0x3cb371 }, // Medium Spring Green
  { shirt: 0xba55d3, shorts: 0x9370db }, // Medium Orchid
  { shirt: 0x1e90ff, shorts: 0x4169e1 }, // Dodger Blue
  { shirt: 0xda70d6, shorts: 0x9370db }, // Orchid
  { shirt: 0x00ff7f, shorts: 0x2e8b57 } // Spring Green
];

/**
 * Generate a unique color for players beyond the predefined color palette
 * Uses golden angle distribution for visually distinct colors
 */
function generatePlayerColor(index) {
  if (index < PLAYER_COLORS.length) {
    return PLAYER_COLORS[index];
  }

  // Golden angle in degrees for optimal color distribution
  const goldenAngle = 137.508;
  const hue = (index * goldenAngle) % 360;

  // Convert HSL to RGB hex
  const saturation = 0.75;
  const lightness = 0.5;

  const hslToRgb = (h, s, l) => {
    h = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return (r << 16) + (g << 8) + b;
  };

  const shirtColor = hslToRgb(hue, saturation, lightness);
  const shortsColor = hslToRgb(hue, saturation * 0.8, lightness * 0.6);

  return { shirt: shirtColor, shorts: shortsColor };
}

class Room {
  constructor(id, hostId) {
    this.id = id;
    this.hostId = hostId;
    this.players = new Map();
    this.maxPlayers = MAX_PLAYERS_PER_ROOM;
    this.state = 'waiting'; // waiting, racing, finished
    this.startTime = null;
    this.readyPlayers = new Set();
    this.createdAt = Date.now();
  }

  addPlayer(socketId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, reason: 'room_full' };
    }

    const colorIndex = this.players.size;
    const colors = generatePlayerColor(colorIndex);

    this.players.set(socketId, {
      id: socketId,
      name: playerName,
      score: 0,
      position: { x: 0, y: 0, z: -4000 },
      lane: 0,
      isJumping: false,
      colors: colors,
      ready: false,
      finished: false,
      finishTime: null,
      joinedAt: Date.now(),
      status: 'online' // 🔥 online, offline
    });

    return { success: true, playerCount: this.players.size };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.readyPlayers.delete(socketId);
  }

  setPlayerReady(socketId, ready) {
    if (this.players.has(socketId)) {
      const player = this.players.get(socketId);
      player.ready = ready;
      if (ready) {
        this.readyPlayers.add(socketId);
      } else {
        this.readyPlayers.delete(socketId);
      }
    }
  }

  canStart() {
    return (
      this.players.size >= 2 &&
      this.readyPlayers.size === this.players.size &&
      this.state === 'waiting'
    );
  }

  updatePlayerState(socketId, data) {
    if (this.players.has(socketId)) {
      const player = this.players.get(socketId);
      Object.assign(player, data);
    }
  }

  getPlayersArray() {
    return Array.from(this.players.values());
  }

  isEmpty() {
    return this.players.size === 0;
  }
}

io.on('connection', (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  // Send server configuration to client
  socket.emit('serverConfig', {
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    serverVersion: '2.0.0'
  });

  // Create a new room
  socket.on('createRoom', (data) => {
    const roomId = generateRoomId();
    const room = new Room(roomId, socket.id);
    const result = room.addPlayer(socket.id, data.playerName || 'Player');

    if (result.success) {
      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);

      socket.join(roomId);
      socket.emit('roomCreated', {
        roomId: roomId,
        playerId: socket.id,
        players: room.getPlayersArray(),
        maxPlayers: room.maxPlayers
      });

      // Send notification
      socket.emit('notification', {
        type: 'success',
        title: 'Tạo phòng thành công!',
        message: `Mã phòng ${roomId} sẵn sàng. Chia sẻ mã với bạn bè!`,
        duration: 5000
      });

      console.log(`🎮 Tạo phòng thành công: ${roomId} bởi ${socket.id}`);
    } else {
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Join an existing room
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      socket.emit('notification', {
        type: 'error',
        title: 'Room Not Found',
        message: `Room ${roomId} doesn't exist or has been closed.`,
        duration: 5000
      });
      return;
    }

    // Check if username already exists in the room
    const nameExists = Array.from(room.players.values()).some(
      (p) => p.name === playerName
    );
    if (nameExists) {
      socket.emit('error', { message: 'Username already taken in this room' });
      socket.emit('notification', {
        type: 'error',
        title: 'Username Taken',
        message: `The name "${playerName}" is already used in this room. Please choose another.`,
        duration: 5000
      });
      return;
    }

    if (room.players.has(socket.id)) {
      console.log(`🔄 Player ${socket.id} rejoining room ${roomId}`);

      socket.join(roomId);
      playerRooms.set(socket.id, roomId);

      socket.emit('roomJoined', {
        roomId: roomId,
        playerId: socket.id,
        players: room.getPlayersArray(),
        maxPlayers: room.maxPlayers
      });

      return;
    }

    if (room.state !== 'waiting') {
      socket.emit('error', { message: 'Race already in progress' });
      socket.emit('notification', {
        type: 'warning',
        title: 'Race In Progress',
        message: 'This room is currently racing. Please wait or try another room.',
        duration: 5000
      });
      return;
    }

    const result = room.addPlayer(socket.id, playerName || 'Player');

    if (result.success) {
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      socket.emit('roomJoined', {
        roomId: roomId,
        playerId: socket.id,
        players: room.getPlayersArray(),
        maxPlayers: room.maxPlayers
      });

      // Notify the player who joined
      socket.emit('notification', {
        type: 'success',
        title: 'Joined Room!',
        message: `Welcome to room ${roomId}! ${result.playerCount}/${room.maxPlayers} players ready.`,
        duration: 4000
      });

      // Notify other players in the room
      socket.to(roomId).emit('playerJoined', {
        players: room.getPlayersArray()
      });

      socket.to(roomId).emit('notification', {
        type: 'info',
        title: 'New Player Joined',
        message: `${playerName} joined the room! (${result.playerCount}/${room.maxPlayers})`,
        duration: 3000
      });

      console.log(
        `👥 Player ${socket.id} (${playerName}) joined room ${roomId} (${result.playerCount}/${room.maxPlayers})`
      );
    } else {
      socket.emit('error', {
        message: `Room is full (${room.maxPlayers}/${room.maxPlayers})`
      });
      socket.emit('notification', {
        type: 'error',
        title: 'Room Full',
        message: `This room is full! Maximum ${room.maxPlayers} players allowed.`,
        duration: 5000
      });
    }
  });

  // 🔥 NEW: Rejoin room after page reload
  socket.on('rejoinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      console.log(`❌ Rejoin failed: Room ${roomId} not found`);
      return;
    }

    console.log(`🔄 ${playerName} attempting to rejoin room ${roomId}`);

    // Cancel any pending disconnect timer
    const timerKey = `${roomId}:${playerName}`;
    if (disconnectTimers.has(timerKey)) {
      clearTimeout(disconnectTimers.get(timerKey));
      disconnectTimers.delete(timerKey);
      console.log(`⏸️  Cancelled disconnect timer for ${playerName}`);
    }

    // Find player by name (vì socket ID đã thay đổi)
    let player = null;
    let oldSocketId = null;

    room.players.forEach((p, sid) => {
      if (p.name === playerName) {
        player = p;
        oldSocketId = sid;
      }
    });

    if (player && oldSocketId) {
      // Update socket ID
      console.log(`✅ Updating ${playerName} socket ID: ${oldSocketId} → ${socket.id}`);

      // Remove old socket ID entry
      room.players.delete(oldSocketId);
      playerRooms.delete(oldSocketId);

      // Add with new socket ID
      player.id = socket.id;
      player.status = 'online';
      room.players.set(socket.id, player);
      playerRooms.set(socket.id, roomId);
    } else {
      // New player (shouldn't happen but handle anyway)
      console.log(`⚠️ ${playerName} not found in room, adding as new player`);
      const result = room.addPlayer(socket.id, playerName);
      if (!result.success) {
        socket.emit('error', { message: 'Failed to rejoin room' });
        return;
      }
      playerRooms.set(socket.id, roomId);
    }

    socket.join(roomId);

    // Send confirmation
    socket.emit('roomJoined', {
      roomId: roomId,
      playerId: socket.id,
      players: room.getPlayersArray(),
      raceInProgress: room.state === 'racing' // 🔥 Tell client if race is running
    });

    // Notify others
    socket.to(roomId).emit('playerRejoined', {
      playerId: socket.id,
      playerName: playerName
    });

    console.log(`✅ ${playerName} rejoined room ${roomId} successfully`);
  });

  // Get list of available rooms
  socket.on('listRooms', () => {
    const roomList = Array.from(rooms.values())
      .filter((room) => room.state === 'waiting' && room.players.size < room.maxPlayers)
      .map((room) => {
        const hostPlayer = room.players.get(room.hostId);
        return {
          id: room.id,
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          hostName: hostPlayer ? hostPlayer.name : 'Unknown'
        };
      });

    socket.emit('roomList', roomList);
  });

  // Player ready toggle
  socket.on('playerReady', (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player ? player.name : 'Player';

    room.setPlayerReady(socket.id, data.ready);

    // Broadcast to all players in room
    io.to(roomId).emit('playersUpdated', {
      players: room.getPlayersArray()
    });

    // Notify all players about ready status change
    const readyCount = room.readyPlayers.size;
    const totalPlayers = room.players.size;

    if (data.ready) {
      socket.to(roomId).emit('notification', {
        type: 'info',
        title: 'Player Ready',
        message: `${playerName} is ready! (${readyCount}/${totalPlayers})`,
        duration: 2000
      });
    }

    // Check if race can start
    if (room.canStart()) {
      io.to(roomId).emit('notification', {
        type: 'success',
        title: 'All Players Ready!',
        message: `Starting race with ${totalPlayers} players...`,
        duration: 3000
      });
      startRace(roomId, room);
    } else if (readyCount > 0) {
      // Show how many more players need to be ready
      const waitingCount = totalPlayers - readyCount;
      if (waitingCount > 0) {
        io.to(roomId).emit('notification', {
          type: 'info',
          title: 'Waiting for Players',
          message: `${waitingCount} player${waitingCount > 1 ? 's' : ''} need to ready up!`,
          duration: 2000
        });
      }
    }
  });

  // Update player position and state during race
  socket.on('playerUpdate', (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.state !== 'racing') return;

    room.updatePlayerState(socket.id, data);

    // Broadcast to other players (not self)
    socket.to(roomId).emit('opponentUpdate', {
      playerId: socket.id,
      data: data
    });
  });

  // Player finished race
  socket.on('playerFinished', (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player && !player.finished) {
      player.finished = true;
      player.finishTime = Date.now() - room.startTime;
      player.score = data.score || 0;

      // Broadcast finish to all players
      io.to(roomId).emit('playerFinishedRace', {
        playerId: socket.id,
        playerName: player.name,
        score: player.score,
        time: player.finishTime,
        players: room.getPlayersArray()
      });

      // Check if all players finished
      const allFinished = Array.from(room.players.values()).every((p) => p.finished);
      if (allFinished) {
        endRace(roomId, room);
      }
    }
  });

  // Leave room
  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket.id, true); // Immediate leave
  });

  // 🔥 Handle disconnect with timeout
  socket.on('disconnect', () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
    handlePlayerLeave(socket.id, false); // Delayed leave
  });
});

function startRace(roomId, room) {
  room.state = 'racing';
  room.startTime = Date.now();

  const playerCount = room.players.size;

  // Reset all players
  room.players.forEach((player) => {
    player.score = 0;
    player.finished = false;
    player.finishTime = null;
  });

  // Countdown
  let countdown = 3;
  const countdownInterval = setInterval(() => {
    io.to(roomId).emit('raceCountdown', { countdown });
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);

      io.to(roomId).emit('raceStart', {
        startTime: room.startTime,
        players: room.getPlayersArray()
      });

      io.to(roomId).emit('notification', {
        type: 'success',
        title: 'GO! 🏁',
        message: 'Race has started! Good luck!',
        duration: 2000
      });

      console.log(`🏁 Race started in room ${roomId} with ${playerCount} players`);
    }
  }, 1000);
}

function endRace(roomId, room) {
  room.state = 'finished';

  // Calculate rankings
  const rankings = Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      playerName: player.name,
      score: player.score,
      time: player.finishTime
    }));

  io.to(roomId).emit('raceEnded', { rankings });

  console.log(`🏁 Race ended in room ${roomId}`);

  // Reset room after 10 seconds
  setTimeout(() => {
    room.state = 'waiting';
    room.readyPlayers.clear();
    room.players.forEach((player) => {
      player.ready = false;
      player.finished = false;
      player.finishTime = null;
      player.score = 0;
    });

    io.to(roomId).emit('raceReset', {
      players: room.getPlayersArray()
    });
  }, 10000);
}

function handlePlayerLeave(socketId, immediate = true) {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(socketId);
  if (!player) return;

  const playerName = player.name;

  if (immediate) {
    // Immediate leave (manual leaveRoom)
    console.log(`👋 Player ${socketId} (${playerName}) left room ${roomId} immediately`);
    removePlayerFromRoom(socketId, roomId, room, playerName);
  } else {
    // Delayed leave (disconnect) - give time to reconnect
    console.log(`⏳ Player ${socketId} (${playerName}) disconnected, waiting ${DISCONNECT_TIMEOUT / 1000}s for rejoin...`);

    player.status = 'offline';

    const timerKey = `${roomId}:${playerName}`;
    const timer = setTimeout(() => {
      console.log(`⏰ Timeout reached for ${playerName}, removing from room ${roomId}`);
      disconnectTimers.delete(timerKey);

      // Check if player still hasn't reconnected
      const currentRoom = rooms.get(roomId);
      if (!currentRoom) return;

      // Find player by name (socket ID might have changed)
      let stillDisconnected = false;
      currentRoom.players.forEach((p, sid) => {
        if (p.name === playerName && p.status === 'offline') {
          stillDisconnected = true;
          removePlayerFromRoom(sid, roomId, currentRoom, playerName);
        }
      });

      if (!stillDisconnected) {
        console.log(`✅ Player ${playerName} has reconnected, keeping in room`);
      }
    }, DISCONNECT_TIMEOUT);

    disconnectTimers.set(timerKey, timer);
  }
}

function removePlayerFromRoom(socketId, roomId, room, playerName) {
  room.removePlayer(socketId);
  playerRooms.delete(socketId);

  const remainingPlayers = room.players.size;

  // Notify other players
  io.to(roomId).emit('playerLeft', {
    playerId: socketId,
    players: room.getPlayersArray()
  });

  if (remainingPlayers > 0) {
    io.to(roomId).emit('notification', {
      type: 'warning',
      title: 'Player Left',
      message: `${playerName} left the room. (${remainingPlayers} remaining)`,
      duration: 3000
    });
  }

  // Delete room if empty
  if (room.isEmpty()) {
    rooms.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted (empty)`);
  } else if (room.hostId === socketId && room.players.size > 0) {
    // Assign new host
    const newHostId = room.players.keys().next().value;
    const newHost = room.players.get(newHostId);
    room.hostId = newHostId;

    io.to(roomId).emit('newHost', { hostId: newHostId });
    io.to(roomId).emit('notification', {
      type: 'info',
      title: 'New Host',
      message: `${newHost.name} is now the room host.`,
      duration: 3000
    });

    console.log(`👑 New host assigned in room ${roomId}: ${newHostId}`);
  }

  console.log(`❌ Player ${socketId} (${playerName}) removed from room ${roomId}`);
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Clean up empty rooms periodically
setInterval(() => {
  const now = Date.now();
  const roomsToDelete = [];

  rooms.forEach((room, roomId) => {
    // Delete empty rooms older than 5 minutes
    if (room.isEmpty() && now - room.createdAt > 300000) {
      roomsToDelete.push(roomId);
    }
  });

  roomsToDelete.forEach((roomId) => {
    rooms.delete(roomId);
    console.log(`🧹 Cleaned up empty room: ${roomId}`);
  });
}, 60000); // Check every minute

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎮  HISTORY SUFERS - MULTIPLAYER SERVER              ║
║                                                        ║
║   🚀  Server running on port ${PORT}                      ║
║   🌐  URL: http://localhost:${PORT}                       ║
║   👥  Max players per room: ${MAX_PLAYERS_PER_ROOM}       ║
║   ⏱️   Disconnect timeout: ${DISCONNECT_TIMEOUT / 1000}s    ║
║   📊  Server version: 2.0.0                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
