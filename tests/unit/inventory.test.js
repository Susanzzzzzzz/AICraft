// L1 Unit Test: Inventory module
import { Inventory } from '../../inventory.js';

const ITEM = {
  GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, BRICK: 5, WATER: 6, LEAVES: 7, FLOWER: 8,
  PLANK: 100, STICK: 101, SWORD_WOOD: 102, SWORD_STONE: 103, SWORD_IRON: 104,
  SWORD_DIAMOND: 105, SWORD_NETHERITE: 106, DIAMOND: 107, DIAMOND_CHESTPLATE: 108,
  IRON_INGOT: 109, NETHERITE_SCRAP: 110,
};

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

// ---- Test: addItem basic ----
{
  const inv = new Inventory();
  assert(inv.addItem(ITEM.GRASS, 10), 'addItem returns true');
  const item = inv.hotbar[0];
  assert(item !== null, 'item placed in hotbar[0]');
  assert(item.type === ITEM.GRASS, 'item type matches');
  assert(item.count === 10, 'item count matches');
}

// ---- Test: addItem stacking ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 30);
  inv.addItem(ITEM.GRASS, 30);
  assert(inv.hotbar[0].count === 60, 'stacks to 60');
  inv.addItem(ITEM.GRASS, 10);
  assert(inv.hotbar[0].count === 64, 'stacks to max 64');
  assert(inv.hotbar[1] !== null, 'overflow creates new slot');
}

// ---- Test: addItem fills empty slots ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 64);
  inv.addItem(ITEM.DIRT, 1);
  assert(inv.hotbar[0].type === ITEM.GRASS, 'slot 0 = grass');
  assert(inv.hotbar[1].type === ITEM.DIRT, 'slot 1 = dirt');
}

// ---- Test: addItem into storage when hotbar full ----
{
  const inv = new Inventory();
  for (let i = 0; i < 8; i++) {
    inv.hotbar[i] = { type: i + 1, count: 64 };
  }
  inv.addItem(ITEM.STONE, 1);
  assert(inv.storage[0] !== null, 'lands in storage slot');
  assert(inv.storage[0].type === ITEM.STONE, 'storage slot type correct');
}

// ---- Test: removeItem basic ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 10);
  assert(inv.removeItem(ITEM.GRASS, 4), 'removeItem returns true');
  assert(inv.hotbar[0].count === 6, 'count decreased to 6');
  assert(inv.removeItem(ITEM.GRASS, 6), 'remove remaining');
  assert(inv.hotbar[0] === null, 'slot becomes null');
}

// ---- Test: removeItem not enough ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 3);
  assert(!inv.removeItem(ITEM.GRASS, 5), 'removeItem returns false when insufficient');
  assert(inv.hotbar[0].count === 3, 'item count unchanged');
}

// ---- Test: hasItem ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 10);
  assert(inv.hasItem(ITEM.GRASS, 5), 'hasItem with sufficient count');
  assert(!inv.hasItem(ITEM.GRASS, 20), '!hasItem with insufficient count');
  assert(!inv.hasItem(ITEM.DIRT, 1), '!hasItem for missing type');
}

// ---- Test: countItem ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 10);
  inv.addItem(ITEM.GRASS, 20);
  assert(inv.countItem(ITEM.GRASS) === 30, 'countItem adds stacked totals');
  assert(inv.countItem(ITEM.DIRT) === 0, 'countItem missing returns 0');
}

// ---- Test: getSelectedItem ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.GRASS, 5);
  inv.selectedSlot = 0;
  const sel = inv.getSelectedItem();
  assert(sel !== null, 'getSelectedItem returns item');
  assert(sel.type === ITEM.GRASS, 'selected item type');
}

// ---- Test: getWeaponIds ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.SWORD_WOOD, 1);
  inv.addItem(ITEM.SWORD_DIAMOND, 1);
  const ids = inv.getWeaponIds();
  assert(ids.length === 2, 'finds 2 weapons');
  assert(ids[0] === 102, 'first weapon id SWORD_WOOD');
  assert(ids[1] === 105, 'second weapon id SWORD_DIAMOND');
}

// ---- Test: getWeaponIds dedup ----
{
  const inv = new Inventory();
  inv.addItem(ITEM.SWORD_WOOD, 2);
  const ids = inv.getWeaponIds();
  assert(ids.length === 1, 'deduplicates same weapon');
}

// ---- Test: hasDiamondArmor ----
{
  const inv = new Inventory();
  assert(!inv.hasDiamondArmor(), 'no armor initially');
  inv.addItem(ITEM.DIAMOND_CHESTPLATE, 1);
  assert(inv.hasDiamondArmor(), 'detects diamond chestplate');
}

// ---- Test: stack across hotbar + storage ----
{
  const inv = new Inventory();
  inv.storage[0] = { type: ITEM.GRASS, count: 30 };
  inv.addItem(ITEM.GRASS, 40);
  assert(inv.storage[0].count === 64, 'stacks into storage first');
  const remaining = inv.countItem(ITEM.GRASS) - inv.storage[0].count;
  assert(remaining === 6, 'overflow into hotbar: ' + remaining);
}

// ---- Summary ----
console.log(`\nInventory tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
process.exit(failed > 0 ? 1 : 0);
