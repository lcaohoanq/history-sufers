/**
 * HISTORY SURFERS - COLYSEUS GAME STATE SCHEMA
 *
 * Defines the synchronized state structure for multiplayer races
 */

import * as schema from '@colyseus/schema';
const { Schema, type, MapSchema } = schema;

/**
 * Player state synchronized across all clients
 */
export class Player extends Schema {
  constructor() {
    super();
    this.name = 'Player';
    this.score = 0;
    this.lane = 0;
    this.posX = 0;
    this.posY = 0;
    this.posZ = -4000;
    this.isJumping = false;
    this.finished = false;
    this.finishTime = 0;
    this.ready = false;
    this.status = 'online';
    this.colorShirt = 0xff0000;
    this.colorShorts = 0x8b0000;
  }
}

type('string')(Player.prototype, 'name');
type('number')(Player.prototype, 'score');
type('number')(Player.prototype, 'lane');
type('number')(Player.prototype, 'posX');
type('number')(Player.prototype, 'posY');
type('number')(Player.prototype, 'posZ');
type('boolean')(Player.prototype, 'isJumping');
type('boolean')(Player.prototype, 'finished');
type('number')(Player.prototype, 'finishTime');
type('boolean')(Player.prototype, 'ready');
type('string')(Player.prototype, 'status'); // 'online', 'offline'
type('number')(Player.prototype, 'colorShirt');
type('number')(Player.prototype, 'colorShorts');

/**
 * Main game room state
 */
export class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.state = 'waiting';
    this.countdown = 3;
    this.startTime = 0;
    this.hostId = '';
    this.maxPlayers = 50;
  }
}

type({ map: Player })(GameState.prototype, 'players');
type('string')(GameState.prototype, 'state');
type('number')(GameState.prototype, 'countdown');
type('number')(GameState.prototype, 'startTime');
type('string')(GameState.prototype, 'hostId');
type('number')(GameState.prototype, 'maxPlayers');
