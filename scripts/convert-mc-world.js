// convert-mc-world.js — Convert Minecraft Java .mca region files to AICraft world data
// Usage: node scripts/convert-mc-world.js --input <region-dir> [--output <out-dir>] [--cx 0] [--cz 0] [--radius 5]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

// ============================================================
// AICraft BLOCK constants (must match src/world.js)
// ============================================================
const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, BRICK: 5,
  WATER: 6, LEAVES: 7, FLOWER: 8, MUD: 9, CLAY: 10,
  LILY_PAD: 11, REED: 12, COAL_ORE: 13, IRON_ORE: 14, GOLD_ORE: 15,
  DIAMOND_ORE: 16, REDSTONE_ORE: 17, LAPIS_ORE: 18, SAND: 19, GRAVEL: 20,
  SNOW: 21, CACTUS: 22, CHEST: 23, TORCH: 24, GRANITE: 25, DIORITE: 26,
  ANDESITE: 27, RED_SAND: 28, TERRACOTTA: 29,
};

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 64;
const CHUNK_VOL = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE; // 16384

// ============================================================
// MC block name → AICraft block mapping
// ============================================================
const BLOCK_MAP = new Map();

// Terrain
BLOCK_MAP.set('minecraft:stone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:granite', BLOCK.GRANITE);
BLOCK_MAP.set('minecraft:diorite', BLOCK.DIORITE);
BLOCK_MAP.set('minecraft:andesite', BLOCK.ANDESITE);
BLOCK_MAP.set('minecraft:deepslate', BLOCK.STONE);
BLOCK_MAP.set('minecraft:calcite', BLOCK.STONE);
BLOCK_MAP.set('minecraft:tuff', BLOCK.STONE);
BLOCK_MAP.set('minecraft:cobblestone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:smooth_stone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:stone_bricks', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:chiseled_stone_bricks', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:cracked_stone_bricks', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:mossy_stone_bricks', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:mossy_cobblestone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:infested_stone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:blackstone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:bedrock', BLOCK.STONE);

// Surface
BLOCK_MAP.set('minecraft:grass_block', BLOCK.GRASS);
BLOCK_MAP.set('minecraft:dirt', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:coarse_dirt', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:podzol', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:mycelium', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:gravel', BLOCK.GRAVEL);
BLOCK_MAP.set('minecraft:sand', BLOCK.SAND);
BLOCK_MAP.set('minecraft:red_sand', BLOCK.RED_SAND);
BLOCK_MAP.set('minecraft:sandstone', BLOCK.SAND);
BLOCK_MAP.set('minecraft:red_sandstone', BLOCK.RED_SAND);
BLOCK_MAP.set('minecraft:clay', BLOCK.CLAY);
BLOCK_MAP.set('minecraft:mud', BLOCK.MUD);
BLOCK_MAP.set('minecraft:snow', BLOCK.SNOW);
BLOCK_MAP.set('minecraft:snow_block', BLOCK.SNOW);
BLOCK_MAP.set('minecraft:ice', BLOCK.SNOW);
BLOCK_MAP.set('minecraft:packed_ice', BLOCK.SNOW);
BLOCK_MAP.set('minecraft:blue_ice', BLOCK.SNOW);

// Terracotta
BLOCK_MAP.set('minecraft:terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:white_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:orange_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:magenta_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:light_blue_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:yellow_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:lime_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:pink_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:gray_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:light_gray_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:cyan_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:purple_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:blue_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:brown_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:green_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:red_terracotta', BLOCK.TERRACOTTA);
BLOCK_MAP.set('minecraft:black_terracotta', BLOCK.TERRACOTTA);

// Wood / Planks
const WOOD_TYPES = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'crimson', 'warped'];
for (const w of WOOD_TYPES) {
  BLOCK_MAP.set(`minecraft:${w}_log`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:stripped_${w}_log`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_wood`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:stripped_${w}_wood`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_planks`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_stairs`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_slab`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_fence`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_fence_gate`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_door`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_trapdoor`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_button`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_pressure_plate`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_sign`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_wall_sign`, BLOCK.WOOD);
  BLOCK_MAP.set(`minecraft:${w}_leaves`, BLOCK.LEAVES);
  BLOCK_MAP.set(`minecraft:${w}_sapling`, BLOCK.FLOWER);
}

// Leaves (non-wood variants)
BLOCK_MAP.set('minecraft:azalea_leaves', BLOCK.LEAVES);
BLOCK_MAP.set('minecraft:flowering_azalea_leaves', BLOCK.LEAVES);

// Natural blocks
BLOCK_MAP.set('minecraft:glass', BLOCK.WATER); // use WATER as nearest transparent
BLOCK_MAP.set('minecraft:glass_pane', BLOCK.WATER);
BLOCK_MAP.set('minecraft:white_stained_glass', BLOCK.WATER);
BLOCK_MAP.set('minecraft:bookshelf', BLOCK.WOOD);

// Ores
BLOCK_MAP.set('minecraft:coal_ore', BLOCK.COAL_ORE);
BLOCK_MAP.set('minecraft:deepslate_coal_ore', BLOCK.COAL_ORE);
BLOCK_MAP.set('minecraft:iron_ore', BLOCK.IRON_ORE);
BLOCK_MAP.set('minecraft:deepslate_iron_ore', BLOCK.IRON_ORE);
BLOCK_MAP.set('minecraft:gold_ore', BLOCK.GOLD_ORE);
BLOCK_MAP.set('minecraft:deepslate_gold_ore', BLOCK.GOLD_ORE);
BLOCK_MAP.set('minecraft:diamond_ore', BLOCK.DIAMOND_ORE);
BLOCK_MAP.set('minecraft:deepslate_diamond_ore', BLOCK.DIAMOND_ORE);
BLOCK_MAP.set('minecraft:redstone_ore', BLOCK.REDSTONE_ORE);
BLOCK_MAP.set('minecraft:deepslate_redstone_ore', BLOCK.REDSTONE_ORE);
BLOCK_MAP.set('minecraft:lapis_ore', BLOCK.LAPIS_ORE);
BLOCK_MAP.set('minecraft:deepslate_lapis_ore', BLOCK.LAPIS_ORE);
BLOCK_MAP.set('minecraft:copper_ore', BLOCK.IRON_ORE);
BLOCK_MAP.set('minecraft:deepslate_copper_ore', BLOCK.IRON_ORE);
BLOCK_MAP.set('minecraft:emerald_ore', BLOCK.DIAMOND_ORE);
BLOCK_MAP.set('minecraft:deepslate_emerald_ore', BLOCK.DIAMOND_ORE);
BLOCK_MAP.set('minecraft:nether_gold_ore', BLOCK.GOLD_ORE);
BLOCK_MAP.set('minecraft:nether_quartz_ore', BLOCK.STONE);

// Bricks / Stone-like
BLOCK_MAP.set('minecraft:bricks', BLOCK.BRICK);
for (const color of ['red', 'black', 'blue', 'brown', 'cyan', 'gray', 'green', 'light_blue', 'light_gray', 'lime', 'magenta', 'orange', 'pink', 'purple', 'white', 'yellow']) {
  BLOCK_MAP.set(`minecraft:${color}_concrete`, BLOCK.BRICK);
  BLOCK_MAP.set(`minecraft:${color}_concrete_powder`, BLOCK.BRICK);
  BLOCK_MAP.set(`minecraft:${color}_wool`, BLOCK.BRICK);
  BLOCK_MAP.set(`minecraft:${color}_carpet`, BLOCK.BRICK);
  BLOCK_MAP.set(`minecraft:${color}_stained_glass`, BLOCK.WATER);
  BLOCK_MAP.set(`minecraft:${color}_stained_glass_pane`, BLOCK.WATER);
}
BLOCK_MAP.set('minecraft:sponge', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:wet_sponge', BLOCK.MUD);
BLOCK_MAP.set('minecraft:netherrack', BLOCK.STONE);
BLOCK_MAP.set('minecraft:end_stone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:obsidian', BLOCK.STONE);
BLOCK_MAP.set('minecraft:purpur_block', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:purpur_pillar', BLOCK.BRICK);

// Plants
BLOCK_MAP.set('minecraft:cactus', BLOCK.CACTUS);
BLOCK_MAP.set('minecraft:sugar_cane', BLOCK.REED);
BLOCK_MAP.set('minecraft:lily_pad', BLOCK.LILY_PAD);
BLOCK_MAP.set('minecraft:vine', BLOCK.LEAVES);
BLOCK_MAP.set('minecraft:glow_lichen', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:moss_block', BLOCK.GRASS);
BLOCK_MAP.set('minecraft:azalea', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:flowering_azalea', BLOCK.FLOWER);

// Flowers & decorative
BLOCK_MAP.set('minecraft:grass', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:tall_grass', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:fern', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:large_fern', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:dandelion', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:poppy', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:blue_orchid', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:allium', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:azure_bluet', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:red_tulip', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:orange_tulip', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:white_tulip', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:pink_tulip', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:oxeye_daisy', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:cornflower', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:lily_of_the_valley', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:wither_rose', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:sunflower', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:lilac', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:rose_bush', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:peony', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:torchflower', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:pitcher_plant', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:brown_mushroom', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:red_mushroom', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:crimson_fungus', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:warped_fungus', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:crimson_roots', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:warped_roots', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:nether_sprouts', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:dead_bush', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:water', BLOCK.WATER);
BLOCK_MAP.set('minecraft:kelp', BLOCK.WATER);
BLOCK_MAP.set('minecraft:kelp_plant', BLOCK.WATER);
BLOCK_MAP.set('minecraft:seagrass', BLOCK.WATER);
BLOCK_MAP.set('minecraft:tall_seagrass', BLOCK.WATER);

// Functional blocks
BLOCK_MAP.set('minecraft:chest', BLOCK.CHEST);
BLOCK_MAP.set('minecraft:trapped_chest', BLOCK.CHEST);
BLOCK_MAP.set('minecraft:barrel', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:torch', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:wall_torch', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:lantern', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:soul_lantern', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:jack_o_lantern', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:campfire', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:soul_campfire', BLOCK.TORCH);
BLOCK_MAP.set('minecraft:furnace', BLOCK.STONE);
BLOCK_MAP.set('minecraft:blast_furnace', BLOCK.STONE);
BLOCK_MAP.set('minecraft:smoker', BLOCK.STONE);
BLOCK_MAP.set('minecraft:crafting_table', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:anvil', BLOCK.STONE);
BLOCK_MAP.set('minecraft:chipped_anvil', BLOCK.STONE);
BLOCK_MAP.set('minecraft:damaged_anvil', BLOCK.STONE);
BLOCK_MAP.set('minecraft:grindstone', BLOCK.STONE);
BLOCK_MAP.set('minecraft:stonecutter', BLOCK.STONE);
BLOCK_MAP.set('minecraft:cauldron', BLOCK.STONE);
BLOCK_MAP.set('minecraft:composter', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:lectern', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:loom', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:cartography_table', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:fletching_table', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:smithing_table', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:beehive', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:bee_nest', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:honeycomb_block', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:honey_block', BLOCK.DIRT);

// Paths / slabs
BLOCK_MAP.set('minecraft:dirt_path', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:farmland', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:cobblestone_slab', BLOCK.STONE);
BLOCK_MAP.set('minecraft:cobblestone_stairs', BLOCK.STONE);
BLOCK_MAP.set('minecraft:stone_slab', BLOCK.STONE);
BLOCK_MAP.set('minecraft:smooth_stone_slab', BLOCK.STONE);
BLOCK_MAP.set('minecraft:stone_brick_slab', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:stone_brick_stairs', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:brick_slab', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:brick_stairs', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:andesite_slab', BLOCK.ANDESITE);
BLOCK_MAP.set('minecraft:diorite_slab', BLOCK.DIORITE);
BLOCK_MAP.set('minecraft:granite_slab', BLOCK.GRANITE);
BLOCK_MAP.set('minecraft:sandstone_slab', BLOCK.SAND);
BLOCK_MAP.set('minecraft:sandstone_stairs', BLOCK.SAND);
BLOCK_MAP.set('minecraft:red_sandstone_slab', BLOCK.RED_SAND);
BLOCK_MAP.set('minecraft:red_sandstone_stairs', BLOCK.RED_SAND);

// Lava → STONE (nearest solid)
BLOCK_MAP.set('minecraft:lava', BLOCK.STONE);
BLOCK_MAP.set('minecraft:magma_block', BLOCK.STONE);

// Utility blocks
BLOCK_MAP.set('minecraft:bedrock', BLOCK.STONE);
BLOCK_MAP.set('minecraft:spawner', BLOCK.STONE);
BLOCK_MAP.set('minecraft:cobweb', BLOCK.FLOWER);
BLOCK_MAP.set('minecraft:tnt', BLOCK.BRICK);
BLOCK_MAP.set('minecraft:slime_block', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:target', BLOCK.WOOD);
BLOCK_MAP.set('minecraft:hay_block', BLOCK.DIRT);
BLOCK_MAP.set('minecraft:dried_kelp_block', BLOCK.DIRT);

// ============================================================
// Legacy MC format (pre-1.13) — numeric block ID → AICraft block
// ============================================================
const LEGACY_BLOCK_MAP = new Map();

// Air
LEGACY_BLOCK_MAP.set(0, BLOCK.AIR);

// Stone variants
LEGACY_BLOCK_MAP.set(1, BLOCK.STONE);   // Stone
LEGACY_BLOCK_MAP.set(4, BLOCK.STONE);   // Cobblestone
LEGACY_BLOCK_MAP.set(7, BLOCK.STONE);   // Bedrock
LEGACY_BLOCK_MAP.set(48, BLOCK.STONE);  // Mossy Cobblestone
LEGACY_BLOCK_MAP.set(49, BLOCK.STONE);  // Obsidian
LEGACY_BLOCK_MAP.set(52, BLOCK.STONE);  // Monster Spawner
LEGACY_BLOCK_MAP.set(87, BLOCK.STONE);  // Netherrack
LEGACY_BLOCK_MAP.set(98, BLOCK.BRICK);  // Stone Bricks
LEGACY_BLOCK_MAP.set(121, BLOCK.STONE); // End Stone
LEGACY_BLOCK_MAP.set(139, BLOCK.STONE); // Mossy Cobblestone Wall

// Surface
LEGACY_BLOCK_MAP.set(2, BLOCK.GRASS);   // Grass Block
LEGACY_BLOCK_MAP.set(3, BLOCK.DIRT);    // Dirt
LEGACY_BLOCK_MAP.set(60, BLOCK.DIRT);   // Farmland
LEGACY_BLOCK_MAP.set(88, BLOCK.DIRT);   // Soul Sand
LEGACY_BLOCK_MAP.set(110, BLOCK.DIRT);  // Mycelium
LEGACY_BLOCK_MAP.set(158, BLOCK.DIRT);  // Podzol

// Sand / Gravel / Terracotta
LEGACY_BLOCK_MAP.set(12, BLOCK.SAND);
LEGACY_BLOCK_MAP.set(24, BLOCK.SAND);       // Sandstone
LEGACY_BLOCK_MAP.set(13, BLOCK.GRAVEL);
LEGACY_BLOCK_MAP.set(179, BLOCK.RED_SAND);  // Red Sandstone
LEGACY_BLOCK_MAP.set(172, BLOCK.TERRACOTTA); // Hardened Clay
LEGACY_BLOCK_MAP.set(159, BLOCK.TERRACOTTA); // Stained Clay

// Wood / Planks / Logs
LEGACY_BLOCK_MAP.set(5, BLOCK.WOOD);    // Oak Planks
LEGACY_BLOCK_MAP.set(17, BLOCK.WOOD);   // Oak/Spruce/Birch/Jungle Log
LEGACY_BLOCK_MAP.set(53, BLOCK.WOOD);   // Oak Stairs
LEGACY_BLOCK_MAP.set(85, BLOCK.WOOD);   // Oak Fence
LEGACY_BLOCK_MAP.set(47, BLOCK.WOOD);   // Bookshelf
LEGACY_BLOCK_MAP.set(58, BLOCK.WOOD);   // Crafting Table
LEGACY_BLOCK_MAP.set(84, BLOCK.WOOD);   // Jukebox
LEGACY_BLOCK_MAP.set(86, BLOCK.WOOD);   // Pumpkin
LEGACY_BLOCK_MAP.set(103, BLOCK.WOOD);  // Melon
LEGACY_BLOCK_MAP.set(162, BLOCK.WOOD);  // Acacia/Dark Oak Log
LEGACY_BLOCK_MAP.set(163, BLOCK.WOOD);  // Acacia Stairs
LEGACY_BLOCK_MAP.set(164, BLOCK.WOOD);  // Dark Oak Stairs
LEGACY_BLOCK_MAP.set(188, BLOCK.WOOD);  // Spruce Fence
LEGACY_BLOCK_MAP.set(189, BLOCK.WOOD);  // Birch Fence
LEGACY_BLOCK_MAP.set(190, BLOCK.WOOD);  // Jungle Fence
LEGACY_BLOCK_MAP.set(191, BLOCK.WOOD);  // Dark Oak Fence
LEGACY_BLOCK_MAP.set(192, BLOCK.WOOD);  // Acacia Fence
LEGACY_BLOCK_MAP.set(65, BLOCK.WOOD);   // Ladder

// Leaves
LEGACY_BLOCK_MAP.set(18, BLOCK.LEAVES);
LEGACY_BLOCK_MAP.set(161, BLOCK.LEAVES); // Acacia/Dark Oak Leaves
LEGACY_BLOCK_MAP.set(106, BLOCK.LEAVES); // Vines

// Water / Ice
LEGACY_BLOCK_MAP.set(8, BLOCK.WATER);   // Water (flowing)
LEGACY_BLOCK_MAP.set(9, BLOCK.WATER);   // Water (still)
LEGACY_BLOCK_MAP.set(79, BLOCK.SNOW);   // Ice
LEGACY_BLOCK_MAP.set(174, BLOCK.SNOW);  // Packed Ice

// Lava → STONE (nearest solid)
LEGACY_BLOCK_MAP.set(10, BLOCK.STONE);  // Lava (flowing)
LEGACY_BLOCK_MAP.set(11, BLOCK.STONE);  // Lava (still)

// Snow
LEGACY_BLOCK_MAP.set(78, BLOCK.SNOW);   // Snow Layer
LEGACY_BLOCK_MAP.set(80, BLOCK.SNOW);   // Snow Block

// Clay / Lily Pad / Cactus / Reed
LEGACY_BLOCK_MAP.set(82, BLOCK.CLAY);
LEGACY_BLOCK_MAP.set(111, BLOCK.LILY_PAD);
LEGACY_BLOCK_MAP.set(81, BLOCK.CACTUS);
LEGACY_BLOCK_MAP.set(83, BLOCK.REED);

// Glass → WATER (nearest transparent)
LEGACY_BLOCK_MAP.set(20, BLOCK.WATER);
LEGACY_BLOCK_MAP.set(95, BLOCK.WATER);  // Stained Glass

// Ores
LEGACY_BLOCK_MAP.set(14, BLOCK.GOLD_ORE);
LEGACY_BLOCK_MAP.set(15, BLOCK.IRON_ORE);
LEGACY_BLOCK_MAP.set(16, BLOCK.COAL_ORE);
LEGACY_BLOCK_MAP.set(21, BLOCK.LAPIS_ORE);
LEGACY_BLOCK_MAP.set(56, BLOCK.DIAMOND_ORE);
LEGACY_BLOCK_MAP.set(73, BLOCK.REDSTONE_ORE);
LEGACY_BLOCK_MAP.set(74, BLOCK.REDSTONE_ORE);  // Lit Redstone Ore
LEGACY_BLOCK_MAP.set(129, BLOCK.DIAMOND_ORE);  // Emerald Ore

// Torch / Light sources
LEGACY_BLOCK_MAP.set(50, BLOCK.TORCH);
LEGACY_BLOCK_MAP.set(89, BLOCK.TORCH);    // Glowstone
LEGACY_BLOCK_MAP.set(198, BLOCK.TORCH);   // End Rod

// Bricks / Stone-like
LEGACY_BLOCK_MAP.set(45, BLOCK.BRICK);    // Brick Block
LEGACY_BLOCK_MAP.set(108, BLOCK.BRICK);   // Brick Stairs
LEGACY_BLOCK_MAP.set(112, BLOCK.BRICK);   // Nether Brick
LEGACY_BLOCK_MAP.set(114, BLOCK.BRICK);   // Nether Brick Stairs
LEGACY_BLOCK_MAP.set(155, BLOCK.BRICK);   // Quartz Block
LEGACY_BLOCK_MAP.set(156, BLOCK.BRICK);   // Quartz Stairs
LEGACY_BLOCK_MAP.set(168, BLOCK.BRICK);   // Prismarine
LEGACY_BLOCK_MAP.set(201, BLOCK.BRICK);   // Purpur Block
LEGACY_BLOCK_MAP.set(202, BLOCK.BRICK);   // Purpur Pillar
LEGACY_BLOCK_MAP.set(205, BLOCK.BRICK);   // Purpur Stairs
LEGACY_BLOCK_MAP.set(206, BLOCK.BRICK);   // End Stone Bricks

// Ore blocks
LEGACY_BLOCK_MAP.set(41, BLOCK.BRICK);    // Gold Block
LEGACY_BLOCK_MAP.set(42, BLOCK.BRICK);    // Iron Block
LEGACY_BLOCK_MAP.set(57, BLOCK.BRICK);    // Diamond Block
LEGACY_BLOCK_MAP.set(22, BLOCK.BRICK);    // Lapis Block
LEGACY_BLOCK_MAP.set(133, BLOCK.BRICK);   // Emerald Block
LEGACY_BLOCK_MAP.set(152, BLOCK.BRICK);   // Redstone Block
LEGACY_BLOCK_MAP.set(173, BLOCK.BRICK);   // Coal Block

// Wool / Carpet / TNT
LEGACY_BLOCK_MAP.set(35, BLOCK.BRICK);    // Wool
LEGACY_BLOCK_MAP.set(171, BLOCK.BRICK);   // Carpet
LEGACY_BLOCK_MAP.set(46, BLOCK.BRICK);    // TNT

// Flowers / Grass / Mushrooms
LEGACY_BLOCK_MAP.set(31, BLOCK.FLOWER);   // Grass / Tall Grass
LEGACY_BLOCK_MAP.set(32, BLOCK.FLOWER);   // Dead Bush
LEGACY_BLOCK_MAP.set(37, BLOCK.FLOWER);   // Dandelion
LEGACY_BLOCK_MAP.set(38, BLOCK.FLOWER);   // Poppy
LEGACY_BLOCK_MAP.set(39, BLOCK.FLOWER);   // Brown Mushroom
LEGACY_BLOCK_MAP.set(40, BLOCK.FLOWER);   // Red Mushroom
LEGACY_BLOCK_MAP.set(175, BLOCK.FLOWER);  // Double Tallgrass
LEGACY_BLOCK_MAP.set(200, BLOCK.FLOWER);  // Chorus Flower
LEGACY_BLOCK_MAP.set(30, BLOCK.FLOWER);   // Cobweb

// Containers
LEGACY_BLOCK_MAP.set(54, BLOCK.CHEST);    // Chest
LEGACY_BLOCK_MAP.set(61, BLOCK.STONE);    // Furnace
LEGACY_BLOCK_MAP.set(62, BLOCK.STONE);    // Lit Furnace

// Slabs / Stairs / Walls
LEGACY_BLOCK_MAP.set(43, BLOCK.STONE);    // Double Stone Slab
LEGACY_BLOCK_MAP.set(44, BLOCK.STONE);    // Stone Slab
LEGACY_BLOCK_MAP.set(67, BLOCK.STONE);    // Cobblestone Stairs
LEGACY_BLOCK_MAP.set(128, BLOCK.SAND);    // Sandstone Stairs
LEGACY_BLOCK_MAP.set(180, BLOCK.RED_SAND);  // Red Sandstone Stairs
LEGACY_BLOCK_MAP.set(181, BLOCK.RED_SAND);  // Double Red Sandstone Slab
LEGACY_BLOCK_MAP.set(182, BLOCK.RED_SAND);  // Red Sandstone Slab

// Functional / Redstone / Decorative
LEGACY_BLOCK_MAP.set(66, BLOCK.STONE);    // Rail
LEGACY_BLOCK_MAP.set(165, BLOCK.DIRT);    // Slime Block
LEGACY_BLOCK_MAP.set(33, BLOCK.STONE);    // Piston
LEGACY_BLOCK_MAP.set(167, BLOCK.STONE);   // Iron Trapdoor
LEGACY_BLOCK_MAP.set(23, BLOCK.STONE);    // Dispenser
LEGACY_BLOCK_MAP.set(25, BLOCK.WOOD);     // Note Block
LEGACY_BLOCK_MAP.set(26, BLOCK.WOOD);     // Bed
LEGACY_BLOCK_MAP.set(27, BLOCK.STONE);    // Powered Rail
LEGACY_BLOCK_MAP.set(28, BLOCK.STONE);    // Detector Rail
LEGACY_BLOCK_MAP.set(29, BLOCK.STONE);    // Sticky Piston
LEGACY_BLOCK_MAP.set(34, BLOCK.STONE);    // Piston Extension
LEGACY_BLOCK_MAP.set(55, BLOCK.AIR);      // Redstone Wire → skip (no-op)
LEGACY_BLOCK_MAP.set(63, BLOCK.WOOD);     // Sign (standing)
LEGACY_BLOCK_MAP.set(64, BLOCK.WOOD);     // Door (Wood)
LEGACY_BLOCK_MAP.set(68, BLOCK.WOOD);     // Wall Sign
LEGACY_BLOCK_MAP.set(69, BLOCK.STONE);    // Lever
LEGACY_BLOCK_MAP.set(70, BLOCK.STONE);    // Stone Pressure Plate
LEGACY_BLOCK_MAP.set(71, BLOCK.STONE);    // Iron Door
LEGACY_BLOCK_MAP.set(72, BLOCK.WOOD);     // Wood Pressure Plate
LEGACY_BLOCK_MAP.set(75, BLOCK.TORCH);    // Redstone Torch (off)
LEGACY_BLOCK_MAP.set(76, BLOCK.TORCH);    // Redstone Torch (on)
LEGACY_BLOCK_MAP.set(77, BLOCK.STONE);    // Stone Button
LEGACY_BLOCK_MAP.set(91, BLOCK.TORCH);    // Jack o'Lantern
LEGACY_BLOCK_MAP.set(93, BLOCK.STONE);    // Repeater (off)
LEGACY_BLOCK_MAP.set(94, BLOCK.STONE);    // Repeater (on)
LEGACY_BLOCK_MAP.set(96, BLOCK.WOOD);     // Trapdoor (Wood)
LEGACY_BLOCK_MAP.set(101, BLOCK.STONE);   // Iron Bars
LEGACY_BLOCK_MAP.set(102, BLOCK.WATER);   // Glass Pane
LEGACY_BLOCK_MAP.set(107, BLOCK.WOOD);    // Fence Gate
LEGACY_BLOCK_MAP.set(109, BLOCK.BRICK);   // Stone Brick Stairs
LEGACY_BLOCK_MAP.set(113, BLOCK.BRICK);   // Nether Brick Fence
LEGACY_BLOCK_MAP.set(116, BLOCK.STONE);   // Enchantment Table
LEGACY_BLOCK_MAP.set(117, BLOCK.STONE);   // Brewing Stand
LEGACY_BLOCK_MAP.set(118, BLOCK.STONE);   // Cauldron
LEGACY_BLOCK_MAP.set(123, BLOCK.TORCH);   // Redstone Lamp (off)
LEGACY_BLOCK_MAP.set(124, BLOCK.TORCH);   // Redstone Lamp (on)
LEGACY_BLOCK_MAP.set(19, BLOCK.DIRT);     // Sponge
LEGACY_BLOCK_MAP.set(92, BLOCK.WOOD);     // Cake
LEGACY_BLOCK_MAP.set(97, BLOCK.STONE);    // Infested Stone (Silverfish)
LEGACY_BLOCK_MAP.set(99, BLOCK.FLOWER);   // Brown Mushroom Block
LEGACY_BLOCK_MAP.set(100, BLOCK.WOOD);    // Mushroom Stem
LEGACY_BLOCK_MAP.set(131, BLOCK.AIR);     // Tripwire → skip
LEGACY_BLOCK_MAP.set(132, BLOCK.AIR);     // Tripwire Hook → skip
LEGACY_BLOCK_MAP.set(134, BLOCK.WOOD);    // Spruce Stairs
LEGACY_BLOCK_MAP.set(135, BLOCK.WOOD);    // Birch Stairs
LEGACY_BLOCK_MAP.set(136, BLOCK.WOOD);    // Jungle Stairs
LEGACY_BLOCK_MAP.set(137, BLOCK.STONE);   // Command Block
LEGACY_BLOCK_MAP.set(138, BLOCK.TORCH);   // Beacon
LEGACY_BLOCK_MAP.set(140, BLOCK.FLOWER);  // Flower Pot
LEGACY_BLOCK_MAP.set(141, BLOCK.FLOWER);  // Carrots
LEGACY_BLOCK_MAP.set(142, BLOCK.FLOWER);  // Potatoes
LEGACY_BLOCK_MAP.set(143, BLOCK.WOOD);    // Wood Button
LEGACY_BLOCK_MAP.set(144, BLOCK.STONE);   // Mob Head
LEGACY_BLOCK_MAP.set(145, BLOCK.STONE);   // Anvil
LEGACY_BLOCK_MAP.set(146, BLOCK.CHEST);   // Trapped Chest
LEGACY_BLOCK_MAP.set(147, BLOCK.STONE);   // Light Weighted Pressure Plate
LEGACY_BLOCK_MAP.set(148, BLOCK.STONE);   // Heavy Weighted Pressure Plate
LEGACY_BLOCK_MAP.set(153, BLOCK.STONE);   // Nether Quartz Ore
LEGACY_BLOCK_MAP.set(160, BLOCK.BRICK);   // Prismarine (variant)
LEGACY_BLOCK_MAP.set(197, BLOCK.WOOD);    // Dark Oak Fence

// ============================================================
// Entity mapping (MC ID → AICraft type)
// ============================================================
const ENTITY_MAP = {
  'minecraft:villager': 'villager',
  'minecraft:pig': 'pig',
  'minecraft:cow': 'cow',
  'minecraft:sheep': 'sheep',
  'minecraft:chicken': 'chicken',
  'minecraft:zombie': 'zombie',
  'minecraft:skeleton': 'skeleton',
  'minecraft:spider': 'spider',
  'minecraft:creeper': 'creeper',
  'minecraft:enderman': 'enderman',
  'minecraft:wolf': 'wolf'
};

// ============================================================
// Biome ID → Weather mapping (pre-1.13 numeric IDs)
// ============================================================
const BIOME_ID_TO_WEATHER = {
  0: 'rain', 1: 'rain', 4: 'rain', 6: 'rain', 7: 'rain',
  5: 'snow', 10: 'snow', 11: 'snow', 12: 'snow', 13: 'snow',
  16: 'rain', 18: 'rain', 21: 'rain', 22: 'rain', 23: 'rain', 24: 'rain',
  26: 'snow', 27: 'rain', 28: 'rain', 29: 'rain', 30: 'snow', 31: 'snow',
  32: 'snow', 33: 'snow', 34: 'rain',
  35: null, 36: null, 37: null, 38: null, 39: null
};

// ============================================================
// .mca file parsing
// ============================================================

/** Read a 4-byte big-endian unsigned int */
function readUint32BE(buf, offset) {
  return buf.readUInt32BE(offset);
}

/** Decode .mca offset: 3-byte sector offset + 1-byte sector count */
function decodeSectorOffset(rawOffset) {
  if (rawOffset === 0) return null;
  const sector = rawOffset >> 8;
  const count = rawOffset & 0xff;
  return { sector, count };
}

/** Read and decompress a chunk from .mca data */
function readChunkData(mcaData, chunkX, chunkZ) {
  const headerOffset = chunkX * 4 + chunkZ * 4 * 32; // each row is 32 entries
  if (headerOffset + 4 > mcaData.length) return null;

  const rawOffset = readUint32BE(mcaData, headerOffset);
  const loc = decodeSectorOffset(rawOffset);
  if (!loc || loc.sector === 0) return null;

  const chunkStart = loc.sector * 4096;
  if (chunkStart + 4 > mcaData.length) return null;

  const dataLength = readUint32BE(mcaData, chunkStart);
  if (dataLength <= 0 || dataLength > 4096 * loc.count) return null;

  const compressionType = mcaData[chunkStart + 4];
  const compressedData = mcaData.subarray(chunkStart + 5, chunkStart + 5 + dataLength - 1);

  try {
    if (compressionType === 1) {
      return zlib.gunzipSync(compressedData);
    } else if (compressionType === 2) {
      return zlib.inflateSync(compressedData);
    } else if (compressionType === 3) {
      return compressedData; // uncompressed
    }
    console.warn(`  ⚠ Unknown compression type ${compressionType} at chunk [${chunkX}, ${chunkZ}]`);
    return null;
  } catch (e) {
    console.warn(`  ⚠ Decompression failed for chunk [${chunkX}, ${chunkZ}]: ${e.message}`);
    return null;
  }
}

// ============================================================
// Block state decoding
// ============================================================

/** Decode compacted block palette indices from MC's long array format */
function decodeBlockIndices(longValues, bitsPerBlock) {
  if (!longValues || longValues.length === 0) return new Uint16Array(0);

  const blocksPerLong = Math.floor(64 / bitsPerBlock);
  const total = 4096;
  const result = new Uint16Array(total);
  const mask = (BigInt(1) << BigInt(bitsPerBlock)) - BigInt(1);

  for (let i = 0; i < total; i++) {
    const longIdx = Math.floor(i / blocksPerLong);
    if (longIdx >= longValues.length) {
      result[i] = 0;
      continue;
    }
    const bitOffset = (i % blocksPerLong) * bitsPerBlock;

    // longValues[i] is a SignedBigInt [high32, low32] from prismarine-nbt
    const lv = longValues[longIdx];
    // Convert high/low parts to BigInt manually (more reliable than .valueOf())
    const high = BigInt.asIntN(32, BigInt(lv[0]));
    const low = BigInt.asUintN(32, BigInt(lv[1]));
    const longVal = (high << 32n) | low;

    const idx = Number((longVal >> BigInt(bitOffset)) & mask);
    result[i] = idx;
  }

  return result;
}

// ============================================================
// World conversion
// ============================================================

/** Convert MC chunk palette + block data to AICraft chunk blocks array */
function convertChunkBlocks(palette, blockDataLongs) {
  const paletteSize = palette.length;
  if (paletteSize === 0) return null;
  if (paletteSize === 1) {
    // Single block type — fill entirely
    const mcName = palette[0].Name || palette[0].name || '';
    const aicraftType = BLOCK_MAP.get(mcName) ?? BLOCK.AIR;
    const blocks = new Uint8Array(CHUNK_VOL);
    blocks.fill(aicraftType);
    return blocks;
  }

  const bitsPerBlock = Math.max(4, Math.ceil(Math.log2(paletteSize)));
  const indices = decodeBlockIndices(blockDataLongs, bitsPerBlock);
  if (indices.length === 0) return null;

  const blocks = new Uint8Array(CHUNK_VOL);
  for (let i = 0; i < indices.length && i < CHUNK_VOL; i++) {
    const paletteIdx = indices[i];
    if (paletteIdx < paletteSize) {
      const entry = palette[paletteIdx];
      const mcName = entry.Name || entry.name || '';
      blocks[i] = BLOCK_MAP.get(mcName) ?? BLOCK.AIR;
    }
  }
  return blocks;
}

/** Convert an MC section's data to AICraft format within the 0-63 Y range */
function convertSection(mcSection, sectionY, aicraftChunkBlocks) {
  // mcSection Y is the section index (e.g., 0 = Y=0..15, 4 = Y=64..79)
  // AICraft only has Y=0..63
  const blockStates = mcSection.block_states || mcSection.BlockStates;
  if (!blockStates) return;

  const palette = blockStates.palette || blockStates.Palette;
  const data = blockStates.data || blockStates.Data;
  if (!palette || palette.length === 0) return;

  const bitsPerBlock = Math.max(4, Math.ceil(Math.log2(palette.length)));
  const indices = decodeBlockIndices(data, bitsPerBlock);

  // MC section Y range: sectionY*16 to sectionY*16+15
  // AICraft range: 0-63
  const mcBaseY = sectionY * 16;
  if (mcBaseY >= CHUNK_HEIGHT) return; // above AICraft height — skip
  if (mcBaseY + 15 < 0) return; // below AICraft — skip (MC 1.18+ has negative Y)

  for (let ly = 0; ly < 16; ly++) {
    const worldY = mcBaseY + ly;
    if (worldY < 0 || worldY >= CHUNK_HEIGHT) continue;

    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        // MC section index: y*16*16 + z*16 + x  (y varies fastest in MC)
        const mcIdx = ly * 256 + lz * 16 + lx;
        if (mcIdx >= indices.length) continue;

        const paletteIdx = indices[mcIdx];
        if (paletteIdx >= palette.length) continue;

        const entry = palette[paletteIdx];
        const mcName = entry.Name || entry.name || '';
        const aicraftType = BLOCK_MAP.get(mcName) ?? BLOCK.AIR;

        // AICraft chunk index: lx*64*16 + y*16 + lz
        const acIdx = lx * CHUNK_HEIGHT * CHUNK_SIZE + worldY * CHUNK_SIZE + lz;
        aicraftChunkBlocks[acIdx] = aicraftType;
      }
    }
  }
}

// Auto-detect optimal yOffset by finding surface height
async function detectSurfaceOffset(inputDir, centerCX, centerCZ, radius) {
  const mcaFiles = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.mca'))
    .map(f => path.join(inputDir, f));

  const surfaceHeights = [];
  let sampledChunks = 0;

  for (const filePath of mcaFiles) {
    const baseName = path.basename(filePath, '.mca');
    const match = baseName.match(/[r.]*(\-?\d+)[._](\-?\d+)/);
    if (!match) continue;

    const regionX = parseInt(match[1], 10);
    const regionZ = parseInt(match[2], 10);
    const baseChunkX = regionX * 32;
    const baseChunkZ = regionZ * 32;
    const mcaData = fs.readFileSync(filePath);

    for (let lcx = 0; lcx < 32; lcx++) {
      for (let lcz = 0; lcz < 32; lcz++) {
        const cx = baseChunkX + lcx;
        const cz = baseChunkZ + lcz;
        const dx = cx - centerCX;
        const dz = cz - centerCZ;
        if (dx * dx + dz * dz > radius * radius) continue;

        const rawOffset = readUint32BE(mcaData, lcx * 4 + lcz * 4 * 32);
        const loc = decodeSectorOffset(rawOffset);
        if (!loc || loc.sector === 0) continue;

        const chunkStart = loc.sector * 4096;
        const dataLength = readUint32BE(mcaData, chunkStart);
        if (dataLength <= 0) continue;
        const compType = mcaData[chunkStart + 4];
        const compressedData = mcaData.subarray(chunkStart + 5, chunkStart + 5 + dataLength - 1);

        let decompressed;
        try {
          if (compType === 2) decompressed = zlib.inflateSync(compressedData);
          else if (compType === 1) decompressed = zlib.gunzipSync(compressedData);
          else continue;
        } catch (e) { continue; }

        let nbtResult;
        try { nbtResult = await nbt.parse(decompressed); } catch (e) { continue; }
        const simplified = nbt.simplify(nbtResult.parsed);
        const level = simplified.Level || simplified.level || simplified;
        const sections = level.Sections || level.sections || [];
        if (!Array.isArray(sections)) continue;

        for (const section of sections) {
          // Check palette format first
          const bs = section.block_states || section.BlockStates || section.blockStates;
          let hasNonAir = false;
          if (bs && bs.palette) {
            hasNonAir = bs.palette.some(p => {
              const name = p.Name || p.name || '';
              return name !== 'minecraft:air';
            });
          } else {
            // Check legacy format (Blocks byte array)
            const blocksArr = section.Blocks || section.blocks;
            if (blocksArr && blocksArr.length >= 4096) {
              // Scan center of section for non-air blocks
              for (let i = 0; i < 256; i++) {
                if ((blocksArr[i] & 0xFF) !== 0) { hasNonAir = true; break; }
              }
            }
          }
          if (hasNonAir) {
            // Track highest Y for this chunk
            const topY = section.Y * 16 + 15;
            const existing = surfaceHeights.find(e => e.cx === cx && e.cz === cz);
            if (existing) {
              if (topY > existing.highestY) existing.highestY = topY;
            } else {
              surfaceHeights.push({ cx, cz, highestY: topY });
            }
          }
        }
        sampledChunks++;
      }
    }
  }

  if (surfaceHeights.length === 0) {
    console.log('  ⚠ Could not detect surface, using yOffset=0');
    return 0;
  }

  // Strategy: use min surface height minus 20 to capture the most terrain.
  // Tall MC worlds (384 layers) can't fit in AICraft's 64 layers, so we prioritize
  // having solid ground for the player to walk on rather than capturing peaks.
  const sorted = surfaceHeights.map(e => e.highestY).sort((a, b) => a - b);
  const minSurfaceY = sorted[0];
  const maxSurfaceY = sorted[sorted.length - 1];
  const medianSurfaceY = sorted[Math.floor(sorted.length / 2)];

  console.log(`  Surface: min=${minSurfaceY} median=${medianSurfaceY} max=${maxSurfaceY} (${sorted.length} chunks)`);

  const suggested = Math.max(0, minSurfaceY - 20);
  console.log(`  → Using yOffset=${suggested} (lowest surface near top of AICraft height)`);
  return suggested;
}

// ============================================================
// Main async entry point
// ============================================================

async function main() {
  const args = {};
  const argPairs = process.argv.slice(2);
  for (let i = 0; i < argPairs.length; i++) {
    if (argPairs[i].startsWith('--')) {
      const key = argPairs[i].slice(2);
      const val = argPairs[i + 1];
      if (val && !val.startsWith('--')) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  const inputDir = args.input || args.i;
  const outputDir = args.output || args.o || 'dist/worlds/converted';
  const centerCX = parseInt(args.cx || '0', 10);
  const centerCZ = parseInt(args.cz || '0', 10);
  const radius = parseInt(args.radius || '5', 10);
  const yOffset = parseInt(args.yOffset || '0', 10);
  const autoOffset = args.hasOwnProperty('autoOffset') ? args.autoOffset !== false : false;

  if (!inputDir) {
    console.log(`
Usage: node scripts/convert-mc-world.js --input <region-dir> [options]

Options:
  --input <dir>     Path to directory containing .mca region files (required)
  --output <dir>    Output directory (default: dist/worlds/converted)
  --cx <int>        Center chunk X (default: 0)
  --cz <int>        Center chunk Z (default: 0)
  --radius <int>    Radius in chunks from center (default: 5, covers 11x11 chunks)
  --yOffset <int>   Shift MC Y range mapped to AICraft (default: 0 → Y=0..63)
  --autoOffset      Auto-detect surface height and set optimal yOffset
  --help            Show this help
    `);
    return;
  }

  let effectiveYOffset = yOffset;

  if (autoOffset && yOffset === 0) {
    console.log('🔍 Auto-detecting surface height...');
    effectiveYOffset = await detectSurfaceOffset(inputDir, centerCX, centerCZ, radius);
    console.log(`  → Using yOffset = ${effectiveYOffset} (surface centered at AICraft Y≈48)`);
  }

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const mcaFiles = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.mca'))
    .map(f => path.join(inputDir, f));

  if (mcaFiles.length === 0) {
    console.error(`❌ No .mca files found in ${inputDir}`);
    process.exit(1);
  }

  console.log(`\n🔨 MC → AICraft World Converter`);
  console.log(`  Input:  ${inputDir} (${mcaFiles.length} .mca files)`);
  console.log(`  Center: chunk [${centerCX}, ${centerCZ}], radius ${radius}`);
  console.log(`  Output: ${outputDir}`);
  console.log('');

  // Process all chunks in the radius
  const chunksData = {};
  let totalBlocks = 0;
  let mappedBlocks = 0;
  let unmappedNames = new Set();
  const allEntities = [];
  const biomeCounts = {};

  for (const filePath of mcaFiles) {
    const mcaData = fs.readFileSync(filePath);
    const baseName = path.basename(filePath, '.mca');

    // Determine region coordinates from filename
    const match = baseName.match(/[r.]*(\-?\d+)[._](\-?\d+)/);
    if (!match) {
      console.warn(`  ⚠ Skipping ${filePath}: cannot parse region coords`);
      continue;
    }

    const regionX = parseInt(match[1], 10);
    const regionZ = parseInt(match[2], 10);
    const baseChunkX = regionX * 32;
    const baseChunkZ = regionZ * 32;

    console.log(`📦 ${path.basename(filePath)} [region ${regionX}, ${regionZ}]`);

    for (let lcx = 0; lcx < 32; lcx++) {
      for (let lcz = 0; lcz < 32; lcz++) {
        const cx = baseChunkX + lcx;
        const cz = baseChunkZ + lcz;

        // Check if within radius
        const dx = cx - centerCX;
        const dz = cz - centerCZ;
        if (dx * dx + dz * dz > radius * radius) continue;

        // Read chunk from .mca
        const chunkNbtData = readChunkData(mcaData, lcx, lcz);
        if (!chunkNbtData) continue;

        // Parse NBT
        let nbtResult;
        try {
          nbtResult = await nbt.parse(chunkNbtData);
        } catch (e) {
          continue;
        }

        const parsed = nbtResult.parsed;
        const simplified = nbt.simplify(parsed);
        const level = simplified.Level || simplified.level || simplified;
        const sections = level.Sections || level.sections || [];
        if (!Array.isArray(sections) || sections.length === 0) continue;

        // Create AICraft chunk blocks (Uint8Array, 16x64x16, all AIR initially)
        const chunkBlocks = new Uint8Array(CHUNK_VOL);

        // Process each section
        for (const section of sections) {
          const sectionY = section.Y ?? section.y ?? 0;
          const mcBaseY = sectionY * 16;
          // Skip section if entirely outside the AICraft Y range (0..63) after yOffset shift
          if (mcBaseY + 15 < effectiveYOffset || mcBaseY >= effectiveYOffset + CHUNK_HEIGHT) continue;

          // ===== Legacy format (pre-1.13): Blocks byte array =====
          const legacyBlocks = section.Blocks || section.blocks;
          if (legacyBlocks && legacyBlocks.length >= 4096) {
            const addData = section.Add || section.add;
            // addData is nibble[2048] stored as byte[2048] — optional, for block IDs > 255

            for (let ly = 0; ly < 16; ly++) {
              const mcWorldY = mcBaseY + ly;
              const acY = mcWorldY - effectiveYOffset;
              if (acY < 0 || acY >= CHUNK_HEIGHT) continue;
              for (let lz = 0; lz < 16; lz++) {
                for (let lx = 0; lx < 16; lx++) {
                  const mcIdx = ly * 256 + lz * 16 + lx;
                  const rawId = legacyBlocks[mcIdx];
                  let blockId = rawId & 0xFF; // Ensure unsigned (NBT byte is signed)
                  if (blockId === 0) continue; // AIR

                  // Handle Add nibble array for block IDs > 255
                  if (addData) {
                    const addNibble = (addData[mcIdx >> 1] >> ((mcIdx & 1) * 4)) & 0xF;
                    blockId = blockId | (addNibble << 8);
                  }

                  const aicraftType = LEGACY_BLOCK_MAP.get(blockId);
                  if (aicraftType === undefined) {
                    unmappedNames.add(`legacy:${blockId}`);
                    continue;
                  }

                  if (aicraftType !== BLOCK.AIR) {
                    const acIdx = lx * CHUNK_HEIGHT * CHUNK_SIZE + acY * CHUNK_SIZE + lz;
                    chunkBlocks[acIdx] = aicraftType;
                    totalBlocks++;
                  }
                }
              }
            }
            continue; // Skip palette processing for legacy sections
          }

          // ===== Palette format (1.13+): block_states with palette =====
          const blockStates = section.block_states || section.BlockStates || section.blockStates;
          if (!blockStates) continue;

          const palette = blockStates.palette || blockStates.Palette || blockStates.palette_data;
          if (!Array.isArray(palette) || palette.length === 0) continue;

          const data = blockStates.data || blockStates.Data || blockStates.block_data;
          if (!data && palette.length > 1) continue;

          if (palette.length === 1) {
            // Uniform section — fill directly
            const mcName = palette[0].Name || palette[0].name || '';
            const aicraftType = BLOCK_MAP.get(mcName);
            if (aicraftType === undefined) {
              unmappedNames.add(mcName);
              continue;
            }

            for (let ly = 0; ly < 16; ly++) {
              const mcWorldY = mcBaseY + ly;
              const acY = mcWorldY - effectiveYOffset;
              if (acY < 0 || acY >= CHUNK_HEIGHT) continue;
              for (let lz = 0; lz < 16; lz++) {
                for (let lx = 0; lx < 16; lx++) {
                  const acIdx = lx * CHUNK_HEIGHT * CHUNK_SIZE + acY * CHUNK_SIZE + lz;
                  chunkBlocks[acIdx] = aicraftType;
                }
              }
            }
          } else {
            // Section with palette — decode block indices
            const bitsPerBlock = Math.max(4, Math.ceil(Math.log2(palette.length)));
            const indices = decodeBlockIndices(data, bitsPerBlock);

            for (let ly = 0; ly < 16; ly++) {
              const mcWorldY = mcBaseY + ly;
              const acY = mcWorldY - effectiveYOffset;
              if (acY < 0 || acY >= CHUNK_HEIGHT) continue;
              for (let lz = 0; lz < 16; lz++) {
                for (let lx = 0; lx < 16; lx++) {
                  const mcIdx = ly * 256 + lz * 16 + lx;
                  if (mcIdx >= indices.length) continue;
                  const paletteIdx = indices[mcIdx];
                  if (paletteIdx >= palette.length) continue;

                  const entry = palette[paletteIdx];
                  const mcName = entry.Name || entry.name || '';
                  const aicraftType = BLOCK_MAP.get(mcName);

                  if (aicraftType === undefined) {
                    unmappedNames.add(mcName);
                    continue;
                  }

                  if (aicraftType !== BLOCK.AIR) {
                    const acIdx = lx * CHUNK_HEIGHT * CHUNK_SIZE + acY * CHUNK_SIZE + lz;
                    chunkBlocks[acIdx] = aicraftType;
                    totalBlocks++;
                  }
                }
              }
            }
          }
        }

        // ===== Entity Extraction =====
        const entityList = level.Entities || level.entities;
        if (Array.isArray(entityList)) {
          for (const entity of entityList) {
            const mcId = entity.id || '';
            const aicraftType = ENTITY_MAP[mcId];
            if (!aicraftType) continue;
            const pos = entity.Pos || entity.pos;
            if (!Array.isArray(pos) || pos.length < 3) continue;
            allEntities.push({
              type: aicraftType,
              x: Math.round(pos[0] * 10) / 10,
              y: Math.round((pos[1] - effectiveYOffset) * 10) / 10,
              z: Math.round(pos[2] * 10) / 10,
            });
          }
        }

        // ===== Biome Sampling for Weather =====
        const biomeArray = level.Biomes || level.biomes;
        if (Array.isArray(biomeArray) && biomeArray.length > 0) {
          for (const biomeVal of biomeArray) {
            biomeCounts[biomeVal] = (biomeCounts[biomeVal] || 0) + 1;
          }
        }

        // Check if chunk has any blocks (skip fully empty chunks)
        let hasBlocks = false;
        for (let i = 0; i < chunkBlocks.length; i++) {
          if (chunkBlocks[i] !== 0) { hasBlocks = true; break; }
        }

        if (!hasBlocks) continue;

        // Base64 encode the chunk blocks
        const chunkKey = `${cx},${cz}`;
        chunksData[chunkKey] = Buffer.from(chunkBlocks.buffer).toString('base64');
        mappedBlocks += chunkBlocks.reduce((sum, b) => sum + (b !== 0 ? 1 : 0), 0);
      }
    }
  }

  // Calculate min/max chunk coordinates for metadata
  const coords = Object.keys(chunksData).map(k => k.split(',').map(Number));
  let minCX = 0, maxCX = 0, minCZ = 0, maxCZ = 0;
  if (coords.length > 0) {
    minCX = Math.min(...coords.map(c => c[0]));
    maxCX = Math.max(...coords.map(c => c[0]));
    minCZ = Math.min(...coords.map(c => c[1]));
    maxCZ = Math.max(...coords.map(c => c[1]));
  }

  // Determine suggested weather from biome data
  let suggestedWeather = null;
  const biomeEntries = Object.entries(biomeCounts);
  if (biomeEntries.length > 0) {
    let maxCount = 0;
    let mostCommonBiome = -1;
    for (const [id, count] of biomeEntries) {
      if (count > maxCount) { maxCount = count; mostCommonBiome = parseInt(id); }
    }
    if (mostCommonBiome >= 0) {
      const weather = BIOME_ID_TO_WEATHER[mostCommonBiome];
      suggestedWeather = weather !== undefined ? weather : null;
    }
  }

  // Save output
  fs.mkdirSync(outputDir, { recursive: true });

  const output = {
    version: 1,
    source: 'Minecraft Java Edition .mca',
    worldWidth: (maxCX - minCX + 1) * CHUNK_SIZE,
    worldDepth: (maxCZ - minCZ + 1) * CHUNK_SIZE,
    centerChunk: [centerCX, centerCZ],
    chunkRange: { minX: minCX, maxX: maxCX, minZ: minCZ, maxZ: maxCZ },
    chunkCount: Object.keys(chunksData).length,
    blockCount: mappedBlocks,
    entities: allEntities,
    suggestedWeather: suggestedWeather,
    blocks: chunksData,
  };

  const outPath = path.join(outputDir, 'world-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output));
  console.log(`\n✅ Conversion complete!`);
  console.log(`  Chunks converted: ${Object.keys(chunksData).length}`);
  console.log(`  Blocks placed:    ${mappedBlocks.toLocaleString()}`);
  console.log(`  World size:       ${output.worldWidth} × 64 × ${output.worldDepth}`);
  console.log(`  Output:           ${outPath}`);

  if (unmappedNames.size > 0) {
    console.log(`\n⚠ Unmapped block types (${unmappedNames.size}):`);
    const sorted = [...unmappedNames].sort();
    for (const name of sorted) {
      console.log(`  - ${name}`);
    }
    console.log('  (These were skipped. Add them to BLOCK_MAP to include.)');
  }

  // Write unmapped blocks report
  if (unmappedNames.size > 0) {
    const reportPath = path.join(outputDir, 'unmapped-blocks.txt');
    fs.writeFileSync(reportPath, [...unmappedNames].sort().join('\n'));
    console.log(`  Unmapped list:    ${reportPath}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
