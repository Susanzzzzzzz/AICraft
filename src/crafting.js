// Crafting module — 2x2 recipe matching system
import { ITEM } from './world.js';

const RECIPES = [
  // 1 wood → 4 planks (shapeless)
  { inputs: [{ type: ITEM.WOOD, count: 1 }], output: { type: ITEM.PLANK, count: 4 }, shapeless: true },
  // 2 planks vertical → 4 sticks
  { inputs: [{ type: ITEM.PLANK, count: 1, slot: 0 }, { type: ITEM.PLANK, count: 1, slot: 2 }],
    output: { type: ITEM.STICK, count: 4 } },
  // Plank + stick → wooden sword
  { inputs: [{ type: ITEM.PLANK, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SWORD_WOOD, count: 1 } },
  // Stone + stick → stone sword
  { inputs: [{ type: ITEM.STONE, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SWORD_STONE, count: 1 } },
  // Diamond + stick → diamond sword
  { inputs: [{ type: ITEM.DIAMOND, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SWORD_DIAMOND, count: 1 } },
  // Iron ingot + stick → iron sword
  { inputs: [{ type: ITEM.IRON_INGOT, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SWORD_IRON, count: 1 } },
  // Netherite scrap + stick → netherite sword
  { inputs: [{ type: ITEM.NETHERITE_SCRAP, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SWORD_NETHERITE, count: 1 } },
  // Diamond + netherite scrap → 霜之哀伤
  { inputs: [{ type: ITEM.DIAMOND, count: 2, slot: 0 }, { type: ITEM.NETHERITE_SCRAP, count: 2, slot: 2 }],
    output: { type: ITEM.SWORD_FROSTMOURNE, count: 1 } },
  // Diamond + iron ingot → 屠龙宝刀
  { inputs: [{ type: ITEM.DIAMOND, count: 2, slot: 0 }, { type: ITEM.IRON_INGOT, count: 2, slot: 2 }],
    output: { type: ITEM.SWORD_DRAGON, count: 1 } },
  // --- Tools: Pickaxes ---
  // [M .]  slot0=M, slot2=M, slot3=S
  // [M S]
  { inputs: [{ type: ITEM.PLANK, count: 1, slot: 0 }, { type: ITEM.PLANK, count: 1, slot: 2 }, { type: ITEM.STICK, count: 1, slot: 3 }],
    output: { type: ITEM.PICKAXE_WOOD, count: 1 } },
  { inputs: [{ type: ITEM.STONE, count: 1, slot: 0 }, { type: ITEM.STONE, count: 1, slot: 2 }, { type: ITEM.STICK, count: 1, slot: 3 }],
    output: { type: ITEM.PICKAXE_STONE, count: 1 } },
  { inputs: [{ type: ITEM.IRON_INGOT, count: 1, slot: 0 }, { type: ITEM.IRON_INGOT, count: 1, slot: 2 }, { type: ITEM.STICK, count: 1, slot: 3 }],
    output: { type: ITEM.PICKAXE_IRON, count: 1 } },
  { inputs: [{ type: ITEM.DIAMOND, count: 1, slot: 0 }, { type: ITEM.DIAMOND, count: 1, slot: 2 }, { type: ITEM.STICK, count: 1, slot: 3 }],
    output: { type: ITEM.PICKAXE_DIAMOND, count: 1 } },
  // --- Tools: Axes ---
  // [M S]  slot0=M, slot1=S, slot2=M
  // [M .]
  { inputs: [{ type: ITEM.PLANK, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 1 }, { type: ITEM.PLANK, count: 1, slot: 2 }],
    output: { type: ITEM.AXE_WOOD, count: 1 } },
  { inputs: [{ type: ITEM.STONE, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 1 }, { type: ITEM.STONE, count: 1, slot: 2 }],
    output: { type: ITEM.AXE_STONE, count: 1 } },
  { inputs: [{ type: ITEM.IRON_INGOT, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 1 }, { type: ITEM.IRON_INGOT, count: 1, slot: 2 }],
    output: { type: ITEM.AXE_IRON, count: 1 } },
  { inputs: [{ type: ITEM.DIAMOND, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 1 }, { type: ITEM.DIAMOND, count: 1, slot: 2 }],
    output: { type: ITEM.AXE_DIAMOND, count: 1 } },
  // --- Tools: Shovels ---
  // [M .]  slot0=M, slot2=S
  // [S .]
  { inputs: [{ type: ITEM.PLANK, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SHOVEL_WOOD, count: 1 } },
  { inputs: [{ type: ITEM.STONE, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SHOVEL_STONE, count: 1 } },
  { inputs: [{ type: ITEM.IRON_INGOT, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SHOVEL_IRON, count: 1 } },
  { inputs: [{ type: ITEM.DIAMOND, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 2 }],
    output: { type: ITEM.SHOVEL_DIAMOND, count: 1 } },
  // 3 stone → 6 brick (smelting alternative)

  // Bow: 2 sticks + 1 slime ball (string substitute, simplified 2x2)
  { inputs: [{ type: ITEM.STICK, count: 2, slot: 0 }, { type: ITEM.SLIME_BALL, count: 1, slot: 2 }],
    output: { type: ITEM.BOW, count: 1 } },
  // Arrow: gravel(flint) + stick + reed(fletching) -> 4
  { inputs: [{ type: ITEM.GRAVEL_ITEM, count: 1, slot: 0 }, { type: ITEM.STICK, count: 1, slot: 1 }, { type: ITEM.REED, count: 1, slot: 2 }],
    output: { type: ITEM.ARROW, count: 4 } },
  // Iron helmet: 5 ingots simplified to 2+2
  { inputs: [{ type: ITEM.IRON_INGOT, count: 2, slot: 0 }, { type: ITEM.IRON_INGOT, count: 2, slot: 2 }],
    output: { type: ITEM.IRON_HELMET, count: 1 }, shapeless: true },
  // Iron chestplate: 8->4 ingots simplified
  { inputs: [{ type: ITEM.IRON_INGOT, count: 3, slot: 0 }, { type: ITEM.IRON_INGOT, count: 3, slot: 2 }],
    output: { type: ITEM.IRON_CHESTPLATE, count: 1 }, shapeless: true },
  // Iron leggings: 7->3+2
  { inputs: [{ type: ITEM.IRON_INGOT, count: 3, slot: 0 }, { type: ITEM.IRON_INGOT, count: 2, slot: 2 }],
    output: { type: ITEM.IRON_LEGGINGS, count: 1 }, shapeless: true },
  // Iron boots: 4->2+2
  { inputs: [{ type: ITEM.IRON_INGOT, count: 2, slot: 0 }, { type: ITEM.IRON_INGOT, count: 2, slot: 2 }],
    output: { type: ITEM.IRON_BOOTS, count: 1 }, shapeless: true },
  // Diamond helmet
  { inputs: [{ type: ITEM.DIAMOND, count: 2, slot: 0 }, { type: ITEM.DIAMOND, count: 2, slot: 2 }],
    output: { type: ITEM.DIAMOND_HELMET, count: 1 }, shapeless: true },
  // Diamond chestplate (new)
  { inputs: [{ type: ITEM.DIAMOND, count: 3, slot: 0 }, { type: ITEM.DIAMOND, count: 3, slot: 2 }],
    output: { type: ITEM.DIAMOND_CHESTPLATE_NEW, count: 1 }, shapeless: true },
  // Diamond leggings
  { inputs: [{ type: ITEM.DIAMOND, count: 3, slot: 0 }, { type: ITEM.DIAMOND, count: 2, slot: 2 }],
    output: { type: ITEM.DIAMOND_LEGGINGS, count: 1 }, shapeless: true },
  // Diamond boots
  { inputs: [{ type: ITEM.DIAMOND, count: 2, slot: 0 }, { type: ITEM.DIAMOND, count: 2, slot: 2 }],
    output: { type: ITEM.DIAMOND_BOOTS, count: 1 }, shapeless: true },
  // Chest: 8 wood
  { inputs: [{ type: ITEM.WOOD, count: 8 }], output: { type: ITEM.CHEST, count: 1 }, shapeless: true },
];

function matchRecipe(grid) {
  for (const recipe of RECIPES) {
    if (matches(grid, recipe)) return recipe;
  }
  return null;
}

function matches(grid, recipe) {
  if (recipe.shapeless) return matchesShapeless(grid, recipe);
  return matchesPositional(grid, recipe);
}

function matchesShapeless(grid, recipe) {
  const available = grid.filter(s => s !== null).map(s => ({ type: s.type, count: s.count }));
  for (const need of recipe.inputs) {
    let found = false;
    for (const avail of available) {
      if (avail.type === need.type && avail.count >= need.count) {
        found = true;
        avail.count -= need.count;
        break;
      }
    }
    if (!found) return false;
  }
  return available.filter(a => a.count > 0).length === 0;
}

function matchesPositional(grid, recipe) {
  for (const need of recipe.inputs) {
    const slot = grid[need.slot];
    if (!slot || slot.type !== need.type || slot.count < need.count) return false;
  }
  const requiredSlots = new Set(recipe.inputs.map(r => r.slot));
  for (let i = 0; i < 4; i++) {
    if (!requiredSlots.has(i) && grid[i] !== null) return false;
  }
  return true;
}

export function getCraftResult(grid) {
  const recipe = matchRecipe(grid);
  return recipe ? recipe.output : null;
}

export function consumeCraftInput(grid) {
  const recipe = matchRecipe(grid);
  if (!recipe) return;
  for (const need of recipe.inputs) {
    if (recipe.shapeless) {
      for (let i = 0; i < 4; i++) {
        if (grid[i] && grid[i].type === need.type) {
          grid[i].count -= need.count;
          if (grid[i].count <= 0) grid[i] = null;
          break;
        }
      }
    } else {
      const slot = grid[need.slot];
      if (slot) {
        slot.count -= need.count;
        if (slot.count <= 0) grid[need.slot] = null;
      }
    }
  }
}
