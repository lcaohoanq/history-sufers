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

export const SIDEWALK_KIT = {
  DUONG_DAT: 'textures/ground/co.jpg',
  DUONG_GACH: 'textures/brick/leda.jpg',
  DUONG_NHUA: 'textures/road/viahe.jpg'
};

export const CURB_KIT = {
  DUONG_DAT: 'textures/ground/co-1.jpg',
  DUONG_GACH: 'textures/brick/leda-1.jpg',
  DUONG_NHUA: 'textures/road/viahe-1.jpg'
};


export const CAMERA_SETTINGS = {
  NORMAL: { x: 0, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  NGANG: { x: 2000, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  LIVE: { x: 0, y: 0, z: -5000, lookAt: { x: 0, y: 0, z: -60000 } },
  HARD_CORE: { x: 0, y: 200, z: -7000, lookAt: { x: 0, y: 0, z: -5000 } }
};

export const CAMERA_SETTING_LIVE = {
  LEFT: { x: -800, y: 250, z: -4300, lookAt: { x: -800, y: 200, z: -60000 } },
  CENTER: { x: 0, y: 250, z: -4300, lookAt: { x: 0, y: 200, z: -60000 } },
  RIGHT: { x: 800, y: 250, z: -4300, lookAt: { x: 800, y: 200, z: -60000 } },
  UP: { x: 0, y: 450, z: -4200, lookAt: { x: 100, y: 400, z: -60000 } },
  DOWN: { x: 0, y: 150, z: -4200, lookAt: { x: 100, y: 100, z: -60000 } }
};

// ===== MAIN ROAD (3 LANES GIỮA) =====
export let DUONG_CHAY = createBoxTexture(
  3000, // width cho 3 lanes (800 * 3)
  20,
  120000,
  Colors.sand,
  0, // center position
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_NHUA
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
  GROUND_KIT.DUONG_DAT
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
  GROUND_KIT.DUONG_GACH
);

// ===== SIDEWALK LEFT (-4, -3, -2) =====
export let SIDEWALK_LEFT_CHAY = createBoxTexture(
  3000, // width cho 3 lanes vỉa hè trái
  20,
  120000,
  Colors.sand,
  -3000, // offset sang trái (center road là 0, mỗi lane = 800)
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_NHUA
);

export let SIDEWALK_LEFT_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  -3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_DAT
);

export let SIDEWALK_LEFT_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  -3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_GACH
);

export let CURB_LEFT_CHAY = createBoxTexture(
  80, // Chiều rộng viền
  220, // Chiều cao (từ đường lên vỉa hè)
  120000,
  Colors.grey, // Màu xám cho viền
  -1500, // Vị trí giữa đường và vỉa hè trái
  -310, // Giữa đường (-400) và vỉa hè (-380)
  -60000,
  true, // Không cần texture
  CURB_KIT.DUONG_NHUA
);

// Viền bên trong vỉa hè phải
export let CURB_LEFT_DAT = createBoxTexture(
  80,
  220,
  120000,
  Colors.grey,
  1500, // Vị trí giữa đường và vỉa hè phải
  -310,
  -60000,
  true,
  CURB_KIT.DUONG_DAT
);

export let CURB_LEFT_GACH = createBoxTexture(
  80,
  220,
  120000,
  Colors.grey,
  1500, // Vị trí giữa đường và vỉa hè phải
  -310,
  -60000,
  true,
  CURB_KIT.DUONG_GACH
);

// ===== SIDEWALK RIGHT (2, 3, 4) =====
export let SIDEWALK_RIGHT_CHAY = createBoxTexture(
  3000, // width cho 3 lanes vỉa hè phải
  20,
  120000,
  Colors.sand,
  3000, // offset sang phải
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_NHUA
);

export let SIDEWALK_RIGHT_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_DAT
);

export let SIDEWALK_RIGHT_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_GACH
);

export let CURB_RIGHT_CHAY = createBoxTexture(
  80, // Chiều rộng viền
  220, // Chiều cao (từ đường lên vỉa hè)
  120000,
  Colors.grey, // Màu xám cho viền
  -1500, // Vị trí giữa đường và vỉa hè trái
  -310, // Giữa đường (-400) và vỉa hè (-380)
  -60000,
  true, // Không cần texture
  CURB_KIT.DUONG_NHUA
);

// Viền bên trong vỉa hè phải
export let CURB_RIGHT_DAT = createBoxTexture(
  80,
  220,
  120000,
  Colors.grey,
  1500, // Vị trí giữa đường và vỉa hè phải
  -310,
  -60000,
  true,
  CURB_KIT.DUONG_DAT
);

export let CURB_RIGHT_GACH = createBoxTexture(
  80,
  220,
  120000,
  Colors.grey,
  1500, // Vị trí giữa đường và vỉa hè phải
  -310,
  -60000,
  true,
  CURB_KIT.DUONG_GACH
);

export let CURB_LEFT_INNER = createBoxTexture(
  80, // Chiều rộng viền
  220, // Chiều cao (từ đường lên vỉa hè)
  120000,
  Colors.grey, // Màu xám cho viền
  -1500, // Vị trí giữa đường và vỉa hè trái
  -310, // Giữa đường (-400) và vỉa hè (-200)
  -60000,
  false, // Không cần texture
  null
);

// Viền bên trong vỉa hè phải
export let CURB_RIGHT_INNER = createBoxTexture(
  80,
  220,
  120000,
  Colors.grey,
  1500, // Vị trí giữa đường và vỉa hè phải
  -310,
  -60000,
  false,
  null
);

export const SIDE_OBJECTS_BY_STAGE = {
  1: [
    { type: 'Tree', weight: 3 },
    { type: 'VillageHut', weight: 1 },
    { type: 'BambooTree', weight: 2 },
    { type: 'WaterBuffalo', weight: 0.5 },
    { type: 'RiceStorage', weight: 0.8 },
    { type: 'CropField', weight: 0.7 }
  ],
  2: [
    { type: 'Tree', weight: 1 },
    { type: 'OldFactory', weight: 2 },
    { type: 'House', weight: 2 },
    { type: 'CropField', weight: 0.5 },
    { type: 'VillageHut', weight: 0.5 }
  ],
  3: [
    { type: 'Tree', weight: 0.5 },
    { type: 'FiveGTower', weight: 2 },
    { type: 'MetroStation', weight: 1.5 },
    { type: 'Skyscraper', weight: 2.5 },
    { type: 'Company', weight: 0.5 }
  ]
};
