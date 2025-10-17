/**
 * HISTORY SUFERS - MULTIPLAYER SERVER
 *
 * Node.js + Socket.IO server for real-time multiplayer racing
 */

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS) || 50;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check endpoint for Docker
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    activePlayers: playerRooms.size,
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
  });
});

// API endpoint for server info
app.get("/api/info", (req, res) => {
  res.json({
    name: "History Sufers Multiplayer Server",
    version: "2.0.0",
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    activeRooms: rooms.size,
    activePlayers: playerRooms.size,
  });
});

// Game rooms and players
const rooms = new Map();
const playerRooms = new Map();

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
  { shirt: 0x00ff7f, shorts: 0x2e8b57 }, // Spring Green
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
    this.state = "waiting"; // waiting, racing, finished
    this.startTime = null;
    this.readyPlayers = new Set();
    this.createdAt = Date.now();
  }

  addPlayer(socketId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, reason: "room_full" };
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
      this.state === "waiting"
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

io.on("connection", (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  // Send server configuration to client
  socket.emit("serverConfig", {
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    serverVersion: "2.0.0",
  });

  // Create a new room
  socket.on("createRoom", (data) => {
    const roomId = generateRoomId();
    const room = new Room(roomId, socket.id);
    const result = room.addPlayer(socket.id, data.playerName || "Player");

    if (result.success) {
      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);

      socket.join(roomId);
      socket.emit("roomCreated", {
        roomId: roomId,
        playerId: socket.id,
        players: room.getPlayersArray(),
        maxPlayers: room.maxPlayers,
      });

      // Send notification
      socket.emit("notification", {
        type: "success",
        title: "Room Created!",
        message: `Room ${roomId} is ready. Share the code with friends!`,
        duration: 5000,
      });

      console.log(`🎮 Room created: ${roomId} by ${socket.id}`);
    } else {
      socket.emit("error", { message: "Failed to create room" });
    }
  });

  // Join an existing room
  socket.on("joinRoom", (data) => {
    const { roomId, playerName } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("error", { message: "Room not found" });
      socket.emit("notification", {
        type: "error",
        title: "Room Not Found",
        message: `Room ${roomId} doesn't exist or has been closed.`,
        duration: 5000,
      });
      return;
    }

    if (room.state !== "waiting") {
      socket.emit("error", { message: "Race already in progress" });
      socket.emit("notification", {
        type: "warning",
        title: "Race In Progress",
        message:
          "This room is currently racing. Please wait or try another room.",
        duration: 5000,
      });
      return;
    }

    const result = room.addPlayer(socket.id, playerName || "Player");

    if (result.success) {
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);

      socket.emit("roomJoined", {
        roomId: roomId,
        playerId: socket.id,
        players: room.getPlayersArray(),
        maxPlayers: room.maxPlayers,
      });

      // Notify the player who joined
      socket.emit("notification", {
        type: "success",
        title: "Joined Room!",
        message: `Welcome to room ${roomId}! ${result.playerCount}/${room.maxPlayers} players ready.`,
        duration: 4000,
      });

      // Notify other players in the room
      socket.to(roomId).emit("playerJoined", {
        players: room.getPlayersArray(),
      });

      socket.to(roomId).emit("notification", {
        type: "info",
        title: "New Player Joined",
        message: `${playerName} joined the room! (${result.playerCount}/${room.maxPlayers})`,
        duration: 3000,
      });

      console.log(
        `👥 Player ${socket.id} (${playerName}) joined room ${roomId} (${result.playerCount}/${room.maxPlayers})`
      );
    } else {
      socket.emit("error", {
        message: `Room is full (${room.maxPlayers}/${room.maxPlayers})`,
      });
      socket.emit("notification", {
        type: "error",
        title: "Room Full",
        message: `This room is full! Maximum ${room.maxPlayers} players allowed.`,
        duration: 5000,
      });
    }
  });

  // Get list of available rooms
  socket.on("listRooms", () => {
    const roomList = Array.from(rooms.values())
      .filter(
        (room) =>
          room.state === "waiting" && room.players.size < room.maxPlayers
      )
      .map((room) => {
        const hostPlayer = room.players.get(room.hostId);
        return {
          id: room.id,
          playerCount: room.players.size,
          maxPlayers: room.maxPlayers,
          hostName: hostPlayer ? hostPlayer.name : "Unknown",
        };
      });

    socket.emit("roomList", roomList);
  });

  // Player ready toggle
  socket.on("playerReady", (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player ? player.name : "Player";

    room.setPlayerReady(socket.id, data.ready);

    // Broadcast to all players in room
    io.to(roomId).emit("playersUpdated", {
      players: room.getPlayersArray(),
    });

    // Notify all players about ready status change
    const readyCount = room.readyPlayers.size;
    const totalPlayers = room.players.size;

    if (data.ready) {
      socket.to(roomId).emit("notification", {
        type: "info",
        title: "Player Ready",
        message: `${playerName} is ready! (${readyCount}/${totalPlayers})`,
        duration: 2000,
      });
    }

    // Check if race can start
    if (room.canStart()) {
      io.to(roomId).emit("notification", {
        type: "success",
        title: "All Players Ready!",
        message: `Starting race with ${totalPlayers} players...`,
        duration: 3000,
      });
      startRace(roomId, room);
    } else if (readyCount > 0) {
      // Show how many more players need to be ready
      const waitingCount = totalPlayers - readyCount;
      if (waitingCount > 0) {
        io.to(roomId).emit("notification", {
          type: "info",
          title: "Waiting for Players",
          message: `${waitingCount} player${
            waitingCount > 1 ? "s" : ""
          } need to ready up!`,
          duration: 2000,
        });
      }
    }
  });

  // Update player position and state during race
  socket.on("playerUpdate", (data) => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.state !== "racing") return;

    room.updatePlayerState(socket.id, data);

    // Broadcast to other players (not self)
    socket.to(roomId).emit("opponentUpdate", {
      playerId: socket.id,
      data: data,
    });
  });

  // Player finished race
  socket.on("playerFinished", (data) => {
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
      io.to(roomId).emit("playerFinishedRace", {
        playerId: socket.id,
        playerName: player.name,
        score: player.score,
        time: player.finishTime,
        players: room.getPlayersArray(),
      });

      // Check if all players finished
      const allFinished = Array.from(room.players.values()).every(
        (p) => p.finished
      );
      if (allFinished) {
        endRace(roomId, room);
      }
    }
  });

  // Leave room
  socket.on("leaveRoom", () => {
    handlePlayerLeave(socket.id);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    handlePlayerLeave(socket.id);
  });
});

function startRace(roomId, room) {
  room.state = "racing";
  room.startTime = Date.now();

  const playerCount = room.players.size;

  // Reset all players
  room.players.forEach((player) => {
    player.score = 0;
    player.finished = false;
    player.finishTime = null;
  });

  // Countdown notifications
  io.to(roomId).emit("raceCountdown", { countdown: 3 });
  io.to(roomId).emit("notification", {
    type: "warning",
    title: "Race Starting!",
    message: `Get ready! ${playerCount} racers competing...`,
    duration: 3000,
  });

  setTimeout(() => {
    io.to(roomId).emit("raceStart", {
      startTime: room.startTime,
      players: room.getPlayersArray(),
    });

    io.to(roomId).emit("notification", {
      type: "success",
      title: "GO! 🏁",
      message: "Race has started! Good luck!",
      duration: 2000,
    });

    console.log(
      `🏁 Race started in room ${roomId} with ${playerCount} players`
    );
  }, 3000);
}

function endRace(roomId, room) {
  room.state = "finished";

  // Calculate rankings
  const rankings = Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      playerName: player.name,
      score: player.score,
      time: player.finishTime,
    }));

  io.to(roomId).emit("raceEnded", { rankings });

  console.log(`Race ended in room ${roomId}`);

  // Reset room after 10 seconds
  setTimeout(() => {
    room.state = "waiting";
    room.readyPlayers.clear();
    room.players.forEach((player) => {
      player.ready = false;
      player.finished = false;
      player.finishTime = null;
      player.score = 0;
    });

    io.to(roomId).emit("raceReset", {
      players: room.getPlayersArray(),
    });
  }, 10000);
}

function handlePlayerLeave(socketId) {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.get(socketId);
  const playerName = player ? player.name : "A player";
  const wasReady = player ? player.ready : false;

  room.removePlayer(socketId);
  playerRooms.delete(socketId);

  const remainingPlayers = room.players.size;

  // Notify other players
  io.to(roomId).emit("playerLeft", {
    playerId: socketId,
    players: room.getPlayersArray(),
  });

  if (remainingPlayers > 0) {
    io.to(roomId).emit("notification", {
      type: "warning",
      title: "Player Left",
      message: `${playerName} left the room. (${remainingPlayers} remaining)`,
      duration: 3000,
    });
  }

  // Delete room if empty
  if (room.isEmpty()) {
    rooms.delete(roomId);
    console.log(`🗑️  Room ${roomId} deleted (empty)`);
  } else if (room.hostId === socketId && room.players.size > 0) {
    // Assign new host
    const newHostId = room.players.keys().next().value;
    const newHost = room.players.get(newHostId);
    room.hostId = newHostId;

    io.to(roomId).emit("newHost", { hostId: newHostId });
    io.to(roomId).emit("notification", {
      type: "info",
      title: "New Host",
      message: `${newHost.name} is now the room host.`,
      duration: 3000,
    });

    console.log(`👑 New host assigned in room ${roomId}: ${newHostId}`);
  }

  console.log(`👋 Player ${socketId} (${playerName}) left room ${roomId}`);
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

http.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎮  HISTORY SUFERS - MULTIPLAYER SERVER                   ║
║                                                        ║
║   🚀  Server running on port ${PORT}                      ║
║   🌐  URL: http://localhost:${PORT}                     ║
║   👥  Max players per room: ${MAX_PLAYERS_PER_ROOM}                      ║
║   📊  Server version: 2.0.0                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
