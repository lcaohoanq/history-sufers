/**
 * HISTORY SUFERS - LOAD TESTING
 *
 * Stress test the server with multiple simulated players
 * Run with: node load-test.js
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const NUM_ROOMS = parseInt(process.env.NUM_ROOMS) || 5;
const PLAYERS_PER_ROOM = parseInt(process.env.PLAYERS_PER_ROOM) || 50;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 60000; // 1 minute

class LoadTester {
  constructor() {
    this.clients = [];
    this.rooms = [];
    this.metrics = {
      connectionsSucceeded: 0,
      connectionsFailed: 0,
      roomsCreated: 0,
      joinsSucceeded: 0,
      joinsFailed: 0,
      racesStarted: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: [],
      latencies: []
    };
    this.startTime = null;
    this.running = false;
  }

  async run() {
    console.log(`
╔═════════════════════════════════════════════════════════════════════════╗
║  🧪 LOAD TEST STARTING                                                  ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Server: ${SERVER_URL.padEnd(44)}                                       ║
║  Rooms: ${NUM_ROOMS.toString().padEnd(47)}                              ║
║  Players per room: ${PLAYERS_PER_ROOM.toString().padEnd(36)}            ║
║  Total players: ${(NUM_ROOMS * PLAYERS_PER_ROOM).toString().padEnd(39)} ║
║  Duration: ${(TEST_DURATION / 1000).toString().padEnd(42)}s             ║
╚═════════════════════════════════════════════════════════════════════════╝
    `);

    this.startTime = Date.now();
    this.running = true;

    try {
      // Phase 1: Create rooms
      console.log('\n📝 Phase 1: Creating rooms...');
      await this.createRooms();

      // Phase 2: Add players to rooms
      console.log('\n👥 Phase 2: Adding players...');
      await this.addPlayers();

      // Phase 3: Simulate gameplay
      console.log('\n🎮 Phase 3: Simulating gameplay...');
      await this.simulateGameplay();

      // Wait for test duration
      console.log('\n⏱️  Running load test...');
      const progressInterval = this.showProgress();
      await this.wait(TEST_DURATION);
      clearInterval(progressInterval);

      // Cleanup and report
      console.log('\n\n🧹 Cleaning up...');
      await this.cleanup();
      this.generateReport();
    } catch (error) {
      console.error('\n❌ Load test failed:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  async createRooms() {
    const promises = [];

    for (let i = 0; i < NUM_ROOMS; i++) {
      promises.push(this.createRoom(i));
      await this.wait(100); // Stagger room creation
    }

    await Promise.all(promises);
    console.log(`✅ Created ${this.rooms.length} rooms`);
  }

  createRoom(roomIndex) {
    return new Promise((resolve, reject) => {
      const client = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      const timeout = setTimeout(() => {
        this.metrics.connectionsFailed++;
        this.metrics.errors.push({
          type: 'connection_timeout',
          room: roomIndex
        });
        client.disconnect();
        reject(new Error(`Room ${roomIndex} creation timeout`));
      }, 10000);

      client.on('connect', () => {
        clearTimeout(timeout);
        this.metrics.connectionsSucceeded++;

        const startTime = Date.now();
        client.emit('createRoom', { playerName: `Host_${roomIndex}` });

        client.on('roomCreated', (data) => {
          const latency = Date.now() - startTime;
          this.metrics.latencies.push(latency);
          this.metrics.roomsCreated++;

          this.rooms.push({
            roomId: data.roomId,
            host: client,
            players: [client],
            roomIndex
          });

          this.trackMessages(client);
          resolve();
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          this.metrics.errors.push({
            type: 'room_creation',
            error: err.message,
            room: roomIndex
          });
          reject(err);
        });
      });

      client.on('connect_error', (err) => {
        clearTimeout(timeout);
        this.metrics.connectionsFailed++;
        this.metrics.errors.push({
          type: 'connection_error',
          error: err.message,
          room: roomIndex
        });
        reject(err);
      });

      this.clients.push(client);
    });
  }

  async addPlayers() {
    const promises = [];

    for (const room of this.rooms) {
      for (let i = 1; i < PLAYERS_PER_ROOM; i++) {
        promises.push(this.addPlayerToRoom(room, i));
        await this.wait(50); // Stagger player joins
      }
    }

    await Promise.all(promises);
    console.log(`✅ Added ${this.clients.length - this.rooms.length} players to rooms`);
  }

  addPlayerToRoom(room, playerIndex) {
    return new Promise((resolve, reject) => {
      const client = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      const timeout = setTimeout(() => {
        this.metrics.connectionsFailed++;
        client.disconnect();
        resolve(); // Don't fail the whole test
      }, 10000);

      client.on('connect', () => {
        this.metrics.connectionsSucceeded++;

        client.emit('joinRoom', {
          roomId: room.roomId,
          playerName: `Player_${room.roomIndex}_${playerIndex}`
        });

        client.on('roomJoined', () => {
          clearTimeout(timeout);
          this.metrics.joinsSucceeded++;
          room.players.push(client);
          this.trackMessages(client);
          resolve();
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          this.metrics.joinsFailed++;
          this.metrics.errors.push({
            type: 'join_failed',
            error: err.message,
            room: room.roomId
          });
          client.disconnect();
          resolve(); // Don't fail the whole test
        });
      });

      client.on('connect_error', () => {
        clearTimeout(timeout);
        this.metrics.connectionsFailed++;
        resolve();
      });

      this.clients.push(client);
    });
  }

  trackMessages(client) {
    const events = [
      'playersUpdated',
      'playerJoined',
      'playerLeft',
      'raceStart',
      'raceCountdown',
      'raceEnded',
      'opponentUpdate',
      'playerFinishedRace',
      'notification'
    ];

    events.forEach((event) => {
      client.on(event, () => {
        this.metrics.messagesReceived++;
      });
    });
  }

  async simulateGameplay() {
    // Start races in all rooms
    for (const room of this.rooms) {
      if (room.players.length >= 2) {
        // Make all players ready
        room.players.forEach((client, index) => {
          setTimeout(() => {
            client.emit('playerReady', { ready: true });
            this.metrics.messagesSent++;
          }, index * 100);
        });

        room.host.once('raceStart', () => {
          this.metrics.racesStarted++;
          this.simulateRace(room);
        });
      }
    }

    await this.wait(5000); // Wait for all races to start
    console.log(`✅ Started ${this.metrics.racesStarted} races`);
  }

  simulateRace(room) {
    room.players.forEach((client, index) => {
      // Simulate player movements
      const updateInterval = setInterval(
        () => {
          if (!this.running) {
            clearInterval(updateInterval);
            return;
          }

          client.emit('playerUpdate', {
            position: {
              x: Math.random() * 20 - 10,
              y: Math.random() * 5,
              z: -4000 + Math.random() * 100
            },
            lane: Math.floor(Math.random() * 3),
            score: Math.floor(Math.random() * 1000)
          });
          this.metrics.messagesSent++;
        },
        500 + index * 100
      ); // Stagger updates

      // Simulate finishing after random time
      setTimeout(
        () => {
          if (this.running) {
            clearInterval(updateInterval);
            client.emit('playerFinished', {
              score: 5000 + Math.floor(Math.random() * 2000)
            });
            this.metrics.messagesSent++;
          }
        },
        10000 + Math.random() * 20000
      );
    });
  }

  showProgress() {
    let dots = 0;
    return setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.floor((TEST_DURATION - (Date.now() - this.startTime)) / 1000);

      process.stdout.write(
        `\r⏱️  Elapsed: ${elapsed}s | Remaining: ${remaining}s | ` +
          `Messages: ${this.metrics.messagesReceived} received, ${this.metrics.messagesSent} sent` +
          `${'.'.repeat(dots % 4).padEnd(3)}`
      );
      dots++;
    }, 500);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cleanup() {
    this.running = false;

    for (const client of this.clients) {
      if (client.connected) {
        client.disconnect();
      }
    }

    await this.wait(500);
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const avgLatency =
      this.metrics.latencies.length > 0
        ? Math.round(
            this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
          )
        : 0;
    const minLatency = this.metrics.latencies.length > 0 ? Math.min(...this.metrics.latencies) : 0;
    const maxLatency = this.metrics.latencies.length > 0 ? Math.max(...this.metrics.latencies) : 0;

    const messagesPerSecond = Math.round(
      (this.metrics.messagesReceived + this.metrics.messagesSent) / duration
    );
    const successRate =
      this.metrics.connectionsSucceeded > 0
        ? Math.round(
            (this.metrics.connectionsSucceeded /
              (this.metrics.connectionsSucceeded + this.metrics.connectionsFailed)) *
              100
          )
        : 0;

    console.log(`
╔═════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  📊 LOAD TEST RESULTS                                                                                       ║
╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Duration: ${duration.toFixed(1)}s                                                                          ║
║                                                                                                             ║
║  CONNECTIONS                                                                                                ║
║  ├─ Successful: ${this.metrics.connectionsSucceeded.toString().padEnd(37)}                                  ║
║  ├─ Failed: ${this.metrics.connectionsFailed.toString().padEnd(41)}                                         ║
║  └─ Success Rate: ${successRate}%                                                                           ║
║                                                                                                             ║
║  ROOMS                                                                                                      ║
║  ├─ Created: ${this.metrics.roomsCreated.toString().padEnd(40)}                                             ║
║  ├─ Races Started: ${this.metrics.racesStarted.toString().padEnd(34)}                                       ║
║  └─ Join Success: ${this.metrics.joinsSucceeded}/${this.metrics.joinsSucceeded + this.metrics.joinsFailed}  ║
║                                                                                                             ║
║  PERFORMANCE                                                                                                ║
║  ├─ Messages Received: ${this.metrics.messagesReceived.toString().padEnd(28)}                               ║
║  ├─ Messages Sent: ${this.metrics.messagesSent.toString().padEnd(32)}                                       ║
║  ├─ Messages/sec: ${messagesPerSecond.toString().padEnd(33)}                                                ║
║  ├─ Avg Latency: ${avgLatency}ms                                                                            ║
║  ├─ Min Latency: ${minLatency}ms                                                                            ║
║  └─ Max Latency: ${maxLatency}ms                                                                            ║
║                                                                                                             ║
║  ERRORS: ${this.metrics.errors.length.toString().padEnd(44)}                                                ║
╚═════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
    `);

    if (this.metrics.errors.length > 0) {
      console.log('\n❌ ERROR SUMMARY:');
      const errorTypes = {};
      this.metrics.errors.forEach((err) => {
        errorTypes[err.type] = (errorTypes[err.type] || 0) + 1;
      });

      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    console.log('\n✅ Load test completed!\n');
  }
}

// Run the load test
const tester = new LoadTester();
tester.run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
