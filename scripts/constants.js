import { Colors } from './colors.js';
import { createBoxTexture } from './utils.js';

export const GAME_CONSTANTS = {
  START_LANE: -5,
  END_LANE: 6,
  TOC_DO_LUOT_DAT: 0.025,
  SO_LUONG_LANE: 3
};

export const GROUND_KIT = {
  DUONG_NHUA: 'textures/road/Road007_1K-JPG_Color.jpg',
  DUONG_DAT: 'textures/ground/Ground067_1K-JPG_Color.jpg',
  DUONG_GACH: 'textures/brick/Bricks075A_1K-JPG_Color.jpg'
};

export const CAMERA_SETTINGS = {
  NORMAL: { x: 0, y: 700, z: -2000 },
  NGANG: { x: 300, y: 700, z: -2000 },
  NGUOC: { x: 0, y: 700, z: -7000 }
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
