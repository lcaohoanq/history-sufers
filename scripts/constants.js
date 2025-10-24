import { Colors } from './colors.js';
import { createBoxTexture } from './utils.js';

export const GAME_CONSTANTS = {
  START_LANE: -5,
  END_LANE: 6,
  TOC_DO_LUOT_DAT: 0.025,
  SO_LUONG_LANE: 3,
  MILE_STONES: {
    EASY: 25000,
    MEDIUM: 5000,
    HARD: 10000
  }
};

export const GROUND_KIT = {
  DUONG_NHUA: 'textures/road/Road007_1K-JPG_Color.jpg',
  DUONG_DAT: 'textures/ground/Ground067_1K-JPG_Color.jpg',
  DUONG_GACH: 'textures/brick/Bricks075A_1K-JPG_Color.jpg'
};

export const CAMERA_SETTINGS = {
  NORMAL: { x: 0, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  NGANG: { x: 2000, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  LIVE: { x: 0, y: 0, z: -4000, lookAt: { x: 0, y: 0, z: -60000 } },
  HARD_CORE: { x: 0, y: 200, z: -7000, lookAt: { x: 0, y: 0, z: -5000 } }
};

export let DUONG_CHAY = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  0,
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_NHUA // path to your sand texture
);

export let DUONG_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  0,
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_DAT // path to your sand texture
);

export let DUONG_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  0,
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_GACH // path to your sand texture
);
