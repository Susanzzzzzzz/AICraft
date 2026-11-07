import assert from 'node:assert/strict';
import { LEVELS } from '../src/levelData.js';
import { BLOCK, ITEM, World } from '../src/world.js';

const level = LEVELS.find(item => item.id === 'level_deep_dark');
assert.ok(level, 'deep dark level is registered');
const terrain = level.terrains[0];
assert.equal(terrain.biomeType, 'deep_dark');
assert.equal(terrain.atmosphere.lightMultiplier, 0.28);
assert.ok(terrain.prefabs.some(prefab => prefab.file === 'sculk_shrine'));

const world = new World({ useChunks: false, worldWidth: 32, worldDepth: 32 });
world.generate(742, { biomeType: 'deep_dark', worldWidth: 32, worldDepth: 32 });
let sculk = 0;
let lichen = 0;
for (const block of world.blocks) {
  if (block === BLOCK.SCULK) sculk++;
  if (block === BLOCK.GLOW_LICHEN) lichen++;
}
assert.ok(sculk > 0, 'deep dark terrain contains sculk');
assert.ok(lichen > 0, 'deep dark terrain contains glow lichen');
assert.equal(ITEM.SCULK, 150);
console.log('Deep Dark level tests passed');