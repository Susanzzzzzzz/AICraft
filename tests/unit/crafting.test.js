// L1 Unit Test: Crafting module
import { getCraftResult, consumeCraftInput } from '../../crafting.js';

const ITEM = {
  GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4,
  PLANK: 100, STICK: 101, SWORD_WOOD: 102, SWORD_STONE: 103, SWORD_IRON: 104,
  SWORD_DIAMOND: 105, SWORD_NETHERITE: 106, DIAMOND: 107, DIAMOND_CHESTPLATE: 108,
  IRON_INGOT: 109, NETHERITE_SCRAP: 110,
};

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

function grid(s0, s1, s2, s3) {
  return [s0 || null, s1 || null, s2 || null, s3 || null];
}

// ---- Test: 1 wood → 4 planks (shapeless) ----
{
  const g = grid({ type: ITEM.WOOD, count: 1 });
  const result = getCraftResult(g);
  assert(result !== null, 'wood → planks: has result');
  assert(result.type === ITEM.PLANK, 'wood → planks: type PLANK');
  assert(result.count === 4, 'wood → planks: count 4');
}

// ---- Test: 2 planks vertical → 4 sticks ----
{
  const g = grid(
    { type: ITEM.PLANK, count: 1 },
    null,
    { type: ITEM.PLANK, count: 1 }
  );
  const result = getCraftResult(g);
  assert(result !== null, 'planks → sticks: has result');
  assert(result.type === ITEM.STICK, 'planks → sticks: type STICK');
  assert(result.count === 4, 'planks → sticks: count 4');
}

// ---- Test: Plank + stick → wooden sword ----
{
  const g = grid(
    { type: ITEM.PLANK, count: 1 },
    null,
    { type: ITEM.STICK, count: 1 }
  );
  const result = getCraftResult(g);
  assert(result !== null, 'plank+stick → wood_sword: has result');
  assert(result.type === ITEM.SWORD_WOOD, 'plank+stick → wood_sword: type SWORD_WOOD');
}

// ---- Test: Stone + stick → stone sword ----
{
  const g = grid(
    { type: ITEM.STONE, count: 1 },
    null,
    { type: ITEM.STICK, count: 1 }
  );
  const result = getCraftResult(g);
  assert(result !== null, 'stone+stick → stone_sword: has result');
  assert(result.type === ITEM.SWORD_STONE, 'stone+stick → stone_sword: type SWORD_STONE');
}

// ---- Test: Diamond + stick → diamond sword ----
{
  const g = grid(
    { type: ITEM.DIAMOND, count: 1 },
    null,
    { type: ITEM.STICK, count: 1 }
  );
  const result = getCraftResult(g);
  assert(result !== null, 'diamond+stick → diamond_sword: has result');
  assert(result.type === ITEM.SWORD_DIAMOND, 'diamond+stick → diamond_sword: type SWORD_DIAMOND');
}

// ---- Test: Empty grid → no result ----
{
  const g = grid(null, null, null, null);
  assert(getCraftResult(g) === null, 'empty grid: no result');
}

// ---- Test: Mismatched types → no result ----
{
  const g = grid(
    { type: ITEM.GRASS, count: 1 },
    null,
    { type: ITEM.STICK, count: 1 }
  );
  assert(getCraftResult(g) === null, 'grass+stick: no result');
}

// ---- Test: Wrong position → no result (planks must be top-left and bottom-left) ----
{
  const g = grid(
    { type: ITEM.PLANK, count: 1 },
    { type: ITEM.PLANK, count: 1 }
  );
  assert(getCraftResult(g) === null, 'planks side-by-side: no result');
}

// ---- Test: consumeCraftInput shapeless (wood → planks) ----
{
  const g = grid({ type: ITEM.WOOD, count: 1 });
  const before = g[0] ? g[0].count : 0;
  consumeCraftInput(g);
  const after = g[0] ? g[0].count : 0;
  assert(after === before - 1, `consume shapeless: wood decreased (${before} → ${after})`);
}

// ---- Test: consumeCraftInput positional (stone+stick) ----
{
  const g = grid(
    { type: ITEM.STONE, count: 1 },
    null,
    { type: ITEM.STICK, count: 1 }
  );
  consumeCraftInput(g);
  assert(g[0] === null || g[0].count === 0, 'consume positional: stone consumed');
  assert(g[2] === null || g[2].count === 0, 'consume positional: stick consumed');
}

// ---- Summary ----
console.log(`\nCrafting tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
process.exit(failed > 0 ? 1 : 0);
