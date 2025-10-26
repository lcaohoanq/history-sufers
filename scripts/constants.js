import { Colors } from './colors.js';
import { createBoxTexture } from './utils.js';

export const GAME_CONSTANTS = {
  START_LANE: -4,
  END_LANE: 5,
  TOC_DO_LUOT_DAT: 0.025,
  SO_LUONG_LANE: 3,
  MILE_STONES: {
    EASY: 15000,
    MEDIUM: 30000,
    HARD: 50000
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

export const CAMERA_SETTING_LIVE = {
  LEFT: { x: -2000, y: 0, z: -4000, lookAt: { x: 0, y: 0, z: -60000 } },
  CENTER: { x: 0, y: 0, z: -4000, lookAt: { x: 0, y: 0, z: -60000 } },
  RIGHT: { x: 2000, y: 0, z: -4000, lookAt: { x: 0, y: 0, z: -60000 } },
  // Optional up / down presets: tweak values to taste (closer / higher = UP, farther / lower = DOWN)
  UP: { x: 0, y: 400, z: -3200, lookAt: { x: 0, y: 300, z: -60000 } },
  DOWN: { x: 0, y: -200, z: -4800, lookAt: { x: 0, y: 0, z: -60000 } }
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

export const SIDE_OBJECTS_BY_STAGE = {
  1: [
    // Nông thôn truyền thống (0 - 30k điểm)
    { type: 'Tree', weight: 3 },
    { type: 'VillageHut', weight: 1 },
    { type: 'BambooTree', weight: 2 },
    { type: 'WaterBuffalo', weight: 0.5 },
    { type: 'RiceStorage', weight: 0.8 },
    { type: 'WindPump', weight: 0.7 }
  ],
  2: [
    // Công nghiệp hóa (30k - 60k điểm)
    { type: 'Tree', weight: 1 },
    { type: 'OldFactory', weight: 2 },
    { type: 'OldApartmentBlock', weight: 2 },
    { type: 'WindPump', weight: 1 },
    { type: 'VillageHut', weight: 0.5 }
  ],
  3: [
    // Hiện đại (60k+)
    { type: 'Tree', weight: 0.5 },
    { type: 'FiveGTower', weight: 2 },
    { type: 'MetroStation', weight: 1.5 },
    { type: 'Skyscraper', weight: 2.5 },
    { type: 'HighTechFactory', weight: 0.5 }
  ]
};
