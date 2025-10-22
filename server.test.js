/**
 * HISTORY SUFERS - SERVER TESTS
 *
 * Test suite for multiplayer server functionality
 * Run with: npm test
 */

const io = require('socket.io-client');
const http = require('http');
const { expect } = require('chai');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const SOCKET_OPTIONS = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

describe('History Sufers Multiplayer Server', function () {
  this.timeout(15000);

  describe('Health Check API', () => {
    it('should return server health status', (done) => {
      http.get(`${SERVER_URL}/health`, (res) => {
        expect(res.statusCode).to.equal(200);

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const health = JSON.parse(data);
          expect(health).to.have.property('status', 'ok');
          expect(health).to.have.property('uptime');
          expect(health).to.have.property('rooms');
          expect(health).to.have.property('activePlayers');
          done();
        });
      });
    });

    it('should return server info', (done) => {
      http.get(`${SERVER_URL}/api/info`, (res) => {
        expect(res.statusCode).to.equal(200);

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const info = JSON.parse(data);
          expect(info).to.have.property('name');
          expect(info).to.have.property('version');
          expect(info).to.have.property('maxPlayersPerRoom');
          done();
        });
      });
    });
  });

  describe('Socket Connection', () => {
    let client;

    afterEach((done) => {
      if (client && client.connected) {
        client.disconnect();
      }
      setTimeout(done, 100);
    });

    it('should connect to server', (done) => {
      client = io(SERVER_URL, SOCKET_OPTIONS);

      client.on('connect', () => {
        expect(client.connected).to.be.true;
        done();
      });

      client.on('connect_error', done);
    });

    it('should receive server config on connect', (done) => {
      client = io(SERVER_URL, SOCKET_OPTIONS);

      client.on('serverConfig', (config) => {
        expect(config).to.have.property('maxPlayersPerRoom');
        expect(config).to.have.property('serverVersion');
        done();
      });
    });
  });

  describe('Room Management', () => {
    let client1, client2;

    afterEach((done) => {
      if (client1 && client1.connected) client1.disconnect();
      if (client2 && client2.connected) client2.disconnect();
      setTimeout(done, 300);
    });

    it('should create a room', (done) => {
      client1 = io(SERVER_URL, SOCKET_OPTIONS);

      client1.on('connect', () => {
        client1.emit('createRoom', { playerName: 'TestPlayer1' });
      });

      client1.on('roomCreated', (data) => {
        expect(data).to.have.property('roomId');
        expect(data).to.have.property('playerId');
        expect(data).to.have.property('players');
        expect(data.players).to.have.lengthOf(1);
        done();
      });
    });

    it('should join an existing room', (done) => {
      client1 = io(SERVER_URL, SOCKET_OPTIONS);
      client2 = io(SERVER_URL, SOCKET_OPTIONS);

      let roomId;
      let client1Connected = false;
      let client2Connected = false;

      client1.on('connect', () => {
        client1Connected = true;
        client1.emit('createRoom', { playerName: 'Host' });
      });

      client1.on('roomCreated', (data) => {
        roomId = data.roomId;

        // Wait for client2 to connect before joining
        if (client2Connected) {
          client2.emit('joinRoom', {
            roomId: roomId,
            playerName: 'Guest'
          });
        }
      });

      client2.on('connect', () => {
        client2Connected = true;

        // If room already created, join immediately
        if (roomId) {
          client2.emit('joinRoom', {
            roomId: roomId,
            playerName: 'Guest'
          });
        }
      });

      client2.on('roomJoined', (data) => {
        expect(data.roomId).to.equal(roomId);
        expect(data.players).to.have.lengthOf(2);
        done();
      });

      client2.on('error', (err) => {
        done(new Error(err.message));
      });
    });

    it('should fail to join non-existent room', (done) => {
      client1 = io(SERVER_URL, SOCKET_OPTIONS);

      client1.on('connect', () => {
        client1.emit('joinRoom', {
          roomId: 'INVALID',
          playerName: 'Test'
        });
      });

      client1.on('error', (data) => {
        expect(data.message).to.include('not found');
        done();
      });
    });

    it('should list available rooms', (done) => {
      client1 = io(SERVER_URL, SOCKET_OPTIONS);

      client1.on('connect', () => {
        client1.emit('createRoom', { playerName: 'Host' });
      });

      client1.on('roomCreated', () => {
        setTimeout(() => {
          client1.emit('listRooms');
        }, 100);
      });

      client1.on('roomList', (rooms) => {
        expect(rooms).to.be.an('array');
        expect(rooms.length).to.be.at.least(1);
        if (rooms.length > 0) {
          expect(rooms[0]).to.have.property('id');
          expect(rooms[0]).to.have.property('playerCount');
        }
        done();
      });
    });
  });

  describe('Player Ready System', () => {
    let host, guest;
    let roomId;

    beforeEach(async function () {
      this.timeout(15000); // 15s

      host = io(SERVER_URL, SOCKET_OPTIONS);
      guest = io(SERVER_URL, SOCKET_OPTIONS);

      // Wait for both to connect first
      await Promise.all([
        new Promise((resolve, reject) => {
          host.on('connect', resolve);
          host.on('connect_error', reject);
        }),
        new Promise((resolve, reject) => {
          guest.on('connect', resolve);
          guest.on('connect_error', reject);
        })
      ]);

      // Attach event handlers before emitting
      const roomId = await new Promise((resolve, reject) => {
        host.on('roomCreated', (data) => resolve(data.roomId));
        host.on('error', reject);
        host.emit('createRoom', { playerName: 'Host' });
      });

      await new Promise((resolve, reject) => {
        guest.on('roomJoined', resolve);
        guest.on('error', reject);
        guest.emit('joinRoom', { roomId, playerName: 'Guest' });
      });

      // Give sockets a short sync delay
      await new Promise((res) => setTimeout(res, 200));
    });

    afterEach((done) => {
      if (host && host.connected) host.disconnect();
      if (guest && guest.connected) guest.disconnect();
      setTimeout(done, 300);
    });

    it('should update player ready status', (done) => {
      host.emit('playerReady', { ready: true });

      host.on('playersUpdated', (data) => {
        const readyPlayers = data.players.filter((p) => p.ready);
        expect(readyPlayers.length).to.be.at.least(1);
        done();
      });
    });

    it('should start race when all players ready', (done) => {
      host.emit('playerReady', { ready: true });

      setTimeout(() => {
        guest.emit('playerReady', { ready: true });
      }, 200);

      host.on('raceStart', (data) => {
        expect(data).to.have.property('startTime');
        expect(data).to.have.property('players');
        done();
      });
    });
  });

  describe('Race Mechanics', () => {
    let host, guest;
    let roomId;

    beforeEach(async function () {
      this.timeout(200000); // 15s

      host = io(SERVER_URL, SOCKET_OPTIONS);
      guest = io(SERVER_URL, SOCKET_OPTIONS);

      // Wait for both to connect first
      await Promise.all([
        new Promise((resolve, reject) => {
          host.on('connect', resolve);
          host.on('connect_error', reject);
        }),
        new Promise((resolve, reject) => {
          guest.on('connect', resolve);
          guest.on('connect_error', reject);
        })
      ]);

      // Attach event handlers before emitting
      const roomId = await new Promise((resolve, reject) => {
        host.on('roomCreated', (data) => resolve(data.roomId));
        host.on('error', reject);
        host.emit('createRoom', { playerName: 'Host' });
      });

      await new Promise((resolve, reject) => {
        guest.on('roomJoined', resolve);
        guest.on('error', reject);
        guest.emit('joinRoom', { roomId, playerName: 'Guest' });
      });

      // Give sockets a short sync delay
      await new Promise((res) => setTimeout(res, 200));
    });

    afterEach((done) => {
      if (host && host.connected) host.disconnect();
      if (guest && guest.connected) guest.disconnect();
      setTimeout(done, 300);
    });

    it('should broadcast player updates during race', (done) => {
      host.emit('playerUpdate', {
        position: { x: 10, y: 5, z: -3900 },
        lane: 1,
        score: 100
      });

      guest.on('opponentUpdate', (data) => {
        expect(data).to.have.property('playerId');
        expect(data.data).to.have.property('position');
        expect(data.data).to.have.property('score');
        done();
      });
    });

    it('should handle player finishing race', (done) => {
      host.emit('playerFinished', { score: 5000 });

      guest.on('playerFinishedRace', (data) => {
        expect(data).to.have.property('playerId');
        expect(data).to.have.property('score');
        expect(data).to.have.property('time');
        done();
      });
    });

    it('should end race when all players finish', (done) => {
      host.emit('playerFinished', { score: 5000 });

      setTimeout(() => {
        guest.emit('playerFinished', { score: 4500 });
      }, 200);

      host.on('raceEnded', (data) => {
        expect(data).to.have.property('rankings');
        expect(data.rankings).to.have.lengthOf(2);
        expect(data.rankings[0].rank).to.equal(1);
        done();
      });
    });
  });

  describe('Player Disconnection', () => {
    let host, guest;
    let roomId;

    beforeEach(async function () {
      this.timeout(15000); // 15s

      host = io(SERVER_URL, SOCKET_OPTIONS);
      guest = io(SERVER_URL, SOCKET_OPTIONS);

      // Wait for both to connect first
      await Promise.all([
        new Promise((resolve, reject) => {
          host.on('connect', resolve);
          host.on('connect_error', reject);
        }),
        new Promise((resolve, reject) => {
          guest.on('connect', resolve);
          guest.on('connect_error', reject);
        })
      ]);

      // Attach event handlers before emitting
      const roomId = await new Promise((resolve, reject) => {
        host.on('roomCreated', (data) => resolve(data.roomId));
        host.on('error', reject);
        host.emit('createRoom', { playerName: 'Host' });
      });

      await new Promise((resolve, reject) => {
        guest.on('roomJoined', resolve);
        guest.on('error', reject);
        guest.emit('joinRoom', { roomId, playerName: 'Guest' });
      });

      // Give sockets a short sync delay
      await new Promise((res) => setTimeout(res, 200));
    });

    afterEach((done) => {
      if (host && host.connected) host.disconnect();
      if (guest && guest.connected) guest.disconnect();
      setTimeout(done, 300);
    });

    it('should notify other players when someone leaves', (done) => {
      host.on('playerLeft', (data) => {
        expect(data).to.have.property('playerId');
        expect(data.players).to.have.lengthOf(1);
        done();
      });

      setTimeout(() => {
        guest.disconnect();
      }, 200);
    });

    it('should assign new host when host leaves', (done) => {
      guest.on('newHost', (data) => {
        expect(data).to.have.property('hostId');
        done();
      });

      setTimeout(() => {
        host.disconnect();
      }, 200);
    });
  });

  describe('Stress Testing', () => {
    it('should handle multiple simultaneous connections', function (done) {
      this.timeout(20000);

      const clients = [];
      const connectCount = 10;
      let connected = 0;

      for (let i = 0; i < connectCount; i++) {
        const client = io(SERVER_URL, SOCKET_OPTIONS);

        client.on('connect', () => {
          connected++;
          if (connected === connectCount) {
            // Cleanup
            clients.forEach((c) => c.disconnect());
            setTimeout(done, 200);
          }
        });

        client.on('connect_error', (err) => {
          clients.forEach((c) => c.disconnect());
          done(err);
        });

        clients.push(client);
      }
    });
  });
});
