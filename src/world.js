import { initNoise, simplex2D, simplex3D } from './noise.js';
import { getPrefab } from './prefabs.js';

// Backward-compat original sizes
export const ORIGINAL_WIDTH = 128;
export const ORIGINAL_HEIGHT = 64;
export const ORIGINAL_DEPTH = 128;

// New 10x world constants
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 64;
export const WORLD_DEPTH = 1280;

// Chunk constants
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
const CHUNK_VOL = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;

const NEIGHBOR_DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

export const BLOCK = {
  AIR:   0,
  GRASS: 1,
  DIRT:  2,
  STONE: 3,
  WOOD:  4,
  BRICK: 5,
  WATER: 6,
  LEAVES: 7,
  FLOWER: 8,
  MUD: 9,
  CLAY: 10,
  LILY_PAD: 11,
  REED: 12,
  COAL_ORE: 13,
  IRON_ORE: 14,
  GOLD_ORE: 15,
  DIAMOND_ORE: 16,
  REDSTONE_ORE: 17,
  LAPIS_ORE: 18,
  SAND: 19,
  GRAVEL: 20,
  SNOW: 21,
  CACTUS: 22,
  CHEST: 23,
  TORCH: 24,
  // New block types
  GRANITE: 25,
  DIORITE: 26,
  ANDESITE: 27,
};

export const MAX_BLOCK_TYPE = 27;

export const BLOCK_NAMES = [
  'Air', '草方块', '泥土', '石头', '木头', '砖块', '水', '树叶', '花',
  '沼泽泥', '黏土', '荷叶', '芦苇',
  '煤矿', '铁矿', '金矿', '钻石矿', '红石矿', '青金石矿',
  '沙子', '砂砾', '雪', '仙人掌', '宝箱', '火把'
];

export const BLOCK_COLORS = {
  [BLOCK.GRASS]: 0x4CAF50,
  [BLOCK.DIRT]:  0x8D6E63,
  [BLOCK.STONE]: 0x9E9E9E,
  [BLOCK.WOOD]:  0x795548,
  [BLOCK.BRICK]: 0xC62828,
  [BLOCK.WATER]: 0x1E88E5,
  [BLOCK.LEAVES]: 0x66BB6A,
  [BLOCK.FLOWER]: 0xFF7043,
  [BLOCK.MUD]: 0x5D4037,
  [BLOCK.CLAY]: 0x90A4AE,
  [BLOCK.LILY_PAD]: 0x4CAF50,
  [BLOCK.REED]: 0x827717,
  [BLOCK.COAL_ORE]: 0x2C2C2C,
  [BLOCK.IRON_ORE]: 0xD4A574,
  [BLOCK.GOLD_ORE]: 0xFFD700,
  [BLOCK.DIAMOND_ORE]: 0x2BD2E8,
  [BLOCK.REDSTONE_ORE]: 0xCC0000,
  [BLOCK.LAPIS_ORE]: 0x1E3A8F,
  [BLOCK.SAND]: 0xE8D5A3,
  [BLOCK.GRAVEL]: 0x9E9E9E,
  [BLOCK.SNOW]: 0xFFFFFF,
  [BLOCK.CACTUS]: 0x2E7D32,
  [BLOCK.CHEST]: 0x8D6E63,
  [BLOCK.TORCH]: 0xFF8800,
  [BLOCK.GRANITE]: 0xCC8866,
  [BLOCK.DIORITE]: 0xDDDDDD,
  [BLOCK.ANDESITE]: 0x888888,
};

export const BLOCK_OPACITY = {
  [BLOCK.WATER]: 0.5,
  [BLOCK.LEAVES]: 0.7,
};

export const ITEM = {
  // Block items (1-27 match BLOCK)
  GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, BRICK: 5, WATER: 6, LEAVES: 7, FLOWER: 8,
  MUD: 9, CLAY: 10, LILY_PAD: 11, REED: 12,
  COAL: 13, IRON_ORE_ITEM: 14, GOLD_ORE_ITEM: 15, DIAMOND_ORE_ITEM: 16,
  REDSTONE_ORE_ITEM: 17, LAPIS_ORE_ITEM: 18, SAND_ITEM: 19, GRAVEL_ITEM: 20,
  SNOW_ITEM: 21, CACTUS_ITEM: 22,
  // Crafted items
  PLANK: 100, STICK: 101,
  // Weapons
  SWORD_WOOD: 102, SWORD_STONE: 103, SWORD_IRON: 104, SWORD_DIAMOND: 105,
  SWORD_NETHERITE: 106,
  // Materials
  DIAMOND: 107, DIAMOND_CHESTPLATE: 108, IRON_INGOT: 109, NETHERITE_SCRAP: 110,
  // 网上人气武器
  SWORD_FROSTMOURNE: 111, SWORD_DRAGON: 112,
  // 掉落物
  SLIME_BALL: 113,
  // Tools
  PICKAXE_WOOD: 114, PICKAXE_STONE: 115, PICKAXE_IRON: 116, PICKAXE_DIAMOND: 117,
  AXE_WOOD: 118, AXE_STONE: 119, AXE_IRON: 120, AXE_DIAMOND: 121,
  SHOVEL_WOOD: 122, SHOVEL_STONE: 123, SHOVEL_IRON: 124, SHOVEL_DIAMOND: 125,
  // Ranged weapons
  BOW: 126, ARROW: 127,
  // Armor items (130-145)
  LEATHER_HELMET: 130, IRON_HELMET: 131, DIAMOND_HELMET: 132, NETHERITE_HELMET: 133,
  LEATHER_CHESTPLATE: 134, IRON_CHESTPLATE: 135, DIAMOND_CHESTPLATE_NEW: 136, NETHERITE_CHESTPLATE: 137,
  LEATHER_LEGGINGS: 138, IRON_LEGGINGS: 139, DIAMOND_LEGGINGS: 140, NETHERITE_LEGGINGS: 141,
  LEATHER_BOOTS: 142, IRON_BOOTS: 143, DIAMOND_BOOTS: 144, NETHERITE_BOOTS: 145,
  // 新增物品
  CHEST: 23,       // 宝箱 (同 BLOCK.CHEST)
  GUNPOWDER: 146,  // 火药 (Creeper 掉落)
  ENDER_PEARL: 147,// 末影珍珠 (Enderman 掉落)
  COBBLESTONE: 148,// 圆石 (石头掉落)
  // New block items (block types 25-27)
  GRANITE_ITEM: 25,
  DIORITE_ITEM: 26,
  ANDESITE_ITEM: 27,
};

export const ITEM_NAMES = {
  [ITEM.PLANK]: '木板', [ITEM.STICK]: '木棍',
  [ITEM.SWORD_WOOD]: '木剑', [ITEM.SWORD_STONE]: '石剑', [ITEM.SWORD_IRON]: '铁剑',
  [ITEM.SWORD_DIAMOND]: '钻石剑', [ITEM.SWORD_NETHERITE]: '下界合金剑',
  [ITEM.DIAMOND]: '钻石', [ITEM.DIAMOND_CHESTPLATE]: '钻石胸甲', [ITEM.IRON_INGOT]: '铁锭',
  [ITEM.NETHERITE_SCRAP]: '下界合金碎片',
  [ITEM.SWORD_FROSTMOURNE]: '霜之哀伤', [ITEM.SWORD_DRAGON]: '屠龙宝刀',
  [ITEM.SLIME_BALL]: '黏液球',
  [ITEM.MUD]: '沼泽泥', [ITEM.CLAY]: '黏土', [ITEM.LILY_PAD]: '荷叶', [ITEM.REED]: '芦苇',
  [ITEM.COAL]: '煤炭', [ITEM.PICKAXE_WOOD]: '木镐', [ITEM.PICKAXE_STONE]: '石镐',
  [ITEM.PICKAXE_IRON]: '铁镐', [ITEM.PICKAXE_DIAMOND]: '钻石镐',
  [ITEM.AXE_WOOD]: '木斧', [ITEM.AXE_STONE]: '石斧', [ITEM.AXE_IRON]: '铁斧',
  [ITEM.AXE_DIAMOND]: '钻石斧',
  [ITEM.SHOVEL_WOOD]: '木铲', [ITEM.SHOVEL_STONE]: '石铲', [ITEM.SHOVEL_IRON]: '铁铲',
  [ITEM.SHOVEL_DIAMOND]: '钻石铲',
  [ITEM.SAND_ITEM]: '沙子', [ITEM.GRAVEL_ITEM]: '砂砾', [ITEM.SNOW_ITEM]: '雪',
  [ITEM.CACTUS_ITEM]: '仙人掌',
  [ITEM.BOW]: '弓', [ITEM.ARROW]: '箭矢',
  [ITEM.LEATHER_HELMET]: '皮革头盔', [ITEM.IRON_HELMET]: '铁头盔', [ITEM.DIAMOND_HELMET]: '钻石头盔', [ITEM.NETHERITE_HELMET]: '下界合金头盔',
  [ITEM.LEATHER_CHESTPLATE]: '皮革胸甲', [ITEM.IRON_CHESTPLATE]: '铁胸甲', [ITEM.DIAMOND_CHESTPLATE_NEW]: '钻石胸甲', [ITEM.NETHERITE_CHESTPLATE]: '下界合金胸甲',
  [ITEM.LEATHER_LEGGINGS]: '皮革护腿', [ITEM.IRON_LEGGINGS]: '铁护腿', [ITEM.DIAMOND_LEGGINGS]: '钻石护腿', [ITEM.NETHERITE_LEGGINGS]: '下界合金护腿',
  [ITEM.LEATHER_BOOTS]: '皮革靴子', [ITEM.IRON_BOOTS]: '铁靴子', [ITEM.DIAMOND_BOOTS]: '钻石靴子', [ITEM.NETHERITE_BOOTS]: '下界合金靴子',
  [ITEM.COBBLESTONE]: '圆石',
  [ITEM.GRANITE_ITEM]: '花岗岩',
  [ITEM.DIORITE_ITEM]: '闪长岩',
  [ITEM.ANDESITE_ITEM]: '安山岩',
  [ITEM.CHEST]: '宝箱', [ITEM.GUNPOWDER]: '火药', [ITEM.ENDER_PEARL]: '末影珍珠',
};

export const ITEM_COLORS = {
  [ITEM.PLANK]: 0xC4A86C, [ITEM.STICK]: 0xA08850,
  [ITEM.SWORD_WOOD]: 0x8D6E63, [ITEM.SWORD_STONE]: 0x9E9E9E, [ITEM.SWORD_IRON]: 0xC0C0C0,
  [ITEM.SWORD_DIAMOND]: 0x2BD2E8, [ITEM.SWORD_NETHERITE]: 0x4A0E4E,
  [ITEM.DIAMOND]: 0x2BD2E8, [ITEM.DIAMOND_CHESTPLATE]: 0x2BD2E8, [ITEM.IRON_INGOT]: 0xC0C0C0,
  [ITEM.NETHERITE_SCRAP]: 0x4A0E4E,
  [ITEM.SWORD_FROSTMOURNE]: 0x4FC3F7, [ITEM.SWORD_DRAGON]: 0xFF5722,
  [ITEM.SLIME_BALL]: 0x66BB6A,
  [ITEM.MUD]: 0x5D4037, [ITEM.CLAY]: 0x90A4AE, [ITEM.LILY_PAD]: 0x4CAF50, [ITEM.REED]: 0x827717,
  [ITEM.COAL]: 0x2C2C2C,
  [ITEM.PICKAXE_WOOD]: 0x8D6E63, [ITEM.PICKAXE_STONE]: 0x9E9E9E, [ITEM.PICKAXE_IRON]: 0xC0C0C0,
  [ITEM.PICKAXE_DIAMOND]: 0x2BD2E8,
  [ITEM.AXE_WOOD]: 0x8D6E63, [ITEM.AXE_STONE]: 0x9E9E9E, [ITEM.AXE_IRON]: 0xC0C0C0,
  [ITEM.AXE_DIAMOND]: 0x2BD2E8,
  [ITEM.SHOVEL_WOOD]: 0x8D6E63, [ITEM.SHOVEL_STONE]: 0x9E9E9E, [ITEM.SHOVEL_IRON]: 0xC0C0C0,
  [ITEM.SHOVEL_DIAMOND]: 0x2BD2E8,
  [ITEM.SAND_ITEM]: 0xE8D5A3, [ITEM.GRAVEL_ITEM]: 0x9E9E9E, [ITEM.SNOW_ITEM]: 0xFFFFFF,
  [ITEM.CACTUS_ITEM]: 0x2E7D32,
  [ITEM.BOW]: 0x8B4513, [ITEM.ARROW]: 0xA0A0A0,
  [ITEM.LEATHER_HELMET]: 0xC4956A, [ITEM.IRON_HELMET]: 0xC0C0C0, [ITEM.DIAMOND_HELMET]: 0x2BD2E8, [ITEM.NETHERITE_HELMET]: 0x4A0E4E,
  [ITEM.LEATHER_CHESTPLATE]: 0xC4956A, [ITEM.IRON_CHESTPLATE]: 0xC0C0C0, [ITEM.DIAMOND_CHESTPLATE_NEW]: 0x2BD2E8, [ITEM.NETHERITE_CHESTPLATE]: 0x4A0E4E,
  [ITEM.LEATHER_LEGGINGS]: 0xC4956A, [ITEM.IRON_LEGGINGS]: 0xC0C0C0, [ITEM.DIAMOND_LEGGINGS]: 0x2BD2E8, [ITEM.NETHERITE_LEGGINGS]: 0x4A0E4E,
  [ITEM.LEATHER_BOOTS]: 0xC4956A, [ITEM.IRON_BOOTS]: 0xC0C0C0, [ITEM.DIAMOND_BOOTS]: 0x2BD2E8, [ITEM.NETHERITE_BOOTS]: 0x4A0E4E,
  [ITEM.GRANITE_ITEM]: 0xCC8866,
  [ITEM.DIORITE_ITEM]: 0xDDDDDD,
  [ITEM.ANDESITE_ITEM]: 0x888888,
  [ITEM.CHEST]: 0x8D6E63, [ITEM.GUNPOWDER]: 0x4A4A4A, [ITEM.ENDER_PEARL]: 0x9C27B0,
};

// Block hardness: break duration in seconds (default 1.0)
export const BLOCK_HARDNESS = {
  [BLOCK.GRASS]: 0.6,
  [BLOCK.DIRT]: 0.5,
  [BLOCK.STONE]: 1.5,
  [BLOCK.WOOD]: 1.0,
  [BLOCK.BRICK]: 1.5,
  [BLOCK.WATER]: 0,
  [BLOCK.LEAVES]: 0.3,
  [BLOCK.FLOWER]: 0.1,
  [BLOCK.MUD]: 0.5,
  [BLOCK.CLAY]: 0.6,
  [BLOCK.LILY_PAD]: 0.1,
  [BLOCK.REED]: 0.1,
  [BLOCK.COAL_ORE]: 1.5,
  [BLOCK.IRON_ORE]: 2.0,
  [BLOCK.GOLD_ORE]: 2.5,
  [BLOCK.DIAMOND_ORE]: 3.0,
  [BLOCK.REDSTONE_ORE]: 2.0,
  [BLOCK.LAPIS_ORE]: 2.0,
  [BLOCK.SAND]: 0.5,
  [BLOCK.GRAVEL]: 0.5,
  [BLOCK.SNOW]: 0.3,
  [BLOCK.CACTUS]: 0.3,
  [BLOCK.CHEST]: 0.8,
  [BLOCK.TORCH]: 0.1,
  [BLOCK.GRANITE]: 1.5,
  [BLOCK.DIORITE]: 1.5,
  [BLOCK.ANDESITE]: 1.5,
};

export function isSolid(block) {
  return block !== BLOCK.AIR && block !== BLOCK.WATER;
}

// Block → item drop mapping (non-precision mining drops)
const BLOCK_DROPS = {
  [BLOCK.STONE]: ITEM.COBBLESTONE,
};

export function getBlockDrop(blockType) {
  return BLOCK_DROPS[blockType] || blockType;
}

// Ore generation config: { scale, scarcity, minY, maxY }
const ORE_CONFIG = {
  [BLOCK.COAL_ORE]:    { scale: 30, scarcity: 0.70, minY: 5,  maxY: 45 },
  [BLOCK.IRON_ORE]:    { scale: 40, scarcity: 0.80, minY: 5,  maxY: 35 },
  [BLOCK.GOLD_ORE]:    { scale: 50, scarcity: 0.90, minY: 5,  maxY: 28 },
  [BLOCK.DIAMOND_ORE]: { scale: 60, scarcity: 0.95, minY: 0,  maxY: 15 },
  [BLOCK.REDSTONE_ORE]:{ scale: 35, scarcity: 0.85, minY: 0,  maxY: 20 },
  [BLOCK.LAPIS_ORE]:   { scale: 40, scarcity: 0.85, minY: 0,  maxY: 25 },
};

// ===================================================================
// Chunk class — 16x64x16 local block storage
// ===================================================================
export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_VOL);
    this.dirty = true; // needs mesh rebuild
    this.loaded = true;
  }

  _lx(wx) { return ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE; }
  _lz(wz) { return ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE; }

  _index(lx, y, lz) {
    return lx * CHUNK_HEIGHT * CHUNK_SIZE + y * CHUNK_SIZE + lz;
  }

  getBlock(lx, y, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return 0;
    return this.blocks[this._index(lx, y, lz)];
  }

  setBlock(lx, y, lz, type) {
    if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return;
    this.blocks[this._index(lx, y, lz)] = type;
    this.dirty = true;
  }
}

// ===================================================================
// ChunkManager — loads/unloads chunks around player position
// ===================================================================
export class ChunkManager {
  constructor() {
    this.chunks = new Map(); // "cx,cz" -> Chunk
  }

  _key(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) {
    return this.chunks.get(this._key(cx, cz));
  }

  getOrCreateChunk(cx, cz) {
    const key = this._key(cx, cz);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, new Chunk(cx, cz));
    }
    return this.chunks.get(key);
  }

  removeChunk(cx, cz) {
    this.chunks.delete(this._key(cx, cz));
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return 0;
    if (wx < 0 || wx >= WORLD_WIDTH || wz < 0 || wz >= WORLD_DEPTH) return 0;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    return chunk.getBlock(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE);
  }

  setBlock(wx, wy, wz, type) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    if (wx < 0 || wx >= WORLD_WIDTH || wz < 0 || wz >= WORLD_DEPTH) return;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cz);
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    chunk.setBlock(lx, wy, lz, type);
  }

  // Load all chunks within a radius (in chunks) of the given world position.
  // Unloads chunks outside that radius.
  loadAround(px, pz, radius = 5) {
    const centerCX = Math.floor(px / CHUNK_SIZE);
    const centerCZ = Math.floor(pz / CHUNK_SIZE);
    const toKeep = new Set();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        // Skip chunks that are entirely outside the world
        if (cx < 0 || cx >= Math.ceil(WORLD_WIDTH / CHUNK_SIZE)) continue;
        if (cz < 0 || cz >= Math.ceil(WORLD_DEPTH / CHUNK_SIZE)) continue;
        const key = this._key(cx, cz);
        toKeep.add(key);
        if (!this.chunks.has(key)) {
          this.chunks.set(key, new Chunk(cx, cz));
        }
      }
    }

    // Unload chunks not in the keep set
    for (const [key, chunk] of this.chunks) {
      if (!toKeep.has(key)) {
        chunk.loaded = false;
        this.chunks.delete(key);
      }
    }
  }

  getAllLoadedChunks() {
    return [...this.chunks.values()];
  }

  getNumLoadedChunks() {
    return this.chunks.size;
  }

  // Check if a specific chunk exists and is loaded
  isLoaded(cx, cz) {
    const chunk = this.chunks.get(this._key(cx, cz));
    return chunk !== undefined && chunk.loaded;
  }

  // Get block counts across all loaded chunks
  getBlockCounts() {
    const counts = {};
    for (let t = 1; t <= MAX_BLOCK_TYPE; t++) counts[t] = 0;
    for (const chunk of this.getAllLoadedChunks()) {
      for (let i = 0; i < chunk.blocks.length; i++) {
        const type = chunk.blocks[i];
        if (type !== BLOCK.AIR) {
          counts[type] = (counts[type] || 0) + 1;
        }
      }
    }
    return counts;
  }

  // Find a block type across all loaded chunks (for _ensureSwampWorld)
  hasBlockType(type) {
    for (const chunk of this.getAllLoadedChunks()) {
      for (let i = 0; i < chunk.blocks.length; i++) {
        if (chunk.blocks[i] === type) return true;
      }
    }
    return false;
  }
}

// ===================================================================
// World class — manages world state (chunk or flat array)
// ===================================================================
export class World {
  constructor(options = {}) {
    this.useChunks = options.useChunks !== undefined ? options.useChunks : true;
    this.seed = 42;
    this.dirtyTypes = new Set();
    this._changes = {};
    this.chestData = new Map();

    if (this.useChunks) {
      this._ww = WORLD_WIDTH;
      this._wh = WORLD_HEIGHT;
      this._wd = WORLD_DEPTH;
      this.chunkManager = new ChunkManager();
      this.loadRadius = options.loadRadius || 5;
      this._genConfig = { biomeType: '', options: {} };
    } else {
      this._ww = ORIGINAL_WIDTH;
      this._wh = ORIGINAL_HEIGHT;
      this._wd = ORIGINAL_DEPTH;
      this.blocks = new Uint8Array(this._ww * this._wh * this._wd);
    }
  }

  // Expose effective world dimensions
  get width() { return this._ww; }
  get height() { return this._wh; }
  get depth() { return this._wd; }

  // === Chest helpers (unchanged) ===
  _chestKey(x, y, z) { return `${x},${y},${z}`; }

  getChestInv(x, y, z) {
    const data = this.chestData.get(this._chestKey(x, y, z));
    return data ? data.slots : null;
  }

  initChest(x, y, z) {
    this.chestData.set(this._chestKey(x, y, z), { slots: new Array(27).fill(null) });
  }

  removeChest(x, y, z) {
    this.chestData.delete(this._chestKey(x, y, z));
  }

  // === Block access ===
  index(x, y, z) {
    if (this.useChunks) throw new Error('index() not available in chunk mode');
    return x * this._wh * this._wd + y * this._wd + z;
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this._ww && y >= 0 && y < this._wh && z >= 0 && z < this._wd;
  }

  getBlock(x, y, z) {
    if (this.useChunks) {
      return this.chunkManager.getBlock(x, y, z);
    }
    if (!this.inBounds(x, y, z)) return 0;
    return this.blocks[this.index(x, y, z)];
  }

  setBlock(x, y, z, type) {
    if (!this.inBounds(x, y, z)) return;
    if (this.useChunks) {
      const oldType = this.chunkManager.getBlock(x, y, z);
      if (oldType === type) return;
      this.chunkManager.setBlock(x, y, z, type);
      this.dirtyTypes.add(oldType === BLOCK.AIR ? type : oldType);
      if (type !== BLOCK.AIR) this.dirtyTypes.add(type);
      // Mark neighboring types dirty for renderer
      for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (this.inBounds(nx, ny, nz)) {
          const neighbor = this.getBlock(nx, ny, nz);
          if (neighbor !== BLOCK.AIR) this.dirtyTypes.add(neighbor);
        }
      }
      this._changes[`${x},${y},${z}`] = type;
      return;
    }
    // Non-chunk mode
    const oldType = this.blocks[this.index(x, y, z)];
    if (oldType === type) return;
    this.blocks[this.index(x, y, z)] = type;
    this.dirtyTypes.add(oldType === BLOCK.AIR ? type : oldType);
    if (type !== BLOCK.AIR) this.dirtyTypes.add(type);
    for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (this.inBounds(nx, ny, nz)) {
        const neighbor = this.getBlock(nx, ny, nz);
        if (neighbor !== BLOCK.AIR) this.dirtyTypes.add(neighbor);
      }
    }
    this._changes[`${x},${y},${z}`] = type;
  }

  // === Helpers for save/load ===
  fillBlocks(type) {
    if (this.useChunks) {
      this.chunkManager = new ChunkManager();
    } else {
      this.blocks.fill(type);
    }
  }

  applyBlockChange(x, y, z, type) {
    if (this.useChunks) {
      this.chunkManager.setBlock(x, y, z, type);
    } else {
      this.blocks[this.index(x, y, z)] = type;
    }
    this._changes[`${x},${y},${z}`] = type;
  }

  // === Exposed check ===
  isExposed(x, y, z) {
    if (this.getBlock(x, y, z) === BLOCK.AIR) return false;
    for (const [dx, dy, dz] of NEIGHBOR_DIRS) {
      if (this.getBlock(x+dx, y+dy, z+dz) === BLOCK.AIR) return true;
    }
    if (x === 0 || x === this._ww-1 || y === 0 || y === this._wh-1 || z === 0 || z === this._wd-1) return true;
    return false;
  }

  // === Generation ===
  generate(seed = 42, config = '') {
    this.seed = seed;
    initNoise(seed);

    let biomeType, options;
    if (typeof config === 'string') {
      biomeType = config || '';
      options = {};
    } else if (config && typeof config === 'object') {
      biomeType = config.biomeType || '';
      options = config;
    } else {
      biomeType = '';
      options = {};
    }

    if (this.useChunks) {
      this._genConfig = { biomeType, options };
      this.chunkManager = new ChunkManager();

      // Generate initial chunks around center spawn
      const spawnCX = Math.floor((WORLD_WIDTH / 2) / CHUNK_SIZE);
      const spawnCZ = Math.floor((WORLD_DEPTH / 2) / CHUNK_SIZE);
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
          this._generateChunkTerrain(spawnCX + dx, spawnCZ + dz);
        }
      }

      // Place prefabs in chunk mode
      if (options.prefabs && options.prefabs.length > 0) {
        this._placePrefabs(seed, options.prefabs, biomeType);
      }

      for (let t = 1; t <= MAX_BLOCK_TYPE; t++) this.dirtyTypes.add(t);
      this._changes = {};
      return;
    }

    // === Non-chunk generation (original, using ORIGINAL dimensions) ===
    const w = this._ww, h = this._wh, d = this._wd;
    this.blocks.fill(BLOCK.AIR);

    const WATER_LEVEL = options.waterLevel !== undefined ? options.waterLevel : 28;
    const MOUNTAIN_HEIGHT = 45;
    const RIVER_THRESHOLD = 0.05;
    const SLOPE_MOUNTAIN = 2.0;
    const isSwampWorld = biomeType === 'swamp';
    const isDesertWorld = biomeType === 'desert';
    const isTundraWorld = biomeType === 'tundra';
    const isCaveWorld = biomeType === 'cave';

    // Phase 1: Generate heightmap with multi-layer noise
    const heightMap = new Float32Array(w * d);
    const biomeMap = new Uint8Array(w * d);
    const hmIdx = (x, z) => x * d + z;

    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const continent = simplex2D(x * 0.005, z * 0.005) * 15;
        const hills     = simplex2D(x * 0.02,  z * 0.02)  * 5;
        const detail    = simplex2D(x * 0.05,  z * 0.05)  * 2;
        let height = Math.floor(20 + continent + hills + detail);
        height = Math.max(1, Math.min(h - 1, height));

        if (isCaveWorld) {
          height = Math.floor(18 + simplex2D(x * 0.01, z * 0.01) * 3);
          biomeMap[hmIdx(x, z)] = 5;
        } else if (isSwampWorld) {
          biomeMap[hmIdx(x, z)] = 3;
        } else if (isDesertWorld) {
          height = Math.floor(22 + simplex2D(x * 0.01, z * 0.01) * 2);
          biomeMap[hmIdx(x, z)] = 4;
        } else if (isTundraWorld) {
          biomeMap[hmIdx(x, z)] = 6;
        } else {
          const riverNoise = simplex2D(x * 0.02, z * 0.02);
          const isRiver = Math.abs(riverNoise) < RIVER_THRESHOLD && height < MOUNTAIN_HEIGHT;
          if (isRiver) {
            height = Math.min(height, WATER_LEVEL);
            biomeMap[hmIdx(x, z)] = 2;
          } else if (height < 24 && Math.abs(riverNoise) < RIVER_THRESHOLD * 2) {
            biomeMap[hmIdx(x, z)] = 3;
          }
        }
        heightMap[hmIdx(x, z)] = height;
      }
    }

    // Phase 2: Compute slope and classify biomes
    if (!isSwampWorld && !isDesertWorld && !isTundraWorld && !isCaveWorld) {
      for (let x = 1; x < w - 1; x++) {
        for (let z = 1; z < d - 1; z++) {
          const idx = hmIdx(x, z);
          if (biomeMap[idx] !== 0) continue;
          const h = heightMap[idx];
          let maxDiff = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              const diff = Math.abs(heightMap[hmIdx(x + dx, z + dz)] - h);
              if (diff > maxDiff) maxDiff = diff;
            }
          }
          if (h > MOUNTAIN_HEIGHT || maxDiff > SLOPE_MOUNTAIN) {
            biomeMap[idx] = 1;
          } else {
            biomeMap[idx] = 0;
          }
        }
      }
    }

    // Phase 2.5: contiguous swamp check
    if (!isSwampWorld && !isDesertWorld && !isTundraWorld && !isCaveWorld) {
      for (let x = 2; x < w - 2; x++) {
        for (let z = 2; z < d - 2; z++) {
          const idx = hmIdx(x, z);
          if (biomeMap[idx] !== 3) continue;
          let count = 0;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              if (biomeMap[hmIdx(x + dx, z + dz)] === 3) count++;
            }
          }
          if (count < 10) biomeMap[idx] = 0;
        }
      }
    }

    // Adjust swamp terrain heights
    if (isSwampWorld) {
      for (let x = 0; x < w; x++) {
        for (let z = 0; z < d; z++) {
          const idx = hmIdx(x, z);
          if (biomeMap[idx] !== 3) continue;
          const waterNoise = simplex2D(x * 0.04 + 100, z * 0.04 + 100);
          let swampH;
          if (waterNoise < -0.3) {
            if (waterNoise < -0.65) {
              swampH = WATER_LEVEL - 3 - Math.floor(Math.abs(waterNoise + 0.65) * 4) % 2;
            } else {
              swampH = WATER_LEVEL - 1 - Math.floor(Math.abs(waterNoise + 0.3) * 4) % 2;
            }
          } else {
            swampH = WATER_LEVEL + 1 + Math.floor(Math.abs(waterNoise) * 6) % 4;
          }
          heightMap[idx] = Math.max(1, Math.min(h - 1, swampH));
        }
      }
    }

    // Desert height adjustment
    if (isDesertWorld) {
      for (let x = 0; x < w; x++) {
        for (let z = 0; z < d; z++) {
          const idx = hmIdx(x, z);
          const duneNoise = simplex2D(x * 0.015 + 50, z * 0.015 + 50) * 3;
          heightMap[idx] = Math.floor(WATER_LEVEL - 2 + duneNoise);
          heightMap[idx] = Math.max(1, Math.min(h - 1, heightMap[idx]));
        }
      }
    }

    // Phase 3: Fill blocks
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const idx = hmIdx(x, z);
        const ht = Math.floor(heightMap[idx]);
        const biome = biomeMap[idx];
        const isRiver = biome === 2;
        const isSwamp = biome === 3;
        const isDesert = biome === 4;
        const isCave = biome === 5;
        const isTundra = biome === 6;

        if (isSwamp) {
          for (let y = 0; y <= ht; y++) {
            if (y === 0) {
              this.blocks[this.index(x, y, z)] = BLOCK.STONE;
            } else if (y < ht - 6) {
              this.blocks[this.index(x, y, z)] = BLOCK.STONE;
            } else if (y < ht - 3) {
              this.blocks[this.index(x, y, z)] = BLOCK.CLAY;
            } else {
              this.blocks[this.index(x, y, z)] = BLOCK.MUD;
            }
          }
          if (ht < WATER_LEVEL) {
            for (let y = ht + 1; y <= WATER_LEVEL; y++) {
              this.blocks[this.index(x, y, z)] = y === WATER_LEVEL ? BLOCK.WATER : BLOCK.AIR;
            }
          }
        } else {
          let surfaceBlock = BLOCK.GRASS;
          if (isDesert) surfaceBlock = BLOCK.SAND;
          else if (isTundra) surfaceBlock = BLOCK.SNOW;
          else if (isCave) surfaceBlock = BLOCK.STONE;
          else if (isRiver) surfaceBlock = BLOCK.SAND;

          for (let y = 0; y <= ht; y++) {
            if (y === 0) {
              this.blocks[this.index(x, y, z)] = BLOCK.STONE;
            } else if (y < ht - 3) {
              this.blocks[this.index(x, y, z)] = BLOCK.STONE;
            } else if (y < ht) {
              this.blocks[this.index(x, y, z)] = isDesert ? BLOCK.SAND : (isTundra ? (y < ht - 1 ? BLOCK.DIRT : BLOCK.SNOW) : BLOCK.DIRT);
            } else {
              this.blocks[this.index(x, y, z)] = surfaceBlock;
            }
          }
          if (isRiver) {
            for (let y = ht + 1; y <= WATER_LEVEL; y++) {
              this.blocks[this.index(x, y, z)] = y === WATER_LEVEL ? BLOCK.WATER : BLOCK.AIR;
            }
          }
        }
      }
    }

    // Phase 4: Ore generation using 3D SimplexNoise
    for (const [oreType, cfg] of Object.entries(ORE_CONFIG)) {
      const ot = parseInt(oreType);
      for (let x = 0; x < w; x++) {
        for (let y = cfg.minY; y <= cfg.maxY && y < h; y++) {
          for (let z = 0; z < d; z++) {
            const idx = this.index(x, y, z);
            if (this.blocks[idx] !== BLOCK.STONE) continue;
            const noiseVal = simplex3D(x / cfg.scale, y / cfg.scale, z / cfg.scale);
            if (noiseVal > cfg.scarcity) {
              this.blocks[idx] = ot;
            }
          }
        }
      }
    }

    // Phase 5: Cave generation using 3D noise
    {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const wx = worldXO + lx, wz = worldZO + lz;
          for (let y = 4; y < WORLD_HEIGHT - 10; y++) {
            const blockType = cm.getBlock(wx, y, wz);
            if (blockType !== BLOCK.STONE) continue;
            const variantNoise = simplex3D(wx * 0.015, y * 0.015, wz * 0.015);
            if (variantNoise > 0.4) {
              cm.setBlock(wx, y, wz, BLOCK.GRANITE);
            } else if (variantNoise < -0.4) {
              cm.setBlock(wx, y, wz, BLOCK.DIORITE);
            } else if (variantNoise > 0.2 && variantNoise < 0.25) {
              cm.setBlock(wx, y, wz, BLOCK.ANDESITE);
            }
          }
        }
      }
    }
    {
      for (let x = 2; x < w - 2; x++) {
        for (let z = 2; z < d - 2; z++) {
          let surfaceY = -1;
          for (let y = h - 1; y >= 0; y--) {
            if (this.blocks[this.index(x, y, z)] !== BLOCK.AIR) {
              surfaceY = y;
              break;
            }
          }
          if (surfaceY <= 3) continue;
          for (let y = 2; y < surfaceY - 3; y++) {
            const idx = this.index(x, y, z);
            const blockType = this.blocks[idx];
            if (blockType !== BLOCK.STONE && blockType !== BLOCK.DIRT) continue;
            const caveNoise = simplex3D(x * 0.03, y * 0.03, z * 0.03);
            if (caveNoise > 0.1) {
              this.blocks[idx] = BLOCK.AIR;
            }
          }
        }
      }
    }

    // Lily pad decoration (swamp water surfaces)
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const idx = hmIdx(x, z);
        if (biomeMap[idx] !== 3) continue;
        const ht = Math.floor(heightMap[idx]);
        if (ht >= WATER_LEVEL) continue;
        const lilyY = WATER_LEVEL + 1;
        if (lilyY < h && this.blocks[this.index(x, lilyY, z)] === BLOCK.AIR && Math.random() < 0.3) {
          this.blocks[this.index(x, lilyY, z)] = BLOCK.LILY_PAD;
        }
      }
    }

    // Swamp tree generation
    for (let x = 3; x < w - 3; x++) {
      for (let z = 3; z < d - 3; z++) {
        const idx = hmIdx(x, z);
        if (biomeMap[idx] !== 3 || Math.random() > 0.025) continue;
        const ht = Math.floor(heightMap[idx]);
        if (ht < 1) continue;
        if (this.blocks[this.index(x, ht, z)] !== BLOCK.MUD) continue;
        const trunkHeight = 3 + Math.floor(Math.random() * 3);
        if (ht + trunkHeight + 2 >= h) continue;
        for (let ty = 1; ty <= trunkHeight; ty++) {
          this.blocks[this.index(x, ht + ty, z)] = BLOCK.WOOD;
        }
        const leafBase = ht + trunkHeight - 1;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let ly = 0; ly <= 2; ly++) {
              const lx = x + dx, lz = z + dz, lyPos = leafBase + ly;
              if (lx >= 0 && lx < w && lz >= 0 && lz < d && lyPos < h) {
                if (this.blocks[this.index(lx, lyPos, lz)] === BLOCK.AIR) {
                  this.blocks[this.index(lx, lyPos, lz)] = BLOCK.LEAVES;
                }
              }
            }
          }
        }
      }
    }

    // Plains tree generation
    for (let x = 3; x < w - 3; x++) {
      for (let z = 3; z < d - 3; z++) {
        const idx = hmIdx(x, z);
        if (biomeMap[idx] !== 0 || Math.random() > 0.05) continue;
        const ht = Math.floor(heightMap[idx]);
        if (ht < 1) continue;
        if (this.blocks[this.index(x, ht, z)] !== BLOCK.GRASS && this.blocks[this.index(x, ht, z)] !== BLOCK.DIRT) continue;
        const trunkHeight = 3 + Math.floor(Math.random() * 3);
        if (ht + trunkHeight + 2 >= h) continue;
        for (let ty = 1; ty <= trunkHeight; ty++) {
          this.blocks[this.index(x, ht + ty, z)] = BLOCK.WOOD;
        }
        const leafBase = ht + trunkHeight - 1;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let ly = 0; ly <= 2; ly++) {
              const lx = x + dx, lz = z + dz, lyPos = leafBase + ly;
              if (lx >= 0 && lx < w && lz >= 0 && lz < d && lyPos < h) {
                if (this.blocks[this.index(lx, lyPos, lz)] === BLOCK.AIR) {
                  this.blocks[this.index(lx, lyPos, lz)] = BLOCK.LEAVES;
                }
              }
            }
          }
        }
      }
    }

    // Desert cactus generation
    if (isDesertWorld) {
      for (let x = 2; x < w - 2; x++) {
        for (let z = 2; z < d - 2; z++) {
          if (Math.random() > 0.02) continue;
          const ht = Math.floor(heightMap[hmIdx(x, z)]);
          if (ht < 1) continue;
          if (this.blocks[this.index(x, ht, z)] !== BLOCK.SAND) continue;
          const cactusH = 2 + Math.floor(Math.random() * 2);
          for (let cy = 1; cy <= cactusH; cy++) {
            if (ht + cy < h) {
              this.blocks[this.index(x, ht + cy, z)] = BLOCK.CACTUS;
            }
          }
        }
      }
    }

    // Tundra spruce trees
    if (isTundraWorld) {
      for (let x = 2; x < w - 2; x++) {
        for (let z = 2; z < d - 2; z++) {
          if (Math.random() > 0.035) continue;
          const ht = Math.floor(heightMap[hmIdx(x, z)]);
          if (ht < 1) continue;
          if (this.blocks[this.index(x, ht, z)] !== BLOCK.SNOW && this.blocks[this.index(x, ht, z)] !== BLOCK.DIRT) continue;
          const trunkH = 4 + Math.floor(Math.random() * 3);
          for (let ty = 1; ty <= trunkH; ty++) {
            if (ht + ty < h) this.blocks[this.index(x, ht + ty, z)] = BLOCK.WOOD;
          }
          for (let layer = 0; layer < 3; layer++) {
            const ly = trunkH - 1 + layer;
            const radius = 2 - layer;
            for (let dx = -radius; dx <= radius; dx++) {
              for (let dz = -radius; dz <= radius; dz++) {
                if (ht + ly < h && ly > 1) {
                  const lx = x + dx, lz = z + dz;
                  if (lx >= 0 && lx < w && lz >= 0 && lz < d) {
                    if (this.blocks[this.index(lx, ht + ly, lz)] === BLOCK.AIR) {
                      this.blocks[this.index(lx, ht + ly, lz)] = BLOCK.LEAVES;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Surface decoration (flowers, only in plains)
    for (let x = 1; x < w - 1; x++) {
      for (let z = 1; z < d - 1; z++) {
        const idx = hmIdx(x, z);
        if (biomeMap[idx] !== 0) continue;
        const isNearRiver = biomeMap[hmIdx(x - 1, z)] === 2 || biomeMap[hmIdx(x + 1, z)] === 2 ||
                            biomeMap[hmIdx(x, z - 1)] === 2 || biomeMap[hmIdx(x, z + 1)] === 2;
        if (Math.random() > (isNearRiver ? 0.08 : 0.035)) continue;
        const ht = Math.floor(heightMap[idx]);
        if (ht >= 1 && this.blocks[this.index(x, ht, z)] === BLOCK.GRASS &&
            this.blocks[this.index(x, ht + 1, z)] === BLOCK.AIR) {
          this.blocks[this.index(x, ht + 1, z)] = BLOCK.FLOWER;
        }
      }
    }

    // Place prefabs in non-chunk mode
    if (options.prefabs && options.prefabs.length > 0) {
      this._placePrefabs(seed, options.prefabs, biomeType);
    }

    for (let t = 1; t <= MAX_BLOCK_TYPE; t++) this.dirtyTypes.add(t);
    this._changes = {};
  }

  // Per-chunk terrain generation — replicates the original generate() logic for a single chunk
  _generateChunkTerrain(cx, cz) {
    const worldXO = cx * CHUNK_SIZE;
    const worldZO = cz * CHUNK_SIZE;

    const { biomeType, options } = this._genConfig || { biomeType: '', options: {} };
    const WATER_LEVEL = options.waterLevel !== undefined ? options.waterLevel : 28;
    const MOUNTAIN_HEIGHT = 45;
    const RIVER_THRESHOLD = 0.05;
    const SLOPE_MOUNTAIN = 2.0;
    const isSwampWorld = biomeType === 'swamp';
    const isDesertWorld = biomeType === 'desert';
    const isTundraWorld = biomeType === 'tundra';
    const isCaveWorld = biomeType === 'cave';
    const isJungleWorld = biomeType === 'jungle';
    const isCherryWorld = biomeType === 'cherry';

    // Heightmap for chunk columns + 2-cell border (for biome slope computation)
    const PAD = 2;
    const hmSize = CHUNK_SIZE + PAD * 2;
    const heightMap = new Float32Array(hmSize * hmSize);
    const biomeMap = new Uint8Array(hmSize * hmSize);
    const hmIdx = (lx, lz) => (lx + PAD) * hmSize + (lz + PAD);
    const cm = this.chunkManager;

    // Phase 1: Heightmap
    for (let lx = -PAD; lx < CHUNK_SIZE + PAD; lx++) {
      for (let lz = -PAD; lz < CHUNK_SIZE + PAD; lz++) {
        const wx = worldXO + lx, wz = worldZO + lz;
        const continent = simplex2D(wx * 0.005, wz * 0.005) * 15;
        const hills     = simplex2D(wx * 0.02,  wz * 0.02)  * 5;
        const detail    = simplex2D(wx * 0.05,  wz * 0.05)  * 2;
        let height = Math.floor(20 + continent + hills + detail);
        height = Math.max(1, Math.min(WORLD_HEIGHT - 1, height));

        if (isCaveWorld) {
          height = Math.floor(18 + simplex2D(wx * 0.01, wz * 0.01) * 3);
          biomeMap[hmIdx(lx, lz)] = 5;
        } else if (isSwampWorld) {
          biomeMap[hmIdx(lx, lz)] = 3;
        } else if (isDesertWorld) {
          height = Math.floor(22 + simplex2D(wx * 0.01, wz * 0.01) * 2);
          biomeMap[hmIdx(lx, lz)] = 4;
        } else if (isTundraWorld) {
          biomeMap[hmIdx(lx, lz)] = 6;
        } else {
          // Common terrain for plains, jungle, cherry (non-special biomes)
          if (isJungleWorld) biomeMap[hmIdx(lx, lz)] = 7;
          else if (isCherryWorld) biomeMap[hmIdx(lx, lz)] = 8;
          const riverNoise = simplex2D(wx * 0.02, wz * 0.02);
          const isRiver = Math.abs(riverNoise) < RIVER_THRESHOLD && height < MOUNTAIN_HEIGHT;
          if (isRiver) {
            height = Math.min(height, WATER_LEVEL);
            biomeMap[hmIdx(lx, lz)] = 2;
          } else if (height < 24 && Math.abs(riverNoise) < RIVER_THRESHOLD * 2) {
            biomeMap[hmIdx(lx, lz)] = 3;
          }
        }
        heightMap[hmIdx(lx, lz)] = height;
      }
    }

    // Phase 2: Slope/biome classification (interior only)
    if (!isSwampWorld && !isDesertWorld && !isTundraWorld && !isCaveWorld) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const idx = hmIdx(lx, lz);
          if (biomeMap[idx] !== 0) continue;
          const h = heightMap[idx];
          let maxDiff = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              const diff = Math.abs(heightMap[hmIdx(lx + dx, lz + dz)] - h);
              if (diff > maxDiff) maxDiff = diff;
            }
          }
          if (h > MOUNTAIN_HEIGHT || maxDiff > SLOPE_MOUNTAIN) {
            biomeMap[idx] = 1;
          } else {
            biomeMap[idx] = 0;
          }
        }
      }
    }

    // Phase 2.5: contiguous swamp check (interior only)
    if (!isSwampWorld && !isDesertWorld && !isTundraWorld && !isCaveWorld) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
          const idx = hmIdx(lx, lz);
          if (biomeMap[idx] !== 3) continue;
          let count = 0;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              if (biomeMap[hmIdx(lx + dx, lz + dz)] === 3) count++;
            }
          }
          if (count < 10) biomeMap[idx] = 0;
        }
      }
    }

    // Adjust swamp terrain heights
    if (isSwampWorld) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const idx = hmIdx(lx, lz);
          if (biomeMap[idx] !== 3) continue;
          const wx = worldXO + lx, wz = worldZO + lz;
          const waterNoise = simplex2D(wx * 0.04 + 100, wz * 0.04 + 100);
          let swampH;
          if (waterNoise < -0.3) {
            if (waterNoise < -0.65) {
              swampH = WATER_LEVEL - 3 - Math.floor(Math.abs(waterNoise + 0.65) * 4) % 2;
            } else {
              swampH = WATER_LEVEL - 1 - Math.floor(Math.abs(waterNoise + 0.3) * 4) % 2;
            }
          } else {
            swampH = WATER_LEVEL + 1 + Math.floor(Math.abs(waterNoise) * 6) % 4;
          }
          heightMap[idx] = Math.max(1, Math.min(WORLD_HEIGHT - 1, swampH));
        }
      }
    }

    // Desert height adjustment
    if (isDesertWorld) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const idx = hmIdx(lx, lz);
          const wx = worldXO + lx, wz = worldZO + lz;
          const duneNoise = simplex2D(wx * 0.015 + 50, wz * 0.015 + 50) * 3;
          heightMap[idx] = Math.floor(WATER_LEVEL - 2 + duneNoise);
          heightMap[idx] = Math.max(1, Math.min(WORLD_HEIGHT - 1, heightMap[idx]));
        }
      }
    }

    // Phase 3: Fill blocks for the chunk's exact columns
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = worldXO + lx, wz = worldZO + lz;
        const idx = hmIdx(lx, lz);
        const ht = Math.floor(heightMap[idx]);
        const biome = biomeMap[idx];
        const isRiver = biome === 2;
        const isSwamp = biome === 3;
        const isDesert = biome === 4;
        const isCave = biome === 5;
        const isTundra = biome === 6;

        if (isSwamp) {
          for (let y = 0; y <= ht; y++) {
            if (y === 0) {
              cm.setBlock(wx, y, wz, BLOCK.STONE);
            } else if (y < ht - 6) {
              cm.setBlock(wx, y, wz, BLOCK.STONE);
            } else if (y < ht - 3) {
              cm.setBlock(wx, y, wz, BLOCK.CLAY);
            } else {
              cm.setBlock(wx, y, wz, BLOCK.MUD);
            }
          }
          if (ht < WATER_LEVEL) {
            for (let y = ht + 1; y <= WATER_LEVEL; y++) {
              cm.setBlock(wx, y, wz, y === WATER_LEVEL ? BLOCK.WATER : BLOCK.AIR);
            }
          }
        } else {
          let surfaceBlock = BLOCK.GRASS;
          if (isDesert) surfaceBlock = BLOCK.SAND;
          else if (isTundra) surfaceBlock = BLOCK.SNOW;
          else if (isCave) surfaceBlock = BLOCK.STONE;
          else if (isRiver) surfaceBlock = BLOCK.SAND;

          for (let y = 0; y <= ht; y++) {
            if (y === 0) {
              cm.setBlock(wx, y, wz, BLOCK.STONE);
            } else if (y < ht - 3) {
              cm.setBlock(wx, y, wz, BLOCK.STONE);
            } else if (y < ht) {
              cm.setBlock(wx, y, wz, isDesert ? BLOCK.SAND : (isTundra ? (y < ht - 1 ? BLOCK.DIRT : BLOCK.SNOW) : BLOCK.DIRT));
            } else {
              cm.setBlock(wx, y, wz, surfaceBlock);
            }
          }
          if (isRiver) {
            for (let y = ht + 1; y <= WATER_LEVEL; y++) {
              cm.setBlock(wx, y, wz, y === WATER_LEVEL ? BLOCK.WATER : BLOCK.AIR);
            }
          }
        }
      }
    }

    // Phase 4: Ore generation
    for (const [oreType, cfg] of Object.entries(ORE_CONFIG)) {
      const ot = parseInt(oreType);
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = worldXO + lx;
        for (let y = cfg.minY; y <= cfg.maxY && y < WORLD_HEIGHT; y++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wz = worldZO + lz;
            const blockType = cm.getBlock(wx, y, wz);
            if (blockType !== BLOCK.STONE) continue;
            const noiseVal = simplex3D(wx / cfg.scale, y / cfg.scale, wz / cfg.scale);
            if (noiseVal > cfg.scarcity) {
              cm.setBlock(wx, y, wz, ot);
            }
          }
        }
      }
    }


    // Phase 4.5: Stone variant generation (granite, diorite, andesite)
    {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const wx = worldXO + lx, wz = worldZO + lz;
          for (let y = 4; y < WORLD_HEIGHT - 10; y++) {
            const blockType = cm.getBlock(wx, y, wz);
            if (blockType !== BLOCK.STONE) continue;
            const variantNoise = simplex3D(wx * 0.015, y * 0.015, wz * 0.015);
            if (variantNoise > 0.4) {
              cm.setBlock(wx, y, wz, BLOCK.GRANITE);
            } else if (variantNoise < -0.4) {
              cm.setBlock(wx, y, wz, BLOCK.DIORITE);
            } else if (variantNoise > 0.2 && variantNoise < 0.25) {
              cm.setBlock(wx, y, wz, BLOCK.ANDESITE);
            }
          }
        }
      }
    }

    // Phase 5: Cave generation
    {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
          const wx = worldXO + lx, wz = worldZO + lz;
          let surfaceY = -1;
          for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (cm.getBlock(wx, y, wz) !== BLOCK.AIR) {
              surfaceY = y;
              break;
            }
          }
          if (surfaceY <= 3) continue;
          for (let y = 2; y < surfaceY - 3; y++) {
            const blockType = cm.getBlock(wx, y, wz);
            if (blockType !== BLOCK.STONE && blockType !== BLOCK.DIRT) continue;
            const caveNoise = simplex3D(wx * 0.03, y * 0.03, wz * 0.03);
            if (caveNoise > 0.1) {
              cm.setBlock(wx, y, wz, BLOCK.AIR);
            }
          }
        }
      }
    }

    // Phase 6: Decorations (interior of chunk, 3-block margin)
    // Lily pads (swamp)
    for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
      for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
        const idx = hmIdx(lx, lz);
        if (biomeMap[idx] !== 3) continue;
        const wx = worldXO + lx, wz = worldZO + lz;
        const ht = Math.floor(heightMap[idx]);
        if (ht >= WATER_LEVEL) continue;
        const lilyY = WATER_LEVEL + 1;
        if (lilyY < WORLD_HEIGHT && cm.getBlock(wx, lilyY, wz) === BLOCK.AIR && Math.random() < 0.3) {
          cm.setBlock(wx, lilyY, wz, BLOCK.LILY_PAD);
        }
      }
    }

    // Swamp trees
    for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
      for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
        const idx = hmIdx(lx, lz);
        if (biomeMap[idx] !== 3 || Math.random() > 0.025) continue;
        const wx = worldXO + lx, wz = worldZO + lz;
        const ht = Math.floor(heightMap[idx]);
        if (ht < 1) continue;
        if (cm.getBlock(wx, ht, wz) !== BLOCK.MUD) continue;
        const trunkHeight = 3 + Math.floor(Math.random() * 3);
        if (ht + trunkHeight + 2 >= WORLD_HEIGHT) continue;
        for (let ty = 1; ty <= trunkHeight; ty++) {
          cm.setBlock(wx, ht + ty, wz, BLOCK.WOOD);
        }
        const leafBase = ht + trunkHeight - 1;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let ly = 0; ly <= 2; ly++) {
              const lx2 = wx + dx, lz2 = wz + dz, lyPos = leafBase + ly;
              if (lx2 >= 0 && lx2 < WORLD_WIDTH && lz2 >= 0 && lz2 < WORLD_DEPTH && lyPos < WORLD_HEIGHT) {
                if (cm.getBlock(lx2, lyPos, lz2) === BLOCK.AIR) {
                  cm.setBlock(lx2, lyPos, lz2, BLOCK.LEAVES);
                }
              }
            }
          }
        }
      }
    }

    // Plains trees
    for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
      for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
        const idx = hmIdx(lx, lz);
        if (biomeMap[idx] !== 0 || Math.random() > 0.05) continue;
        const wx = worldXO + lx, wz = worldZO + lz;
        const ht = Math.floor(heightMap[idx]);
        if (ht < 1) continue;
        const surfBlock = cm.getBlock(wx, ht, wz);
        if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.DIRT) continue;
        const trunkHeight = 3 + Math.floor(Math.random() * 3);
        if (ht + trunkHeight + 2 >= WORLD_HEIGHT) continue;
        for (let ty = 1; ty <= trunkHeight; ty++) {
          cm.setBlock(wx, ht + ty, wz, BLOCK.WOOD);
        }
        const leafBase = ht + trunkHeight - 1;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let ly = 0; ly <= 2; ly++) {
              const lx2 = wx + dx, lz2 = wz + dz, lyPos = leafBase + ly;
              if (lx2 >= 0 && lx2 < WORLD_WIDTH && lz2 >= 0 && lz2 < WORLD_DEPTH && lyPos < WORLD_HEIGHT) {
                if (cm.getBlock(lx2, lyPos, lz2) === BLOCK.AIR) {
                  cm.setBlock(lx2, lyPos, lz2, BLOCK.LEAVES);
                }
              }
            }
          }
        }
      }
    }

    // Desert cactus
    if (isDesertWorld) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
          if (Math.random() > 0.02) continue;
          const wx = worldXO + lx, wz = worldZO + lz;
          const ht = Math.floor(heightMap[hmIdx(lx, lz)]);
          if (ht < 1) continue;
          if (cm.getBlock(wx, ht, wz) !== BLOCK.SAND) continue;
          const cactusH = 2 + Math.floor(Math.random() * 2);
          for (let cy = 1; cy <= cactusH; cy++) {
            if (ht + cy < WORLD_HEIGHT) {
              cm.setBlock(wx, ht + cy, wz, BLOCK.CACTUS);
            }
          }
        }
      }
    }

    // Tundra spruce trees
    if (isTundraWorld) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
          if (Math.random() > 0.035) continue;
          const wx = worldXO + lx, wz = worldZO + lz;
          const ht = Math.floor(heightMap[hmIdx(lx, lz)]);
          if (ht < 1) continue;
          const surfBlock = cm.getBlock(wx, ht, wz);
          if (surfBlock !== BLOCK.SNOW && surfBlock !== BLOCK.DIRT) continue;
          const trunkH = 4 + Math.floor(Math.random() * 3);
          for (let ty = 1; ty <= trunkH; ty++) {
            if (ht + ty < WORLD_HEIGHT) cm.setBlock(wx, ht + ty, wz, BLOCK.WOOD);
          }
          for (let layer = 0; layer < 3; layer++) {
            const ly = trunkH - 1 + layer;
            const radius = 2 - layer;
            for (let dx = -radius; dx <= radius; dx++) {
              for (let dz = -radius; dz <= radius; dz++) {
                if (ht + ly < WORLD_HEIGHT && ly > 1) {
                  const lx2 = wx + dx, lz2 = wz + dz;
                  if (lx2 >= 0 && lx2 < WORLD_WIDTH && lz2 >= 0 && lz2 < WORLD_DEPTH) {
                    if (cm.getBlock(lx2, ht + ly, lz2) === BLOCK.AIR) {
                      cm.setBlock(lx2, ht + ly, lz2, BLOCK.LEAVES);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Flowers (plains)
    for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
      for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
        const idx = hmIdx(lx, lz);
        if (biomeMap[idx] !== 0 && biomeMap[idx] !== 8) continue;
        const wx = worldXO + lx, wz = worldZO + lz;
        const isNearRiver = biomeMap[hmIdx(lx - 1, lz)] === 2 || biomeMap[hmIdx(lx + 1, lz)] === 2 ||
                            biomeMap[hmIdx(lx, lz - 1)] === 2 || biomeMap[hmIdx(lx, lz + 1)] === 2;
        const flowerRate = biomeMap[idx] === 8 ? 0.06 : (isNearRiver ? 0.08 : 0.035);
        if (Math.random() > flowerRate) continue;
        const ht = Math.floor(heightMap[idx]);
        if (ht >= 1 && cm.getBlock(wx, ht, wz) === BLOCK.GRASS &&
            cm.getBlock(wx, ht + 1, wz) === BLOCK.AIR) {
          cm.setBlock(wx, ht + 1, wz, BLOCK.FLOWER);
        }
      }
    }

    // Jungle trees (dense, tall)
    if (isJungleWorld) {
      for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
        for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
          const idx = hmIdx(lx, lz);
          if (biomeMap[idx] !== 7 || Math.random() > 0.10) continue;
          const wx = worldXO + lx, wz = worldZO + lz;
          const ht = Math.floor(heightMap[idx]);
          if (ht < 1) continue;
          const surfBlock = cm.getBlock(wx, ht, wz);
          if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.DIRT) continue;
          const trunkHeight = 5 + Math.floor(Math.random() * 4);
          if (ht + trunkHeight + 3 >= WORLD_HEIGHT) continue;
          for (let ty = 1; ty <= trunkHeight; ty++) {
            cm.setBlock(wx, ht + ty, wz, BLOCK.WOOD);
          }
          const leafBase = ht + trunkHeight - 2;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              for (let ly = 0; ly <= 3; ly++) {
                const lx2 = wx + dx, lz2 = wz + dz, lyPos = leafBase + ly;
                if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && Math.random() > 0.5) continue;
                if (lx2 >= 0 && lx2 < WORLD_WIDTH && lz2 >= 0 && lz2 < WORLD_DEPTH && lyPos < WORLD_HEIGHT) {
                  if (cm.getBlock(lx2, lyPos, lz2) === BLOCK.AIR) {
                    cm.setBlock(lx2, lyPos, lz2, BLOCK.LEAVES);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Cherry trees
    if (isCherryWorld) {
      for (let lx = 3; lx < CHUNK_SIZE - 3; lx++) {
        for (let lz = 3; lz < CHUNK_SIZE - 3; lz++) {
          const idx = hmIdx(lx, lz);
          if (biomeMap[idx] !== 8 || Math.random() > 0.07) continue;
          const wx = worldXO + lx, wz = worldZO + lz;
          const ht = Math.floor(heightMap[idx]);
          if (ht < 1) continue;
          const surfBlock = cm.getBlock(wx, ht, wz);
          if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.DIRT) continue;
          const trunkHeight = 3 + Math.floor(Math.random() * 3);
          if (ht + trunkHeight + 2 >= WORLD_HEIGHT) continue;
          for (let ty = 1; ty <= trunkHeight; ty++) {
            cm.setBlock(wx, ht + ty, wz, BLOCK.WOOD);
          }
          const leafBase = ht + trunkHeight - 1;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              for (let ly = 0; ly <= 2; ly++) {
                const lx2 = wx + dx, lz2 = wz + dz, lyPos = leafBase + ly;
                if (lx2 >= 0 && lx2 < WORLD_WIDTH && lz2 >= 0 && lz2 < WORLD_DEPTH && lyPos < WORLD_HEIGHT) {
                  if (cm.getBlock(lx2, lyPos, lz2) === BLOCK.AIR) {
                    cm.setBlock(lx2, lyPos, lz2, BLOCK.LEAVES);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Mark chunk as no longer dirty after generation
    const chunk = cm.getChunk(cx, cz);
    if (chunk) chunk.dirty = false;
  }

  // === Prefab system ===

  /**
   * Place a prefab structure in the world.
   * @param {object} prefab - Prefab data object with size, data, palette
   * @param {number} cx - Center X in world coordinates
   * @param {number} cy - Center Y (prefab layer 0 goes here)
   * @param {number} cz - Center Z in world coordinates
   */
  placePrefab(prefab, cx, cy, cz, biomeType) {
    const [sx, sy, sz] = prefab.size;
    const ox = Math.floor(cx - sx / 2);
    const oy = cy;
    const oz = Math.floor(cz - sz / 2);

    // Terrain preparation: flatten ground and clear vegetation in footprint
    this._preparePrefabTerrain(ox, oy, oz, sx, sz, biomeType);

    for (let y = 0; y < sy; y++) {
      const layerStr = prefab.data[y];
      if (!layerStr) continue;
      for (let z = 0; z < sz; z++) {
        for (let x = 0; x < sx; x++) {
          const ch = layerStr[z * sx + x];
          if (ch === ' ' || ch === undefined) continue;
          const blockType = prefab.palette[ch];
          if (blockType !== undefined && blockType > 0) {
            this.setBlock(ox + x, oy + y, oz + z, blockType);
          }
        }
      }
    }
  }

  /**
   * Prepare terrain for a prefab: flatten ground, clear vegetation, add foundation.
   */
  _preparePrefabTerrain(ox, oy, oz, sx, sz, biomeType) {
    // Determine fill material based on biome
    let fillBlock = BLOCK.DIRT;
    let topBlock = BLOCK.GRASS;
    if (biomeType === 'desert') { fillBlock = BLOCK.SAND; topBlock = BLOCK.SAND; }
    else if (biomeType === 'tundra') { fillBlock = BLOCK.STONE; topBlock = BLOCK.SNOW; }
    else if (biomeType === 'swamp') { fillBlock = BLOCK.MUD; topBlock = BLOCK.MUD; }
    else if (biomeType === 'cave') { fillBlock = BLOCK.STONE; topBlock = BLOCK.STONE; }

    // Phase 1: find ground surface in each column (ignore vegetation/wood above ground)
    const surfaceHeights = Array(sx * sz).fill(-1);
    let minSurface = oy;
    let hasSurface = false;
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const wx = ox + x, wz = oz + z;
        let surf = -1;
        for (let y = oy + 6; y >= 0; y--) {
          const b = this.getBlock(wx, y, wz);
          if (b === BLOCK.GRASS || b === BLOCK.DIRT || b === BLOCK.STONE ||
              b === BLOCK.SAND || b === BLOCK.SNOW || b === BLOCK.MUD ||
              b === BLOCK.GRAVEL || b === BLOCK.GRANITE || b === BLOCK.DIORITE ||
              b === BLOCK.ANDESITE || b === BLOCK.CLAY) {
            surf = y;
            break;
          }
        }
        if (surf >= 0) {
          surfaceHeights[z * sx + x] = surf;
          hasSurface = true;
          if (surf < minSurface) minSurface = surf;
        }
      }
    }
    if (!hasSurface) return;

    // Phase 2: clear vegetation and tree blocks above each column's surface (using cached heights)
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const surf = surfaceHeights[z * sx + x];
        if (surf < 0) continue;
        const wx = ox + x, wz = oz + z;
        for (let y = surf + 1; y <= oy + 6; y++) {
          const b = this.getBlock(wx, y, wz);
          if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
            this.setBlock(wx, y, wz, BLOCK.AIR);
          }
        }
      }
    }

    // Phase 3: flatten terrain to the lowest surface height (using cached heights)
    for (let z = 0; z < sz; z++) {
      for (let x = 0; x < sx; x++) {
        const surf = surfaceHeights[z * sx + x];
        if (surf < 0) continue;
        const wx = ox + x, wz = oz + z;

        if (surf > minSurface) {
          for (let y = surf; y > minSurface; y--) {
            this.setBlock(wx, y, wz, BLOCK.AIR);
          }
          this.setBlock(wx, minSurface, wz, topBlock);
        } else if (surf < minSurface) {
          for (let y = surf + 1; y <= minSurface; y++) {
            this.setBlock(wx, y, wz, y === minSurface ? topBlock : fillBlock);
          }
        }
      }
    }
  }

  /**
   * Find the surface height at a given world coordinate.
   * Scans from top down for the first non-air, non-water block.
   */
  _findSurface(wx, wz, maxY) {
    const startY = maxY !== undefined ? maxY : this._wh - 1;
    for (let y = startY; y >= 0; y--) {
      const block = this.getBlock(wx, y, wz);
      if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
        return y;
      }
    }
    return -1;
  }

  /**
   * Place configured prefabs in the world after terrain generation.
   */
  _placePrefabs(seed, prefabConfigs, biomeType) {
    if (!Array.isArray(prefabConfigs)) return;

    for (let ci = 0; ci < prefabConfigs.length; ci++) {
      const cfg = prefabConfigs[ci];
      const prefab = getPrefab(cfg.file);
      if (!prefab) continue;

      // Probability check (deterministic using seed)
      if (cfg.probability !== undefined) {
        const probHash = ((seed + 1) * (cfg.file.length + 7)) % 1000 / 1000;
        if (probHash > cfg.probability) continue;
      }

      // Determine how many to place (deterministic)
      const countRange = cfg.maxCount - cfg.minCount;
      const countOffset = (seed * 7 + ci * 13) % (countRange + 1);
      const count = cfg.minCount + countOffset;
      if (count <= 0) continue;

      const [sx, sy, sz] = prefab.size;
      const margin = Math.max(sx, sz) + 3;

      // Determine valid placement bounds
      let minWx = margin;
      let maxWx = this._ww - margin;
      let minWz = margin;
      let maxWz = this._wd - margin;

      if (this.useChunks) {
        // Restrict to initial spawn chunk area
        const cxc = Math.floor((WORLD_WIDTH / 2) / CHUNK_SIZE);
        const czc = Math.floor((WORLD_DEPTH / 2) / CHUNK_SIZE);
        const radius = this.loadRadius || 5;
        minWx = Math.max(minWx, (cxc - radius) * CHUNK_SIZE + margin);
        maxWx = Math.min(maxWx, (cxc + radius + 1) * CHUNK_SIZE - margin);
        minWz = Math.max(minWz, (czc - radius) * CHUNK_SIZE + margin);
        maxWz = Math.min(maxWz, (czc + radius + 1) * CHUNK_SIZE - margin);
      }

      if (minWx >= maxWx || minWz >= maxWz) continue;

      for (let i = 0; i < count; i++) {
        let placed = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          // Deterministic pseudo-random position
          const posSeed = seed * 31 + i * 100 + attempt * (cfg.file.length + 1);
          const rx = (posSeed * 7) % (maxWx - minWx);
          const rz = (posSeed * 11 + 37) % (maxWz - minWz);
          const wx = minWx + rx;
          const wz = minWz + rz;

          const surfaceY = this._findSurface(wx, wz, 64);
          if (surfaceY < 1) continue;
          const surfBlock = this.getBlock(wx, surfaceY, wz);
          if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.DIRT &&
              surfBlock !== BLOCK.STONE && surfBlock !== BLOCK.SAND &&
              surfBlock !== BLOCK.SNOW && surfBlock !== BLOCK.MUD) continue;

          this.placePrefab(prefab, wx, surfaceY, wz, biomeType);
          placed = true;
          break;
        }
      }
    }
  }

  // === Other World methods ===
  getBlockCounts() {
    if (this.useChunks) {
      return this.chunkManager.getBlockCounts();
    }
    const counts = {};
    for (let t = 1; t <= MAX_BLOCK_TYPE; t++) counts[t] = 0;
    for (let x = 0; x < this._ww; x++) {
      for (let y = 0; y < this._wh; y++) {
        for (let z = 0; z < this._wd; z++) {
          const type = this.getBlock(x, y, z);
          if (type !== BLOCK.AIR && this.isExposed(x, y, z)) {
            counts[type] = (counts[type] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }

  getExposedPositions(type) {
    if (this.useChunks) {
      const positions = [];
      for (const chunk of this.chunkManager.getAllLoadedChunks()) {
        const wxBase = chunk.cx * CHUNK_SIZE;
        const wzBase = chunk.cz * CHUNK_SIZE;
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
              if (chunk.getBlock(lx, y, lz) !== type) continue;
              const wx = wxBase + lx, wz = wzBase + lz;
              if (this.isExposed(wx, y, wz)) {
                positions.push([wx, y, wz]);
              }
            }
          }
        }
      }
      return positions;
    }
    const positions = [];
    for (let x = 0; x < this._ww; x++) {
      for (let y = 0; y < this._wh; y++) {
        for (let z = 0; z < this._wd; z++) {
          if (this.getBlock(x, y, z) === type && this.isExposed(x, y, z)) {
            positions.push([x, y, z]);
          }
        }
      }
    }
    return positions;
  }

  clearDirty() { this.dirtyTypes.clear(); }
  clearChanges() { this._changes = {}; }

  findSpawnPosition() {
    if (this.useChunks) {
      const centerX = Math.floor(WORLD_WIDTH / 2);
      const centerZ = Math.floor(WORLD_DEPTH / 2);
      for (let radius = 0; radius <= 15; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const bx = centerX + dx, bz = centerZ + dz;
            if (!this.inBounds(bx, 0, bz)) continue;
            let surfaceY = -1;
            for (let y = WORLD_HEIGHT - 1; y >= 1; y--) {
              const b = this.getBlock(bx, y, bz);
              if (b !== BLOCK.AIR && b !== BLOCK.WATER) { surfaceY = y; break; }
            }
            if (surfaceY < 1) continue;
            const surfBlock = this.getBlock(bx, surfaceY, bz);
            if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.MUD && surfBlock !== BLOCK.SAND && surfBlock !== BLOCK.SNOW && surfBlock !== BLOCK.STONE) continue;
            let flat = true;
            for (let sx = -1; sx <= 1 && flat; sx++) {
              for (let sz = -1; sz <= 1 && flat; sz++) {
                const nx = bx + sx, nz = bz + sz;
                if (!this.inBounds(nx, 0, nz)) continue;
                let ny = surfaceY;
                for (let y = surfaceY + 2; y >= Math.max(0, surfaceY - 3); y--) {
                  const b = this.getBlock(nx, y, nz);
                  if (b !== BLOCK.AIR && b !== BLOCK.WATER) { ny = y; break; }
                }
                if (Math.abs(ny - surfaceY) > 2) flat = false;
              }
            }
            if (!flat) continue;
            if (surfaceY + 1 < WORLD_HEIGHT &&
                this.getBlock(bx, surfaceY + 1, bz) === BLOCK.AIR &&
                this.getBlock(bx, surfaceY + 2, bz) === BLOCK.AIR) {
              for (let cy = surfaceY + 2; cy <= surfaceY + 11 && cy < WORLD_HEIGHT; cy++) this.setBlock(bx, cy, bz, BLOCK.AIR);
              return [bx + 0.5, surfaceY + 6, bz + 0.5];
            }
          }
        }
      }
      for (let y = WORLD_HEIGHT - 1; y >= 1; y--) {
        if (this.getBlock(centerX, y, centerZ) !== BLOCK.AIR && this.getBlock(centerX, y, centerZ) !== BLOCK.WATER) {
          return [centerX + 0.5, y + 6, centerZ + 0.5];
        }
      }
      return [centerX + 0.5, 29, centerZ + 0.5];
    }

    // Non-chunk mode
    const cx = Math.floor(this._ww / 2), cz = Math.floor(this._wd / 2);
    for (let radius = 0; radius <= 15; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const bx = cx + dx, bz = cz + dz;
          if (!this.inBounds(bx, 0, bz)) continue;
          let surfaceY = -1;
          for (let y = this._wh - 1; y >= 1; y--) {
            const b = this.blocks[this.index(bx, y, bz)];
            if (b !== BLOCK.AIR && b !== BLOCK.WATER) { surfaceY = y; break; }
          }
          if (surfaceY < 1) continue;
          const surfBlock = this.blocks[this.index(bx, surfaceY, bz)];
          if (surfBlock !== BLOCK.GRASS && surfBlock !== BLOCK.MUD && surfBlock !== BLOCK.SAND && surfBlock !== BLOCK.SNOW && surfBlock !== BLOCK.STONE) continue;
          let flat = true;
          for (let sx = -1; sx <= 1 && flat; sx++) {
            for (let sz = -1; sz <= 1 && flat; sz++) {
              const nx = bx + sx, nz = bz + sz;
              if (!this.inBounds(nx, 0, nz)) continue;
              let ny = surfaceY;
              for (let y = surfaceY + 2; y >= Math.max(0, surfaceY - 3); y--) {
                const b = this.blocks[this.index(nx, y, nz)];
                if (b !== BLOCK.AIR && b !== BLOCK.WATER) { ny = y; break; }
              }
              if (Math.abs(ny - surfaceY) > 2) flat = false;
            }
          }
          if (!flat) continue;
          if (surfaceY + 1 < this._wh &&
              this.blocks[this.index(bx, surfaceY + 1, bz)] === BLOCK.AIR &&
              this.blocks[this.index(bx, surfaceY + 2, bz)] === BLOCK.AIR) {
            for (let cy = surfaceY + 2; cy <= surfaceY + 11 && cy < this._wh; cy++) this.setBlock(bx, cy, bz, BLOCK.AIR);
            return [bx + 0.5, surfaceY + 6, bz + 0.5];
          }
        }
      }
    }
    for (let y = this._wh - 1; y >= 1; y--) {
      if (this.blocks[this.index(cx, y, cz)] !== BLOCK.AIR && this.blocks[this.index(cx, y, cz)] !== BLOCK.WATER) {
        return [cx + 0.5, y + 6, cz + 0.5];
      }
    }
    return [cx + 0.5, 29, cz + 0.5];
  }

  // === BSP Dungeon Generation ===
  dungeonGenerate(seed = 42, startX = 0, startZ = 0, width = 200, depth = 200) {
    if (!this.useChunks) {
      console.warn('dungeonGenerate requires chunk mode');
      return { rooms: [], corridors: [] };
    }
    this.seed = seed;
    initNoise(seed);
    this.chunkManager = new ChunkManager();
    this._genConfig = { biomeType: '', options: {} };

    // Load chunks that will contain the dungeon
    const minCX = Math.floor(startX / CHUNK_SIZE);
    const maxCX = Math.floor((startX + width) / CHUNK_SIZE);
    const minCZ = Math.floor(startZ / CHUNK_SIZE);
    const maxCZ = Math.floor((startZ + depth) / CHUNK_SIZE);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        this.chunkManager.getOrCreateChunk(cx, cz);
      }
    }

    const gen = new BSPDungeonGenerator(this.chunkManager, seed);
    const result = gen.generate(startX, startZ, width, depth);

    // Store torch positions for the renderer
    this._torchPositions = gen.torchPositions;

    for (let t = 1; t <= MAX_BLOCK_TYPE; t++) this.dirtyTypes.add(t);
    this._changes = {};

    return result;
  }
}

// ===================================================================
// BSPDungeonGenerator — creates rooms + corridors using BSP
// ===================================================================
class BSPNode {
  constructor(x, z, w, d) {
    this.x = x;
    this.z = z;
    this.w = w;
    this.d = d;
    this.left = null;
    this.right = null;
    this.room = null;
  }
  get isLeaf() { return this.left === null && this.right === null; }
}

export const ROOM_TYPES = {
  SPAWN: 'spawn',
  COMBAT: 'combat',
  TREASURE: 'treasure',
  BOSS: 'boss',
};

export class BSPDungeonGenerator {
  constructor(chunkManager, seed = 42) {
    this.cm = chunkManager;
    this.seed = seed;
    this.rng = this._seededRandom(seed);
    this.rooms = [];
    this.corridors = [];
    this.torchPositions = [];
  }

  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  _rand(min, max) {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  generate(startX = 0, startZ = 0, width = 200, depth = 200) {
    const root = new BSPNode(startX, startZ, width, depth);
    this._split(root, 0, 5);
    this._createRooms(root);
    this._connectRooms(root);
    this._assignRoomTypes();
    this._buildRooms();
    this._buildCorridors();
    this._addTorches();
    return { rooms: this.rooms, corridors: this.corridors };
  }

  _split(node, depth, maxDepth) {
    if (depth >= maxDepth) return;
    if (node.w < 20 && node.d < 20) return;

    const splitH = this.rng() > 0.5;

    if (splitH) {
      if (node.d < 20) { this._split(node, depth + 1, maxDepth); return; }
      const split = this._rand(8, node.d - 8);
      node.left = new BSPNode(node.x, node.z, node.w, split);
      node.right = new BSPNode(node.x, node.z + split, node.w, node.d - split);
    } else {
      if (node.w < 20) { this._split(node, depth + 1, maxDepth); return; }
      const split = this._rand(8, node.w - 8);
      node.left = new BSPNode(node.x, node.z, split, node.d);
      node.right = new BSPNode(node.x + split, node.z, node.w - split, node.d);
    }

    this._split(node.left, depth + 1, maxDepth);
    this._split(node.right, depth + 1, maxDepth);
  }

  _createRooms(node) {
    if (!node.isLeaf) {
      this._createRooms(node.left);
      this._createRooms(node.right);
      return;
    }
    const rw = this._rand(5, Math.min(node.w - 2, 12));
    const rd = this._rand(5, Math.min(node.d - 2, 12));
    const rx = node.x + this._rand(1, node.w - rw - 1);
    const rz = node.z + this._rand(1, node.d - rd - 1);
    node.room = { x: rx, z: rz, w: rw, d: rd, h: 4 };
    this.rooms.push(node.room);
  }

  _connectRooms(node) {
    if (node.isLeaf) return;
    this._connectRooms(node.left);
    this._connectRooms(node.right);
    const leftRooms = this._getRooms(node.left);
    const rightRooms = this._getRooms(node.right);
    if (leftRooms.length === 0 || rightRooms.length === 0) return;
    const r1 = leftRooms[Math.floor(this.rng() * leftRooms.length)];
    const r2 = rightRooms[Math.floor(this.rng() * rightRooms.length)];
    const x1 = Math.floor(r1.x + r1.w / 2);
    const z1 = Math.floor(r1.z + r1.d / 2);
    const x2 = Math.floor(r2.x + r2.w / 2);
    const z2 = Math.floor(r2.z + r2.d / 2);
    this.corridors.push({ x1, z1, x2, z2, width: 2 });
  }

  _getRooms(node) {
    if (node.isLeaf) return node.room ? [node.room] : [];
    return [...this._getRooms(node.left), ...this._getRooms(node.right)];
  }

  _assignRoomTypes() {
    if (this.rooms.length < 4) return;
    this.rooms[0].type = ROOM_TYPES.SPAWN;
    this.rooms[this.rooms.length - 1].type = ROOM_TYPES.BOSS;
    const treasureIdx = this._rand(1, Math.max(1, this.rooms.length - 2));
    for (let i = 1; i < this.rooms.length - 1; i++) {
      this.rooms[i].type = i === treasureIdx ? ROOM_TYPES.TREASURE : ROOM_TYPES.COMBAT;
    }
  }

  _buildRooms() {
    const FLOOR_Y = 30;
    const ROOM_HEIGHT = 4;

    for (const room of this.rooms) {
      const type = room.type || ROOM_TYPES.COMBAT;

      // Floor
      for (let x = room.x; x < room.x + room.w; x++) {
        for (let z = room.z; z < room.z + room.d; z++) {
          this.cm.setBlock(x, FLOOR_Y, z, BLOCK.BRICK);
          this.cm.setBlock(x, FLOOR_Y + ROOM_HEIGHT, z, BLOCK.STONE);
        }
      }

      // Walls
      for (let x = room.x - 1; x <= room.x + room.w; x++) {
        for (let z = room.z - 1; z <= room.z + room.d; z++) {
          const onLeft = x === room.x - 1;
          const onRight = x === room.x + room.w;
          const onFront = z === room.z - 1;
          const onBack = z === room.z + room.d;
          if (!(onLeft || onRight || onFront || onBack)) continue;
          if (x < 0 || x >= WORLD_WIDTH || z < 0 || z >= WORLD_DEPTH) continue;
          for (let y = FLOOR_Y + 1; y < FLOOR_Y + ROOM_HEIGHT; y++) {
            this.cm.setBlock(x, y, z, BLOCK.STONE);
          }
        }
      }

      // Clear interior
      for (let x = room.x; x < room.x + room.w; x++) {
        for (let y = FLOOR_Y + 1; y < FLOOR_Y + ROOM_HEIGHT; y++) {
          for (let z = room.z; z < room.z + room.d; z++) {
            if (x >= 0 && x < WORLD_WIDTH && z >= 0 && z < WORLD_DEPTH) {
              this.cm.setBlock(x, y, z, BLOCK.AIR);
            }
          }
        }
      }

      // Boss room: gold platform
      if (type === ROOM_TYPES.BOSS) {
        const cx = Math.floor(room.x + room.w / 2);
        const cz = Math.floor(room.z + room.d / 2);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            this.cm.setBlock(cx + dx, FLOOR_Y, cz + dz, BLOCK.GOLD_ORE);
          }
        }
      }

      // Treasure room: chest
      if (type === ROOM_TYPES.TREASURE) {
        const cx = Math.floor(room.x + room.w / 2);
        const cz = Math.floor(room.z + room.d / 2);
        this.cm.setBlock(cx, FLOOR_Y + 1, cz, BLOCK.CHEST);
      }

      // Torches in room corners
      if (type !== ROOM_TYPES.SPAWN) {
        this.torchPositions.push([room.x + 1, FLOOR_Y + 1, room.z + 1]);
        this.torchPositions.push([room.x + room.w - 2, FLOOR_Y + 1, room.z + room.d - 2]);
      }
    }
  }

  _buildCorridors() {
    const FLOOR_Y = 30;

    for (const corr of this.corridors) {
      // L-shaped tunnel: first go along X, then along Z
      const midX = corr.x2;
      const midZ = corr.z1;

      // Segment 1: (x1,z1) to (midX,midZ) — horizontal
      const minX1 = Math.min(corr.x1, midX);
      const maxX1 = Math.max(corr.x1, midX);
      const zSeg = corr.z1;
      for (let x = minX1; x <= maxX1; x++) {
        for (let oz = -corr.width; oz <= corr.width; oz++) {
          const z = zSeg + oz;
          this.cm.setBlock(x, FLOOR_Y, z, BLOCK.BRICK);
          this.cm.setBlock(x, FLOOR_Y + 1, z, BLOCK.AIR);
          this.cm.setBlock(x, FLOOR_Y + 2, z, BLOCK.AIR);
          this.cm.setBlock(x, FLOOR_Y + 3, z, BLOCK.STONE);
        }
      }

      // Segment 2: (midX,z1) to (x2,z2) — vertical
      const minZ2 = Math.min(zSeg, corr.z2);
      const maxZ2 = Math.max(zSeg, corr.z2);
      const xSeg = midX;
      for (let z = minZ2; z <= maxZ2; z++) {
        for (let ox = -corr.width; ox <= corr.width; ox++) {
          const x = xSeg + ox;
          this.cm.setBlock(x, FLOOR_Y, z, BLOCK.BRICK);
          this.cm.setBlock(x, FLOOR_Y + 1, z, BLOCK.AIR);
          this.cm.setBlock(x, FLOOR_Y + 2, z, BLOCK.AIR);
          this.cm.setBlock(x, FLOOR_Y + 3, z, BLOCK.STONE);
        }
      }

      // Torches in corridor
      this.torchPositions.push([corr.x1 + 1, FLOOR_Y + 1, corr.z1]);
      this.torchPositions.push([corr.x2, FLOOR_Y + 1, corr.z2 + 1]);
    }
  }

  _addTorches() {
    // Store torch positions for the renderer to add point lights
    // Each torch position will have a point light added in the renderer
    for (const pos of this.torchPositions) {
      // Mark torch blocks in the chunk so renderer can detect them
      this.cm.setBlock(pos[0], pos[1], pos[2], BLOCK.TORCH);
      // Also place a TORCH above for two-tall glow effect
      this.cm.setBlock(pos[0], pos[1] + 1, pos[2], BLOCK.TORCH);
    }
  }
}
