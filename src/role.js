// Role system -- body proportions, role definitions, programmatic skin generation
// MC 64x64 skin UV layout based on SKIN_REGIONS from skin.js

// ---- Data structures ----

export const BODY_PROPORTIONS = {
  headWidth: 0.50, headHeight: 0.50, headDepth: 0.50,
  bodyWidth: 0.50, bodyHeight: 0.75, bodyDepth: 0.30,
  armWidth: 0.25, armHeight: 0.75, armDepth: 0.25,
  legWidth: 0.25, legHeight: 0.75, legDepth: 0.25,
};

export const ROLES = {
  steve: {
    id: 'steve',
    name: 'Steve',
    proportions: { ...BODY_PROPORTIONS },
    pet: null,
    locked: false,
    hint: null,
  },
  knight: {
    id: 'knight',
    name: '铁血战士',
    proportions: {
      headWidth: 0.55, headHeight: 0.55, headDepth: 0.55,
      bodyWidth: 0.65, bodyHeight: 0.85, bodyDepth: 0.30,
      armWidth: 0.30, armHeight: 0.85, armDepth: 0.30,
      legWidth: 0.28, legHeight: 0.80, legDepth: 0.28,
    },
    pet: 'turtle',
    locked: false,
    hint: null,
  },
  mage: {
    id: 'mage',
    name: '暮色法师',
    proportions: {
      headWidth: 0.48, headHeight: 0.48, headDepth: 0.48,
      bodyWidth: 0.42, bodyHeight: 0.80, bodyDepth: 0.30,
      armWidth: 0.20, armHeight: 0.80, armDepth: 0.20,
      legWidth: 0.22, legHeight: 0.80, legDepth: 0.22,
    },
    pet: 'parrot',
    locked: false,
    hint: null,
  },
  miner: {
    id: 'miner',
    name: '矿洞行者',
    proportions: {
      headWidth: 0.52, headHeight: 0.52, headDepth: 0.52,
      bodyWidth: 0.55, bodyHeight: 0.65, bodyDepth: 0.30,
      armWidth: 0.28, armHeight: 0.65, armDepth: 0.28,
      legWidth: 0.28, legHeight: 0.60, legDepth: 0.28,
    },
    pet: 'rabbit',
    locked: false,
    hint: null,
  },
  locked: {
    id: 'locked',
    name: '???',
    proportions: { ...BODY_PROPORTIONS },
    pet: null,
    locked: true,
    hint: '未来即将推出此角色，需要完成作业后才能玩游戏',
  },
};

// ---- Accessors ----

export function getRole(id) {
  return ROLES[id] || null;
}

export function getAvailableRoles() {
  return Object.keys(ROLES);
}

export function getUnlockedRoles() {
  return Object.keys(ROLES).filter(id => !ROLES[id].locked);
}

// ---- Programmatic 64x64 skin generation ----

function _generateSteveSkin() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);

  // Head
  ctx.fillStyle = '#C8956C';
  ctx.fillRect(8, 8, 8, 8);   // front
  ctx.fillRect(0, 8, 8, 8);    // right
  ctx.fillRect(16, 8, 8, 8);   // left
  ctx.fillRect(24, 8, 8, 8);   // back
  ctx.fillRect(8, 0, 8, 8);    // top
  ctx.fillRect(16, 0, 8, 8);   // bottom
  // Hair
  ctx.fillStyle = '#4A3728';
  ctx.fillRect(8, 8, 8, 4);    // front hair
  ctx.fillRect(0, 8, 8, 8);    // right side
  ctx.fillRect(16, 8, 8, 8);   // left side
  ctx.fillRect(24, 8, 8, 8);   // back
  ctx.fillRect(8, 0, 8, 8);    // top
  // Eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(10, 11, 2, 1);
  ctx.fillRect(14, 11, 2, 1);
  ctx.fillStyle = '#4A2DB5';
  ctx.fillRect(10, 11, 1, 1);
  ctx.fillRect(15, 11, 1, 1);
  // Mouth
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(11, 13, 4, 1);

  // Body (cyan shirt)
  ctx.fillStyle = '#00AAAA';
  ctx.fillRect(20, 20, 8, 12);  // front
  ctx.fillRect(32, 20, 8, 12);  // back
  ctx.fillRect(16, 20, 4, 12);  // right
  ctx.fillRect(28, 20, 4, 12);  // left
  ctx.fillRect(20, 16, 8, 4);   // top

  // Right arm (skin color)
  ctx.fillStyle = '#C8956C';
  ctx.fillRect(44, 20, 4, 12);
  ctx.fillRect(40, 20, 4, 12);
  ctx.fillRect(48, 20, 4, 12);
  ctx.fillRect(52, 20, 4, 12);
  ctx.fillRect(44, 16, 4, 4);

  // Left arm
  ctx.fillRect(36, 52, 4, 12);
  ctx.fillRect(32, 52, 4, 12);
  ctx.fillRect(40, 52, 4, 12);
  ctx.fillRect(44, 52, 4, 12);
  ctx.fillRect(36, 48, 4, 4);

  // Right leg (dark blue)
  ctx.fillStyle = '#2B2B7F';
  ctx.fillRect(4, 20, 4, 12);
  ctx.fillRect(0, 20, 4, 12);
  ctx.fillRect(8, 20, 4, 12);
  ctx.fillRect(12, 20, 4, 12);
  ctx.fillRect(4, 16, 4, 4);

  // Left leg
  ctx.fillRect(20, 52, 4, 12);
  ctx.fillRect(16, 52, 4, 12);
  ctx.fillRect(24, 52, 4, 12);
  ctx.fillRect(28, 52, 4, 12);
  ctx.fillRect(20, 48, 4, 4);

  // Shoes (gray)
  ctx.fillStyle = '#555555';
  ctx.fillRect(4, 29, 4, 3);
  ctx.fillRect(20, 61, 4, 3);

  return canvas;
}

function _generateKnightSkin() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);

  // ===== Head: silver/gray helmet =====
  ctx.fillStyle = '#C0C0C0';
  ctx.fillRect(8, 8, 8, 8);   // front
  ctx.fillRect(0, 8, 8, 8);    // right
  ctx.fillRect(16, 8, 8, 8);   // left
  ctx.fillRect(24, 8, 8, 8);   // back
  ctx.fillRect(8, 0, 8, 8);    // top
  ctx.fillRect(16, 0, 8, 8);   // bottom

  // Helmet visor slit (front)
  ctx.fillStyle = '#404040';
  ctx.fillRect(10, 9, 4, 1);   // visor horizontal
  ctx.fillRect(10, 12, 4, 1);  // lower visor

  // Red feather on forehead (top-front area)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(10, 0, 4, 2);   // on top
  ctx.fillRect(10, 8, 4, 2);   // on front

  // Red glowing eyes
  ctx.fillStyle = '#FF4444';
  ctx.fillRect(10, 11, 2, 1);  // left eye
  ctx.fillRect(14, 11, 2, 1);  // right eye

  // Helmet details on sides
  ctx.fillStyle = '#909090';
  ctx.fillRect(0, 9, 8, 6);    // right side detail
  ctx.fillRect(16, 9, 8, 6);   // left side detail

  // ===== Body: green armor =====
  ctx.fillStyle = '#3B7A4B';
  ctx.fillRect(20, 20, 8, 12);  // front
  ctx.fillRect(32, 20, 8, 12);  // back
  ctx.fillRect(16, 20, 4, 12);  // right
  ctx.fillRect(28, 20, 4, 12);  // left
  ctx.fillRect(20, 16, 8, 4);   // top

  // Chest plate lines (front)
  ctx.fillStyle = '#2D5E3A';
  ctx.fillRect(22, 22, 4, 1);   // upper chest line
  ctx.fillRect(22, 26, 4, 1);   // waist line
  ctx.fillRect(23, 20, 2, 8);   // center vertical line (front)

  // Armor trim on sides
  ctx.fillStyle = '#5D8A6B';
  ctx.fillRect(16, 20, 4, 12);  // right side accent
  ctx.fillRect(28, 20, 4, 12);  // left side accent

  // ===== Right arm: iron gauntlet =====
  ctx.fillStyle = '#808080';
  ctx.fillRect(44, 20, 4, 12);  // front
  ctx.fillRect(40, 20, 4, 12);  // right
  ctx.fillRect(48, 20, 4, 12);  // left
  ctx.fillRect(52, 20, 4, 12);  // back
  ctx.fillRect(44, 16, 4, 4);   // top

  // Armor pauldron detail
  ctx.fillStyle = '#606060';
  ctx.fillRect(44, 20, 4, 2);   // shoulder plate

  // ===== Left arm =====
  ctx.fillStyle = '#808080';
  ctx.fillRect(36, 52, 4, 12);  // front
  ctx.fillRect(32, 52, 4, 12);  // right
  ctx.fillRect(40, 52, 4, 12);  // left
  ctx.fillRect(44, 52, 4, 12);  // back
  ctx.fillRect(36, 48, 4, 4);   // top

  ctx.fillStyle = '#606060';
  ctx.fillRect(36, 52, 4, 2);

  // ===== Right leg: dark brown boots =====
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(4, 20, 4, 12);   // front
  ctx.fillRect(0, 20, 4, 12);   // right
  ctx.fillRect(8, 20, 4, 12);   // left
  ctx.fillRect(12, 20, 4, 12);  // back
  ctx.fillRect(4, 16, 4, 4);    // top

  // Knee pad
  ctx.fillStyle = '#4E342E';
  ctx.fillRect(4, 24, 4, 2);    // knee highlight (front)

  // Boot cuff
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(4, 29, 4, 3);    // boot bottom

  // ===== Left leg =====
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(20, 52, 4, 12);  // front
  ctx.fillRect(16, 52, 4, 12);  // right
  ctx.fillRect(24, 52, 4, 12);  // left
  ctx.fillRect(28, 52, 4, 12);  // back
  ctx.fillRect(20, 48, 4, 4);   // top

  ctx.fillStyle = '#4E342E';
  ctx.fillRect(20, 56, 4, 2);

  ctx.fillStyle = '#3E2723';
  ctx.fillRect(20, 61, 4, 3);

  return canvas;
}

function _generateMageSkin() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);

  // ===== Head: purple pointed hat =====
  ctx.fillStyle = '#7B1FA2';
  ctx.fillRect(8, 8, 8, 8);   // front
  ctx.fillRect(0, 8, 8, 8);    // right
  ctx.fillRect(16, 8, 8, 8);   // left
  ctx.fillRect(24, 8, 8, 8);   // back
  ctx.fillRect(8, 0, 8, 8);    // top
  ctx.fillRect(16, 0, 8, 8);   // bottom

  // Hat pointed top (extend upward on front face)
  ctx.fillStyle = '#6A0DAD';
  ctx.fillRect(10, 6, 4, 2);   // hat tip on front

  // Hat brim - gold band on front and sides
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(8, 14, 8, 1);   // front brim band
  ctx.fillRect(0, 14, 8, 1);   // right brim band
  ctx.fillRect(16, 14, 8, 1);  // left brim band

  // Star on hat top
  ctx.fillStyle = '#FFFF00';
  ctx.fillRect(11, 2, 2, 1);   // star glow on top
  ctx.fillRect(11, 4, 2, 1);   // star glow front

  // Purple eyes
  ctx.fillStyle = '#AA00FF';
  ctx.fillRect(10, 11, 2, 1);
  ctx.fillRect(14, 11, 2, 1);

  // ===== Body: purple robe =====
  ctx.fillStyle = '#7B1FA2';
  ctx.fillRect(20, 20, 8, 12);  // front
  ctx.fillRect(32, 20, 8, 12);  // back
  ctx.fillRect(16, 20, 4, 12);  // right
  ctx.fillRect(28, 20, 4, 12);  // left
  ctx.fillRect(20, 16, 8, 4);   // top

  // Gold trim (front)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(20, 20, 8, 1);   // collar
  ctx.fillRect(20, 29, 8, 1);   // bottom trim (front)
  ctx.fillRect(32, 29, 8, 1);   // bottom trim (back)
  ctx.fillRect(16, 20, 4, 1);   // collar right side
  ctx.fillRect(28, 20, 4, 1);   // collar left side

  // Center robe line
  ctx.fillStyle = '#9C27B0';
  ctx.fillRect(23, 21, 2, 11);  // front center

  // ===== Right arm: gold cuff =====
  ctx.fillStyle = '#6A0DAD';
  ctx.fillRect(44, 20, 4, 12);  // front
  ctx.fillRect(40, 20, 4, 12);  // right
  ctx.fillRect(48, 20, 4, 12);  // left
  ctx.fillRect(52, 20, 4, 12);  // back
  ctx.fillRect(44, 16, 4, 4);   // top

  // Gold cuff at wrist
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(44, 29, 4, 2);   // front cuff
  ctx.fillRect(40, 29, 4, 2);   // right cuff
  ctx.fillRect(48, 29, 4, 2);   // left cuff

  // ===== Left arm =====
  ctx.fillStyle = '#6A0DAD';
  ctx.fillRect(36, 52, 4, 12);  // front
  ctx.fillRect(32, 52, 4, 12);  // right
  ctx.fillRect(40, 52, 4, 12);  // left
  ctx.fillRect(44, 52, 4, 12);  // back
  ctx.fillRect(36, 48, 4, 4);   // top

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(36, 61, 4, 2);
  ctx.fillRect(32, 61, 4, 2);
  ctx.fillRect(40, 61, 4, 2);

  // ===== Right leg: deep purple robe bottom =====
  ctx.fillStyle = '#4A148C';
  ctx.fillRect(4, 20, 4, 12);   // front
  ctx.fillRect(0, 20, 4, 12);   // right
  ctx.fillRect(8, 20, 4, 12);   // left
  ctx.fillRect(12, 20, 4, 12);  // back
  ctx.fillRect(4, 16, 4, 4);    // top

  // Gold trim on robe bottom
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(4, 29, 4, 2);

  // ===== Left leg =====
  ctx.fillStyle = '#4A148C';
  ctx.fillRect(20, 52, 4, 12);  // front
  ctx.fillRect(16, 52, 4, 12);  // right
  ctx.fillRect(24, 52, 4, 12);  // left
  ctx.fillRect(28, 52, 4, 12);  // back
  ctx.fillRect(20, 48, 4, 4);   // top

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(20, 61, 4, 2);

  return canvas;
}

function _generateMinerSkin() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 64);

  // ===== Head: brown hat =====
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(8, 8, 8, 8);   // front
  ctx.fillRect(0, 8, 8, 8);    // right
  ctx.fillRect(16, 8, 8, 8);   // left
  ctx.fillRect(24, 8, 8, 8);   // back
  ctx.fillRect(8, 0, 8, 8);    // top
  ctx.fillRect(16, 0, 8, 8);   // bottom

  // Hat brim (darker)
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(8, 14, 8, 1);   // front brim
  ctx.fillRect(0, 14, 8, 1);   // right brim
  ctx.fillRect(16, 14, 8, 1);  // left brim
  ctx.fillRect(8, 8, 8, 2);    // hat shadow on forehead

  // Headlamp (yellow circle on front)
  ctx.fillStyle = '#FFFF00';
  ctx.fillRect(11, 8, 2, 2);   // headlamp glow
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(11, 8, 2, 1);   // lamp top

  // Brown eyes
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(10, 11, 2, 1);
  ctx.fillRect(14, 11, 2, 1);

  // Stubble/smudge
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(10, 13, 4, 1);

  // ===== Body: brown leather jacket =====
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(20, 20, 8, 12);  // front
  ctx.fillRect(32, 20, 8, 12);  // back
  ctx.fillRect(16, 20, 4, 12);  // right
  ctx.fillRect(28, 20, 4, 12);  // left
  ctx.fillRect(20, 16, 8, 4);   // top

  // Jacket pocket (front)
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(22, 26, 4, 3);   // pocket
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(23, 26, 2, 1);   // pocket flap

  // Jacket zipper line
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(23, 20, 1, 12);  // center line

  // ===== Right arm: iron glove =====
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(44, 20, 4, 12);  // front
  ctx.fillRect(40, 20, 4, 12);  // right
  ctx.fillRect(48, 20, 4, 12);  // left
  ctx.fillRect(52, 20, 4, 12);  // back
  ctx.fillRect(44, 16, 4, 4);   // top

  // Glove detail
  ctx.fillStyle = '#757575';
  ctx.fillRect(44, 28, 4, 4);   // glove hand area

  // ===== Left arm =====
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(36, 52, 4, 12);  // front
  ctx.fillRect(32, 52, 4, 12);  // right
  ctx.fillRect(40, 52, 4, 12);  // left
  ctx.fillRect(44, 52, 4, 12);  // back
  ctx.fillRect(36, 48, 4, 4);   // top

  ctx.fillStyle = '#757575';
  ctx.fillRect(36, 60, 4, 4);

  // ===== Right leg: gray work pants =====
  ctx.fillStyle = '#757575';
  ctx.fillRect(4, 20, 4, 12);   // front
  ctx.fillRect(0, 20, 4, 12);   // right
  ctx.fillRect(8, 20, 4, 12);   // left
  ctx.fillRect(12, 20, 4, 12);  // back
  ctx.fillRect(4, 16, 4, 4);    // top

  // Knee patch
  ctx.fillStyle = '#616161';
  ctx.fillRect(4, 24, 4, 2);

  // Work boot
  ctx.fillStyle = '#4E342E';
  ctx.fillRect(4, 29, 4, 3);

  // ===== Left leg =====
  ctx.fillStyle = '#757575';
  ctx.fillRect(20, 52, 4, 12);  // front
  ctx.fillRect(16, 52, 4, 12);  // right
  ctx.fillRect(24, 52, 4, 12);  // left
  ctx.fillRect(28, 52, 4, 12);  // back
  ctx.fillRect(20, 48, 4, 4);   // top

  ctx.fillStyle = '#616161';
  ctx.fillRect(20, 56, 4, 2);

  ctx.fillStyle = '#4E342E';
  ctx.fillRect(20, 61, 4, 3);

  return canvas;
}

export function generateRoleSkin(roleId) {
  switch (roleId) {
    case 'steve':
      return _generateSteveSkin();
    case 'knight':
      return _generateKnightSkin();
    case 'mage':
      return _generateMageSkin();
    case 'miner':
      return _generateMinerSkin();
    default:
      return _generateSteveSkin();
  }
}
