// Prefab JSON generator — run with: node scripts/gen_prefabs.js
// Generates prefab JSON files in data/prefabs/ with compact flat-string format

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREFAB_DIR = resolve(__dirname, '..', 'data', 'prefabs');
mkdirSync(PREFAB_DIR, { recursive: true });

/**
 * Build a prefab definition.
 * @param {string} name - Prefab name
 * @param {string} description - Description
 * @param {[number,number,number]} size - [sx, sy, sz]
 * @param {string[]} tags - Tags
 * @param {Object} palette - Character → block-type mapping
 * @param {string[][]} layers - Array of row-arrays, one per y-level.
 *   Each row-array is an array of strings, one per z-row, each of length sx.
 */
function makePrefab(name, description, size, tags, palette, layers) {
  const [sx, sy, sz] = size;
  // Convert each layer (array of rows) into a flat string
  const data = layers.map(rows => rows.join(''));
  return { name, description, size, tags, palette, data };
}

// ======================================================================
// 1. cabin.json — 小木屋 (7x5x7)
//    Wood walls + wood floor + air interior + door opening
// ======================================================================
const cabin = makePrefab(
  '小木屋', '一个小型木制房屋', [7, 5, 7],
  ['building', 'plains'],
  { w: 4 }, // WOOD
  [
    // y=0: floor (all wood)
    ['wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww'],
    // y=1: walls with 2-wide door on front (z=0)
    ['www  ww','w     w','w     w','w     w','w     w','w     w','wwwwwww'],
    // y=2: solid perimeter walls
    ['wwwwwww','w     w','w     w','w     w','w     w','w     w','wwwwwww'],
    // y=3: solid perimeter walls
    ['wwwwwww','w     w','w     w','w     w','w     w','w     w','wwwwwww'],
    // y=4: ceiling (all wood)
    ['wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww'],
  ]
);

// ======================================================================
// 2. watchtower.json — 瞭望塔 (5x8x5)
//    Stone base + wood upper + top platform
// ======================================================================
const watchtower = makePrefab(
  '瞭望塔', '石木混合瞭望塔', [5, 8, 5],
  ['building', 'plains', 'tundra'],
  { s: 3, w: 4 }, // STONE, WOOD
  [
    // y=0: stone base solid
    ['sssss','sssss','sssss','sssss','sssss'],
    // y=1: stone base solid
    ['sssss','sssss','sssss','sssss','sssss'],
    // y=2: stone hollow
    ['sssss','s   s','s   s','s   s','sssss'],
    // y=3: stone hollow
    ['sssss','s   s','s   s','s   s','sssss'],
    // y=4: wood platform solid
    ['wwwww','wwwww','wwwww','wwwww','wwwww'],
    // y=5: wood observation deck hollow
    ['wwwww','w   w','w   w','w   w','wwwww'],
    // y=6: wood upper hollow
    ['wwwww','w   w','w   w','w   w','wwwww'],
    // y=7: wood roof solid
    ['wwwww','wwwww','wwwww','wwwww','wwwww'],
  ]
);

// ======================================================================
// 3. mine_entrance.json — 矿道入口 (5x3x5)
//    Wood supports + stone tunnel going down
// ======================================================================
const mineEntrance = makePrefab(
  '矿道入口', '向下的矿道入口', [5, 3, 5],
  ['building', 'cave', 'mountain'],
  { s: 3, w: 4 }, // STONE, WOOD
  [
    // y=0: Underground walls (stone perimeter, wood supports)
    ['sssss','s   s','s w s','s   s','sssss'],
    // y=1: Ground level — entrance opening with wood frame
    ['sssss','s   s','s w s','s   s','sssss'],
    // y=2: Above-ground — wood frame markers
    ['w   w','     ','     ','     ','w   w'],
  ]
);

// ======================================================================
// 4. pyramid.json — 沙漠金字塔 (9x5x9)
//    Step pyramid, stone (sandstone-colored)
// ======================================================================
// Helper to create a solid square layer for a given size and offset
const pyS = 9;
const pyBase = Array.from({ length: pyS }, () => Array(pyS).fill('s'));
const pyL1 = Array.from({ length: pyS }, (_, zi) =>
  Array.from({ length: pyS }, (_, xi) =>
    (xi >= 1 && xi <= pyS - 2 && zi >= 1 && zi <= pyS - 2) ? 's' : ' '
  ).join('')
);
const pyL2 = Array.from({ length: pyS }, (_, zi) =>
  Array.from({ length: pyS }, (_, xi) =>
    (xi >= 2 && xi <= pyS - 3 && zi >= 2 && zi <= pyS - 3) ? 's' : ' '
  ).join('')
);
const pyL3 = Array.from({ length: pyS }, (_, zi) =>
  Array.from({ length: pyS }, (_, xi) =>
    (xi >= 3 && xi <= pyS - 4 && zi >= 3 && zi <= pyS - 4) ? 's' : ' '
  ).join('')
);
const pyL4 = Array.from({ length: pyS }, (_, zi) =>
  Array.from({ length: pyS }, (_, xi) =>
    (xi === 4 && zi === 4) ? 's' : ' '
  ).join('')
);

const pyramid = makePrefab(
  '沙漠金字塔', '阶梯状砂岩金字塔', [9, 5, 9],
  ['building', 'desert'],
  { s: 3 }, // STONE
  [
    pyBase.map(() => 'sssssssss'),               // y=0: 9x9 base
    pyL1,                                          // y=1: 7x7 step
    pyL2,                                          // y=2: 5x5 step
    pyL3,                                          // y=3: 3x3 step
    pyL4,                                          // y=4: 1x1 top
  ]
);

// ======================================================================
// 5. swamp_hut.json — 沼泽小屋 (5x4x5)
//    Wood stilt house above water level
// ======================================================================
const swampHut = makePrefab(
  '沼泽小屋', '沼泽中的高脚木屋', [5, 4, 5],
  ['building', 'swamp'],
  { w: 4 }, // WOOD
  [
    // y=0: stilts (4 corner pillars)
    ['w   w','     ','     ','     ','w   w'],
    // y=1: stilts continue
    ['w   w','     ','     ','     ','w   w'],
    // y=2: floor solid
    ['wwwww','wwwww','wwwww','wwwww','wwwww'],
    // y=3: walls (solid perimeter) with small roof overhang
    ['wwwww','w   w','w   w','w   w','wwwww'],
  ]
);

// ======================================================================
// 6. igloo.json — 冰屋 (5x4x5)
//    Snow dome structure
// ======================================================================
const igloo = makePrefab(
  '冰屋', '雪块搭建的圆顶冰屋', [5, 4, 5],
  ['building', 'tundra'],
  { s: 21 }, // SNOW
  [
    // y=0: snow base solid
    ['sssss','sssss','sssss','sssss','sssss'],
    // y=1: snow walls with door opening (front = z=0)
    ['s   s','s   s','s   s','s   s','sssss'],
    // y=2: dome lower
    [' sss ','s   s','s   s','s   s',' sss '],
    // y=3: dome top (single block)
    ['     ','  s  ','  s  ','  s  ','     '],
  ]
);

// ======================================================================
// 7. sakura_pavilion.json — 樱花亭 (7x5x7)
//    Wood pillars + leaves roof
// ======================================================================
const sakuraPavilion = makePrefab(
  '樱花亭', '木柱与树叶顶的凉亭', [7, 5, 7],
  ['building', 'cherry', 'plains'],
  { w: 4, l: 7 }, // WOOD, LEAVES
  [
    // y=0: wood floor
    ['wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww','wwwwwww'],
    // y=1: 4 corner pillars (wood)
    ['w     w','       ','       ','       ','       ','       ','w     w'],
    // y=2: 4 corner pillars (wood)
    ['w     w','       ','       ','       ','       ','       ','w     w'],
    // y=3: leaves roof base
    ['lllllll','lllllll','lllllll','lllllll','lllllll','lllllll','lllllll'],
    // y=4: leaves roof top (solid)
    ['lllllll','lllllll','lllllll','lllllll','lllllll','lllllll','lllllll'],
  ]
);

// ======================================================================
// Write all prefab files
// ======================================================================
const prefabs = [cabin, watchtower, mineEntrance, pyramid, swampHut, igloo, sakuraPavilion];
const filenames = ['cabin', 'watchtower', 'mine_entrance', 'pyramid', 'swamp_hut', 'igloo', 'sakura_pavilion'];

for (let i = 0; i < prefabs.length; i++) {
  const filePath = resolve(PREFAB_DIR, filenames[i] + '.json');
  writeFileSync(filePath, JSON.stringify(prefabs[i], null, 2) + '\n');
  console.log(`Wrote ${filePath}`);
  // Validate: check data strings length
  const [sx, sy, sz] = prefabs[i].size;
  for (let y = 0; y < sy; y++) {
    const expectedLen = sx * sz;
    const actualLen = prefabs[i].data[y].length;
    if (actualLen !== expectedLen) {
      console.error(`  ERROR: layer ${y} expected ${expectedLen} chars, got ${actualLen}`);
    } else {
      console.log(`  OK: layer ${y} = ${actualLen} chars`);
    }
  }
}

console.log('\nDone! All prefabs generated successfully.');
