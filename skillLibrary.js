// skillLibrary — predefined skill instances for the MCSkill system
import { MCSkill } from './MCSkill.js';

export const SKILLS = [
  new MCSkill({
    id: 'mc_mine_001',
    name: '精准挖矿',
    description: '精准挖掘目标方块，适合采集稀有矿石',
    type: 'mine',
    cooldown: 0.3,
    range: 8,
    radius: 0,
    damage: 0,
  }),

  new MCSkill({
    id: 'mc_mine_002',
    name: '范围挖掘',
    description: '以目标为中心挖掘 3×3 区域，快速清场',
    type: 'mine',
    cooldown: 2.0,
    range: 6,
    radius: 1,
    damage: 0,
  }),

  new MCSkill({
    id: 'mc_fight_001',
    name: '范围猛击',
    description: '对周围 5 格内的敌人造成 8 点伤害',
    type: 'fight',
    cooldown: 3.0,
    range: 5,
    radius: 5,
    damage: 8,
  }),

  new MCSkill({
    id: 'mc_fight_002',
    name: '致命一击',
    description: '对前方敌人造成 15 点高额伤害',
    type: 'fight',
    cooldown: 5.0,
    range: 4,
    radius: 0,
    damage: 15,
  }),

  new MCSkill({
    id: 'mc_build_001',
    name: '快速建造',
    description: '在目标位置放置 3×3 区域方块',
    type: 'build',
    cooldown: 3.0,
    range: 8,
    radius: 1,
    damage: 0,
  }),

  new MCSkill({
    id: 'mc_explore_001',
    name: '探索视野',
    description: '扫描周围 10 格范围内的矿物和资源',
    type: 'explore',
    cooldown: 10.0,
    range: 10,
    radius: 10,
    damage: 0,
  }),

  new MCSkill({
    id: 'mc_explore_002',
    name: '沼泽感知',
    description: '扫描周围 8 格范围内的沼泽资源（沼泽泥、黏土、芦苇）并高亮显示',
    type: 'explore',
    cooldown: 8.0,
    range: 8,
    radius: 8,
    damage: 0,
    blockTypes: [9, 10, 12], // MUD, CLAY, REED (numeric IDs to avoid circular dependency)
  }),
];

const _skillMap = new Map(SKILLS.map(s => [s.id, s]));

export function getSkill(id) {
  return _skillMap.get(id) || null;
}

export function getSkillsByType(type) {
  return SKILLS.filter(s => s.type === type);
}
