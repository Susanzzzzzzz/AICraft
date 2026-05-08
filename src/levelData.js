// levelData — Level configuration definitions with tasks and rewards
import { ITEM } from './world.js';
import { MCLevel } from './MCLevel.js';

export const LEVELS = [
  new MCLevel({
    id: 'level_000',
    name: '烦人的村民',
    description: '欢迎来到村民村！这里的村民特别"热情"……',
    tasks: [
      { id: 't1', type: 'greet', target: 0, count: 8, current: 0, description: '跟 8 个村民打招呼（靠近即可）' },
      { id: 't2', type: 'push', target: 0, count: 5, current: 0, description: '推开 5 个挡路的村民' },
      { id: 't3', type: 'collect', target: ITEM.PLANK, count: 16, current: 0, description: '收集 16 个木板（村民送的）' },
      { id: 't4', type: 'explore', target: 0, count: 1, current: 0, description: '探索整个村庄', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_mine_001'],
    terrains: [{ id: 'default', name: '村民村', seedOffset: 999, biomeType: 'plains', waterLevel: 28,
      prefabs: [
        { file: 'cabin', minCount: 4, maxCount: 6 },
        { file: 'watchtower', minCount: 1, maxCount: 2 },
        { file: 'well', minCount: 1, maxCount: 2 },
        { file: 'fountain', minCount: 1, maxCount: 1 },
        { file: 'sakura_pavilion', minCount: 1, maxCount: 1 },
        { file: 'lamp_post', minCount: 4, maxCount: 8 },
        { file: 'tent', minCount: 2, maxCount: 4 },
        { file: 'bush', minCount: 2, maxCount: 4 },
        { file: 'rocks', minCount: 0, maxCount: 2 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_001',
    name: '草原起点',
    description: '在草原上收集基础资源，熟悉操作',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.GRASS, count: 10, current: 0, description: '收集 10 个草方块' },
      { id: 't2', type: 'collect', target: ITEM.WOOD, count: 8, current: 0, description: '收集 8 个木头' },
      { id: 't3', type: 'collect', target: ITEM.STONE, count: 16, current: 0, description: '收集 16 个石头' },
      { id: 't4', type: 'collect', target: ITEM.PLANK, count: 8, current: 0, description: '合成 8 个木板', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_mine_002'],
    terrains: [{ id: 'default', name: '草原', seedOffset: 0, biomeType: 'plains',
      prefabs: [
        { file: 'cabin', minCount: 1, maxCount: 2 },
        { file: 'watchtower', minCount: 1, maxCount: 2 },
        { file: 'well', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'tent', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'lamp_post', minCount: 1, maxCount: 3 },
        { file: 'bush', minCount: 2, maxCount: 4 },
        { file: 'rocks', minCount: 1, maxCount: 3 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_002',
    name: '矿洞探险',
    description: '深入地下洞穴，寻找珍贵矿石',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.COAL, count: 16, current: 0, description: '收集 16 个煤炭' },
      { id: 't2', type: 'collect', target: ITEM.IRON_INGOT, count: 8, current: 0, description: '收集 8 个铁锭' },
      { id: 't3', type: 'collect', target: ITEM.DIAMOND, count: 4, current: 0, description: '收集 4 个钻石' },
      { id: 't4', type: 'collect', target: ITEM.STONE, count: 32, current: 0, description: '收集 32 个石头', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_fight_001'],
    terrains: [{ id: 'cave', name: '地下洞穴', seedOffset: 0, biomeType: 'cave', waterLevel: 20,
      prefabs: [
        { file: 'mine_entrance', minCount: 1, maxCount: 3 },
        { file: 'mushroom', minCount: 2, maxCount: 5 },
        { file: 'bush', minCount: 1, maxCount: 3 },
        { file: 'well', minCount: 0, maxCount: 1, probability: 0.5 },
        { file: 'tent', minCount: 0, maxCount: 1, probability: 0.4 },
        { file: 'lamp_post', minCount: 0, maxCount: 2 },
        { file: 'rocks', minCount: 2, maxCount: 5 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_003',
    name: '沙漠之旅',
    description: '在炎热的沙漠中生存，收集沙漠资源',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.SAND_ITEM, count: 32, current: 0, description: '收集 32 个沙子' },
      { id: 't2', type: 'collect', target: ITEM.CACTUS_ITEM, count: 8, current: 0, description: '收集 8 个仙人掌' },
      { id: 't3', type: 'collect', target: ITEM.GRAVEL_ITEM, count: 16, current: 0, description: '收集 16 个砂砾' },
      { id: 't4', type: 'collect', target: ITEM.DIAMOND, count: 4, current: 0, description: '收集 4 个钻石', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_build_001'],
    terrains: [{ id: 'desert', name: '沙漠', seedOffset: 0, biomeType: 'desert', waterLevel: 24,
      prefabs: [
        { file: 'pyramid', minCount: 1, maxCount: 2 },
        { file: 'cactus_cluster', minCount: 2, maxCount: 5 },
        { file: 'well', minCount: 0, maxCount: 2, probability: 0.5 },
        { file: 'tent', minCount: 0, maxCount: 1, probability: 0.4 },
        { file: 'lamp_post', minCount: 0, maxCount: 2 },
        { file: 'bush', minCount: 0, maxCount: 2 },
        { file: 'rocks', minCount: 1, maxCount: 3 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_004',
    name: '冰原探索',
    description: '在冰雪覆盖的冻原上探索，收集寒带资源',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.SNOW_ITEM, count: 32, current: 0, description: '收集 32 个雪块' },
      { id: 't2', type: 'collect', target: ITEM.WOOD, count: 16, current: 0, description: '收集 16 个木头（云杉）' },
      { id: 't3', type: 'collect', target: ITEM.STONE, count: 32, current: 0, description: '收集 32 个石头' },
      { id: 't4', type: 'collect', target: ITEM.IRON_INGOT, count: 8, current: 0, description: '收集 8 个铁锭', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_explore_001'],
    terrains: [{ id: 'tundra', name: '冰原', seedOffset: 0, biomeType: 'tundra', waterLevel: 28,
      prefabs: [
        { file: 'igloo', minCount: 0, maxCount: 2, probability: 0.5 },
        { file: 'tent', minCount: 0, maxCount: 2, probability: 0.5 },
        { file: 'lamp_post', minCount: 0, maxCount: 2 },
        { file: 'well', minCount: 0, maxCount: 1, probability: 0.4 },
        { file: 'bush', minCount: 1, maxCount: 3 },
        { file: 'rocks', minCount: 2, maxCount: 5 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_005',
    name: '建造天地',
    description: '发挥创意，大量收集建筑材料',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.BRICK, count: 32, current: 0, description: '收集 32 个砖块' },
      { id: 't2', type: 'collect', target: ITEM.PLANK, count: 32, current: 0, description: '合成 32 个木板' },
      { id: 't3', type: 'collect', target: ITEM.STICK, count: 16, current: 0, description: '合成 16 个木棍' },
      { id: 't4', type: 'collect', target: ITEM.DIAMOND, count: 8, current: 0, description: '收集 8 个钻石', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_fight_002'],
    terrains: [{ id: 'default', name: '平原', seedOffset: 0, biomeType: 'plains',
      prefabs: [
        { file: 'cabin', minCount: 1, maxCount: 3 },
        { file: 'watchtower', minCount: 0, maxCount: 2 },
        { file: 'well', minCount: 1, maxCount: 2 },
        { file: 'fountain', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'lamp_post', minCount: 2, maxCount: 5 },
        { file: 'bush', minCount: 3, maxCount: 5 },
        { file: 'rocks', minCount: 1, maxCount: 3 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_006',
    name: '迷雾沼泽',
    description: '探索危险的沼泽地带，收集稀有资源',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.MUD, count: 32, current: 0, description: '收集 32 个沼泽泥' },
      { id: 't2', type: 'collect', target: ITEM.CLAY, count: 16, current: 0, description: '收集 16 个黏土' },
      { id: 't3', type: 'collect', target: ITEM.STONE, count: 16, current: 0, description: '收集 16 个石头' },
      { id: 't4', type: 'collect', target: ITEM.DIAMOND, count: 8, current: 0, description: '收集 8 个钻石', optional: true },
    ],
    rewards: [],
    unlockSkills: ['mc_explore_002'],
    terrains: [
      { id: 'default', name: '迷雾沼泽',     seedOffset: 0,   biomeType: 'swamp', waterLevel: 30,
        prefabs: [
          { file: 'swamp_hut', minCount: 0, maxCount: 2, probability: 0.6 },
          { file: 'dead_tree', minCount: 3, maxCount: 6 },
          { file: 'mushroom', minCount: 2, maxCount: 5 },
          { file: 'bush', minCount: 1, maxCount: 3 },
          { file: 'tent', minCount: 0, maxCount: 1, probability: 0.4 },
          { file: 'lamp_post', minCount: 0, maxCount: 2 },
          { file: 'rocks', minCount: 0, maxCount: 2 },
        ]
      },
      { id: 'reed',    name: '芦苇沼泽',     seedOffset: 100, biomeType: 'swamp', waterLevel: 28 },
      { id: 'misty',   name: '迷雾深沼',     seedOffset: 200, biomeType: 'swamp', waterLevel: 32 },
      { id: 'hut',     name: '沼泽小屋周边', seedOffset: 300, biomeType: 'swamp', waterLevel: 26 },
    ],
  }),


  new MCLevel({
    id: 'level_007',
    name: '丛林探险',
    description: '在茂密的丛林中穿行，收集雨林资源',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.WOOD, count: 32, current: 0, description: '收集 32 个木头' },
      { id: 't2', type: 'collect', target: ITEM.LEAVES, count: 16, current: 0, description: '收集 16 个树叶' },
      { id: 't3', type: 'collect', target: ITEM.STONE, count: 16, current: 0, description: '收集 16 个石头' },
      { id: 't4', type: 'collect', target: ITEM.DIAMOND, count: 4, current: 0, description: '收集 4 个钻石', optional: true },
    ],
    rewards: [],
    unlockSkills: [],
    terrains: [{ id: 'jungle', name: '丛林', seedOffset: 0, biomeType: 'jungle', waterLevel: 28,
      prefabs: [
        { file: 'cabin', minCount: 0, maxCount: 2, probability: 0.5 },
        { file: 'tent', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'well', minCount: 0, maxCount: 1, probability: 0.4 },
        { file: 'lamp_post', minCount: 0, maxCount: 2 },
        { file: 'bush', minCount: 3, maxCount: 5 },
        { file: 'mushroom', minCount: 1, maxCount: 3 },
        { file: 'rocks', minCount: 1, maxCount: 2 },
      ]
    }],
  }),

  new MCLevel({
    id: 'level_008',
    name: '樱花谷',
    description: '在美丽的樱花林中漫步，收集粉色回忆',
    tasks: [
      { id: 't1', type: 'collect', target: ITEM.FLOWER, count: 16, current: 0, description: '收集 16 个花朵' },
      { id: 't2', type: 'collect', target: ITEM.WOOD, count: 16, current: 0, description: '收集 16 个木头' },
      { id: 't3', type: 'collect', target: ITEM.PLANK, count: 32, current: 0, description: '合成 32 个木板' },
      { id: 't4', type: 'collect', target: ITEM.DIAMOND, count: 8, current: 0, description: '收集 8 个钻石', optional: true },
    ],
    rewards: [],
    unlockSkills: [],
    terrains: [{ id: 'cherry', name: '樱花谷', seedOffset: 0, biomeType: 'cherry', waterLevel: 28,
      prefabs: [
        { file: 'sakura_pavilion', minCount: 1, maxCount: 2 },
        { file: 'fountain', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'well', minCount: 0, maxCount: 2, probability: 0.6 },
        { file: 'tent', minCount: 0, maxCount: 1, probability: 0.5 },
        { file: 'lamp_post', minCount: 1, maxCount: 3 },
        { file: 'bush', minCount: 2, maxCount: 4 },
        { file: 'rocks', minCount: 1, maxCount: 2 },
      ]
    }],
  }),

];