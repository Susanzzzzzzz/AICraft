import * as THREE from 'three';

const SIZE = 16;
const cache = {};

// Block colors matching world.js BLOCK_COLORS
const C = {
  GRASS:       { r: 0x4C, g: 0xAF, b: 0x50 }, // 0x4CAF50
  DIRT:        { r: 0x8D, g: 0x6E, b: 0x63 }, // 0x8D6E63
  STONE:       { r: 0x9E, g: 0x9E, b: 0x9E }, // 0x9E9E9E
  WOOD:        { r: 0x79, g: 0x55, b: 0x48 }, // 0x795548
  BRICK:       { r: 0xC6, g: 0x28, b: 0x28 }, // 0xC62828
  WATER:       { r: 0x1E, g: 0x88, b: 0xE5 }, // 0x1E88E5
  LEAVES:      { r: 0x66, g: 0xBB, b: 0x6A }, // 0x66BB6A
  FLOWER:      { r: 0xFF, g: 0x70, b: 0x43 }, // 0xFF7043
  MUD:         { r: 0x5D, g: 0x40, b: 0x37 }, // 0x5D4037
  CLAY:        { r: 0x90, g: 0xA4, b: 0xAE }, // 0x90A4AE
  LILY_PAD:    { r: 0x4C, g: 0xAF, b: 0x50 }, // 0x4CAF50
  REED:        { r: 0x82, g: 0x77, b: 0x17 }, // 0x827717
  COAL_ORE:    { r: 0x2C, g: 0x2C, b: 0x2C }, // 0x2C2C2C
  IRON_ORE:    { r: 0xD4, g: 0xA5, b: 0x74 }, // 0xD4A574
  GOLD_ORE:    { r: 0xFF, g: 0xD7, b: 0x00 }, // 0xFFD700
  DIAMOND_ORE: { r: 0x2B, g: 0xD2, b: 0xE8 }, // 0x2BD2E8
  REDSTONE_ORE:{ r: 0xCC, g: 0x00, b: 0x00 }, // 0xCC0000
  LAPIS_ORE:   { r: 0x1E, g: 0x3A, b: 0x8F }, // 0x1E3A8F
  SAND:        { r: 0xE8, g: 0xD5, b: 0xA3 }, // 0xE8D5A3
  GRAVEL:      { r: 0x9E, g: 0x9E, b: 0x9E }, // 0x9E9E9E
  SNOW:        { r: 0xFF, g: 0xFF, b: 0xFF }, // 0xFFFFFF
  CACTUS:      { r: 0x2E, g: 0x7D, b: 0x32 }, // 0x2E7D32
};

// ----------------------------------------------------------------
// Pixel-level helpers
// ----------------------------------------------------------------

function initData() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(SIZE, SIZE);
  const data = imageData.data;
  return { canvas, ctx, imageData, data };
}

function px(data, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  data[i]     = r & 0xFF;
  data[i + 1] = g & 0xFF;
  data[i + 2] = b & 0xFF;
  data[i + 3] = a;
}

function readPX(data, x, y) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return null;
  const i = (y * SIZE + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

function fillAll(data, r, g, b, a = 255) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(data, x, y, r, g, b, a);
    }
  }
}

function fillRect(data, x1, y1, x2, y2, r, g, b, a = 255) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      px(data, x, y, r, g, b, a);
    }
  }
}

function scatter(data, r, g, b, count, a = 255) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    px(data, x, y, r, g, b, a);
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function ri(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// ----------------------------------------------------------------
// Individual texture generators
// ----------------------------------------------------------------

function genGrass(data) {
  const g = C.GRASS;
  const d = C.DIRT;

  // Brown dirt base
  fillAll(data, d.r, d.g, d.b);

  // Green top 4 rows
  fillRect(data, 0, 0, 15, 3, g.r, g.g, g.b);

  // Transition row 3 — mix of green and dirt pixels
  for (let x = 0; x < SIZE; x++) {
    const src = Math.random() > 0.4 ? g : d;
    px(data, x, 3, src.r, src.g, src.b);
  }

  // Scatter green flecks into the dirt section
  scatter(data, g.r - 5, g.g + 5, g.b, 18);

  // Darker brown speckles in dirt
  scatter(data, d.r - 35, d.g - 20, d.b - 15, 12);

  // Noise pixels in the green cap
  for (let y = 0; y <= 2; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.random() < 0.15) {
        px(data, x, y,
          clamp(g.r + ri(-15, 15), 0, 255),
          clamp(g.g + ri(-10, 10), 0, 255),
          clamp(g.b + ri(-10, 10), 0, 255));
      }
    }
  }
}

function genDirt(data) {
  const d = C.DIRT;
  fillAll(data, d.r, d.g, d.b);

  // Darker brown speckles
  scatter(data, d.r - 40, d.g - 28, d.b - 18, 28);
  // Slightly lighter speckles
  scatter(data, d.r + 12, d.g + 8, d.b + 5, 14);
  // Small clusters (2x2 dark patches)
  for (let i = 0; i < 4; i++) {
    const cx = ri(0, 13);
    const cy = ri(0, 13);
    fillRect(data, cx, cy, cx + 1, cy + 1, d.r - 50, d.g - 35, d.b - 22);
  }
}

function genStone(data) {
  const s = C.STONE;
  fillAll(data, s.r, s.g, s.b);

  // Heavy granite-like noise
  for (let i = 0; i < 100; i++) {
    const x = ri(0, 15);
    const y = ri(0, 15);
    const shade = ri(-25, 25);
    px(data, x, y,
      clamp(s.r + shade, 0, 255),
      clamp(s.g + shade, 0, 255),
      clamp(s.b + shade, 0, 255));
  }

  // Dark crack lines
  for (let i = 0; i < 6; i++) {
    const x = ri(0, 15);
    const y = ri(0, 13);
    const dx = ri(-1, 1);
    const dy = ri(1, 2);
    fillRect(data, x, y, x + dx, y + dy, s.r - 45, s.g - 45, s.b - 45);
  }
}

function genWood(data) {
  const w = C.WOOD;
  fillAll(data, w.r, w.g, w.b);

  // Vertical bark grooves (darker stripes)
  for (let x = 0; x < SIZE; x++) {
    if (x % 3 === 0 || x % 5 === 0) {
      const darken = ri(30, 50);
      for (let y = 0; y < SIZE; y++) {
        if (Math.random() < 0.75) {
          px(data, x, y,
            clamp(w.r - darken, 0, 255),
            clamp(w.g - ri(20, 35), 0, 255),
            clamp(w.b - ri(15, 25), 0, 255));
        }
      }
    }
  }

  // Horizontal splits / cracks
  for (let y = 2; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x += 3) {
      if (Math.random() < 0.5) {
        fillRect(data, x, y, x + ri(0, 2), y, w.r - 55, w.g - 40, w.b - 28);
      }
    }
  }

  // Lighter grain highlights
  scatter(data, w.r + 18, w.g + 12, w.b + 8, 12);
}

function genBrick(data) {
  const b = C.BRICK;
  const mortar = { r: 195, g: 190, b: 185 };

  fillAll(data, b.r, b.g, b.b);

  // Horizontal mortar lines every 4 rows
  for (let y = 3; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x++) {
      px(data, x, y, mortar.r, mortar.g, mortar.b);
    }
  }

  // Vertical mortar lines — staggered by row
  for (let row = 0; row < 4; row++) {
    const yOff = row * 4;
    const stagger = row % 2 === 0 ? 0 : 4;
    for (let x = stagger; x < SIZE; x += 8) {
      for (let y = yOff; y < yOff + 3 && y < SIZE; y++) {
        px(data, x, y, mortar.r, mortar.g, mortar.b);
      }
    }
  }

  // Brick colour variation (lighter & darker)
  scatter(data, b.r + 25, b.g + 8, b.b + 5, 18);
  scatter(data, b.r - 22, b.g - 6, b.b - 4, 12);
}

function genWater(data) {
  const w = C.WATER;
  fillAll(data, w.r, w.g, w.b);

  // Horizontal wave bands
  for (let y = 0; y < SIZE; y++) {
    const wave = Math.sin(y * 1.1) * 12;
    for (let x = 0; x < SIZE; x++) {
      const r = clamp(w.r + wave + ri(-4, 4), 0, 255);
      const g = clamp(w.g + wave + ri(-4, 4), 0, 255);
      const b2 = clamp(w.b + wave * 0.6 + ri(-4, 4), 0, 255);
      px(data, x, y, r, g, b2);
    }
  }

  // Bright wave crest highlights
  for (let y = 1; y < SIZE; y += 3) {
    for (let x = 0; x < SIZE; x += 2) {
      if (Math.random() < 0.45) {
        px(data, x, y,
          clamp(w.r + 45, 0, 255),
          clamp(w.g + 45, 0, 255),
          clamp(w.b + 30, 0, 255));
      }
    }
  }
}

function genLeaves(data) {
  const l = C.LEAVES;

  // Darker base
  fillAll(data, l.r - 30, l.g - 20, l.b - 15);

  // Dense scatter of leaf pixels at various brightnesses
  for (let i = 0; i < 140; i++) {
    const x = ri(0, 15);
    const y = ri(0, 15);
    const t = Math.random();
    let r, g, bb;
    if (t < 0.2) {
      r = l.r - 45; g = l.g - 30; bb = l.b - 20;   // shadow
    } else if (t < 0.5) {
      r = l.r; g = l.g; bb = l.b;                    // base
    } else {
      r = l.r + 35; g = l.g + 25; bb = l.b + 15;    // highlight
    }
    px(data, x, y, clamp(r, 0, 255), clamp(g, 0, 255), clamp(bb, 0, 255));
  }

  // Leaf clumps (small 2x2 clusters)
  for (let i = 0; i < 7; i++) {
    const cx = ri(0, 13);
    const cy = ri(0, 13);
    fillRect(data, cx, cy, cx + 1, cy + 1,
      l.r + 20, l.g + 30, l.b + 10);
  }
}

function genFlower(data) {
  // Start with a grass-like base
  genGrass(data);

  const f = C.FLOWER;
  const cx = 8, cy = 5;

  // Horizontal petals
  for (let x = cx - 4; x <= cx + 4; x++) {
    px(data, x, cy, f.r, f.g, f.b);
    if (x % 2 === 0) px(data, x, cy - 1, f.r - 15, f.g, f.b);
  }

  // Vertical petals
  for (let y = cy - 4; y <= cy + 4; y++) {
    px(data, cx, y, f.r, f.g, f.b);
    if (y % 2 === 0) px(data, cx - 1, y, f.r - 15, f.g, f.b);
  }

  // Diagonal petals
  for (let i = -3; i <= 3; i++) {
    px(data, cx + i, cy + i, f.r - 5, f.g, f.b);
    px(data, cx - i, cy + i, f.r - 5, f.g, f.b);
  }

  // Centre (yellow)
  fillRect(data, cx - 1, cy - 1, cx + 1, cy + 1, 255, 230, 50);

  // Green stem
  for (let y = cy + 5; y < SIZE; y++) {
    px(data, cx, y, 30, 130, 30);
    px(data, cx - 1, y, 25, 110, 25);
  }
}

function genMud(data) {
  const m = C.MUD;
  fillAll(data, m.r, m.g, m.b);

  // Darker patches for depth
  scatter(data, m.r - 28, m.g - 22, m.b - 16, 22);
  // Slightly lighter variations
  scatter(data, m.r + 12, m.g + 8, m.b + 5, 16);

  // Horizontal wet streaks
  for (let y = 2; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x += 2) {
      if (Math.random() < 0.5) {
        px(data, x, y,
          clamp(m.r - 18, 0, 255),
          clamp(m.g - 12, 0, 255),
          clamp(m.b - 6, 0, 255));
      }
    }
  }
}

function genClay(data) {
  const c = C.CLAY;
  fillAll(data, c.r, c.g, c.b);

  // Very subtle variation
  scatter(data, c.r + 10, c.g + 8, c.b + 10, 25);
  scatter(data, c.r - 6, c.g - 5, c.b - 4, 18);

  // Soft horizontal layers
  for (let y = 0; y < SIZE; y += 3) {
    for (let x = 0; x < SIZE; x += 2) {
      if (Math.random() < 0.6) {
        px(data, x, y,
          clamp(c.r - 10, 0, 255),
          clamp(c.g - 8, 0, 255),
          clamp(c.b - 5, 0, 255));
      }
    }
  }
}

function genLilyPad(data) {
  const lp = C.LILY_PAD;
  const cx = 8, cy = 8;

  // Fill with transparent first
  fillAll(data, 0, 0, 0, 0);

  // Draw an elliptical disc
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy * 1.6);
      const alpha = dist <= 5 ? 230 : (dist <= 6.5 ? 130 : 0);
      if (alpha > 0) {
        // Base colour with slight radial shading
        const shade = 1 - dist / 7;
        px(data, x, y,
          clamp(lp.r - 15 + shade * 15, 0, 255),
          clamp(lp.g - 10 + shade * 20, 0, 255),
          clamp(lp.b - 10 + shade * 10, 0, 255),
          alpha);
      }
    }
  }

  // Veins radiating from centre
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  for (const angle of angles) {
    const rad = angle * Math.PI / 180;
    for (let dist = 2; dist <= 5; dist++) {
      const vx = Math.round(cx + Math.cos(rad) * dist);
      const vy = Math.round(cy + Math.sin(rad) * dist);
      if (vx >= 0 && vx < SIZE && vy >= 0 && vy < SIZE) {
        const existing = readPX(data, vx, vy);
        if (existing && existing.a > 0) {
          px(data, vx, vy,
            clamp(lp.r + 25, 0, 255),
            clamp(lp.g + 35, 0, 255),
            clamp(lp.b + 15, 0, 255));
        }
      }
    }
  }

  // Centre dot
  px(data, cx, cy, lp.r + 30, lp.g + 45, lp.b + 20, 240);
}

function genReed(data) {
  const r = C.REED;
  fillAll(data, r.r, r.g, r.b);

  // Horizontal banding
  for (let y = 0; y < SIZE; y++) {
    const band = y % 4 < 2 ? 28 : -18;
    for (let x = 0; x < SIZE; x++) {
      px(data, x, y,
        clamp(r.r + band + ri(-6, 6), 0, 255),
        clamp(r.g + band + ri(-6, 6), 0, 255),
        clamp(r.b + band + ri(-4, 4), 0, 255));
    }
  }

  // Vertical grooves
  for (let x = 2; x < SIZE; x += 4) {
    for (let y = 0; y < SIZE; y++) {
      if (Math.random() < 0.4) {
        px(data, x, y,
          clamp(r.r - 22, 0, 255),
          clamp(r.g - 12, 0, 255),
          clamp(r.b - 6, 0, 255));
      }
    }
  }
}

function genOre(data, oc, count) {
  const s = C.STONE;

  // Stone base with noise
  fillAll(data, s.r, s.g, s.b);
  for (let i = 0; i < 60; i++) {
    const x = ri(0, 15);
    const y = ri(0, 15);
    const sh = ri(-20, 20);
    px(data, x, y,
      clamp(s.r + sh, 0, 255),
      clamp(s.g + sh, 0, 255),
      clamp(s.b + sh, 0, 255));
  }

  // Ore vein clusters
  for (let i = 0; i < count; i++) {
    const ncx = ri(0, 13);
    const ncy = ri(0, 13);
    const sz = ri(1, 2);
    for (let dx = 0; dx < sz; dx++) {
      for (let dy = 0; dy < sz; dy++) {
        const sx = ncx + dx;
        const sy = ncy + dy;
        if (sx < SIZE && sy < SIZE) {
          px(data, sx, sy,
            clamp(oc.r + ri(-8, 8), 0, 255),
            clamp(oc.g + ri(-8, 8), 0, 255),
            clamp(oc.b + ri(-8, 8), 0, 255));
        }
      }
    }
  }

  // A few lonely ore pixels
  scatter(data,
    clamp(oc.r, 0, 255),
    clamp(oc.g, 0, 255),
    clamp(oc.b, 0, 255), 6);
}

function genSand(data) {
  const s = C.SAND;
  fillAll(data, s.r, s.g, s.b);

  // Grain variation
  scatter(data, s.r - 22, s.g - 16, s.b - 10, 24);
  scatter(data, s.r + 15, s.g + 10, s.b + 5, 18);
  scatter(data, s.r - 38, s.g - 28, s.b - 16, 10);

  // Small darker "pebble" spots
  for (let i = 0; i < 4; i++) {
    const x = ri(0, 14);
    const y = ri(0, 14);
    fillRect(data, x, y, x + 1, y + 1,
      s.r - 40, s.g - 30, s.b - 18);
  }
}

function genGravel(data) {
  const g = C.GRAVEL;
  fillAll(data, g.r, g.g, g.b);

  // Dark speckles
  scatter(data, g.r - 55, g.g - 55, g.b - 55, 35);
  scatter(data, g.r + 22, g.g + 22, g.b + 22, 18);

  // Small 2x2 gravel chunks
  for (let i = 0; i < 8; i++) {
    const x = ri(0, 13);
    const y = ri(0, 13);
    const shade = ri(-30, -15);
    fillRect(data, x, y, x + 1, y + 1,
      clamp(g.r + shade, 0, 255),
      clamp(g.g + shade, 0, 255),
      clamp(g.b + shade, 0, 255));
  }
}

function genSnow(data) {
  fillAll(data, 255, 255, 255);

  // Very faint blue tint pixels
  scatter(data, 235, 240, 255, 20);
  scatter(data, 225, 232, 248, 10);

  // Bright white highlights
  scatter(data, 255, 255, 255, 30);

  // Subtle light-blue horizontal bands
  for (let y = 0; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.random() < 0.35) {
        px(data, x, y, 235, 242, 255);
      }
    }
  }
}

function genCactus(data) {
  const c = C.CACTUS;
  fillAll(data, c.r, c.g, c.b);

  // Lighter green horizontal stripes every 4 rows
  for (let y = 2; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x++) {
      const light = ri(18, 35);
      px(data, x, y,
        clamp(c.r + light, 0, 255),
        clamp(c.g + light + 10, 0, 255),
        clamp(c.b + light - 5, 0, 255));
    }
  }

  // Spines / small dots
  for (let i = 0; i < 18; i++) {
    const x = ri(0, 15);
    const y = ri(0, 15);
    px(data, x, y,
      clamp(c.r + 35, 0, 255),
      clamp(c.g + 45, 0, 255),
      clamp(c.b + 25, 0, 255));
  }

  // Darker vertical ribs
  for (let x = 3; x < SIZE; x += 5) {
    for (let y = 0; y < SIZE; y++) {
      if (Math.random() < 0.5) {
        px(data, x, y,
          clamp(c.r - 22, 0, 255),
          clamp(c.g - 16, 0, 255),
          clamp(c.b - 10, 0, 255));
      }
    }
  }
}

function genChest(data) {
  const w = C.WOOD;
  fillAll(data, w.r, w.g, w.b);

  // Darker wood base
  for (let i = 0; i < 60; i++) {
    const x = ri(0, 15);
    const y = ri(0, 15);
    const dark = ri(20, 45);
    px(data, x, y,
      clamp(w.r - dark, 0, 255),
      clamp(w.g - dark, 0, 255),
      clamp(w.b - dark, 0, 255));
  }

  // Metal banding (horizontal)
  for (let y = 0; y < 16; y++) {
    if (y === 0 || y === 1 || y === 14 || y === 15) {
      for (let x = 0; x < 16; x++) {
        px(data, x, y, 180, 175, 160);
      }
    }
  }

  // Metal banding (vertical)
  for (let x = 0; x < 16; x++) {
    if (x === 0 || x === 1 || x === 14 || x === 15) {
      for (let y = 0; y < 16; y++) {
        px(data, x, y,
          clamp(readPX(data, x, y).r + 40, 0, 255),
          clamp(readPX(data, x, y).g + 35, 0, 255),
          clamp(readPX(data, x, y).b + 30, 0, 255));
      }
    }
  }

  // Lock/centre detail
  fillRect(data, 6, 6, 9, 9, 180, 140, 40);
  fillRect(data, 7, 7, 8, 8, 220, 180, 60);

  // Rivets
  px(data, 2, 2, 200, 195, 180);
  px(data, 13, 2, 200, 195, 180);
  px(data, 2, 13, 200, 195, 180);
  px(data, 13, 13, 200, 195, 180);
}

// ----------------------------------------------------------------
// Texture generation dispatch
// ----------------------------------------------------------------

function generateTexture(blockType) {
  const { canvas, ctx, imageData, data } = initData();

  switch (blockType) {
    case 1:  genGrass(data);            break;
    case 2:  genDirt(data);             break;
    case 3:  genStone(data);            break;
    case 4:  genWood(data);             break;
    case 5:  genBrick(data);            break;
    case 6:  genWater(data);            break;
    case 7:  genLeaves(data);           break;
    case 8:  genFlower(data);           break;
    case 9:  genMud(data);              break;
    case 10: genClay(data);             break;
    case 11: genLilyPad(data);          break;
    case 12: genReed(data);             break;
    case 13: genOre(data, C.COAL_ORE, 8);      break;
    case 14: genOre(data, C.IRON_ORE, 8);      break;
    case 15: genOre(data, C.GOLD_ORE, 8);      break;
    case 16: genOre(data, C.DIAMOND_ORE, 8);   break;
    case 17: genOre(data, C.REDSTONE_ORE, 8);  break;
    case 18: genOre(data, C.LAPIS_ORE, 8);     break;
    case 19: genSand(data);             break;
    case 20: genGravel(data);           break;
    case 21: genSnow(data);             break;
    case 22: genCactus(data);           break;
    case 23: genChest(data);            break;
    default: genStone(data);            break;
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Return a THREE.CanvasTexture for the given block type (1-22).
 * Textures are generated once and cached.
 */
export function getTexture(blockType) {
  if (!cache[blockType]) {
    cache[blockType] = generateTexture(blockType);
  }
  return cache[blockType];
}

/**
 * Return a THREE.MeshLambertMaterial for the given block type.
 * Handles transparency for water, leaves, lily pad, and flower.
 */
export function getBlockMaterial(blockType) {
  const texture = getTexture(blockType);
  const matProps = { map: texture };

  if (blockType === 6) {
    // Water — semi-transparent
    matProps.transparent = true;
    matProps.opacity = 0.5;
  } else if (blockType === 7) {
    // Leaves — semi-transparent with double-sided rendering for cross-billboard
    matProps.transparent = true;
    matProps.opacity = 0.7;
    matProps.side = THREE.DoubleSide;
  } else if (blockType === 11) {
    // Lily pad — mostly opaque but uses alpha in the texture
    matProps.transparent = true;
    matProps.opacity = 1.0;
  } else if (blockType === 8) {
    // Flower — uses alpha for background
    matProps.transparent = true;
  } else if (blockType === 24) {
    // Torch — glowing
    matProps.color = 0xFF8800;
    matProps.emissive = 0xFF4400;
  }

  return new THREE.MeshLambertMaterial(matProps);
}
