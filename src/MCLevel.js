// MCLevel — Level system with terrain tasks, mob objectives, and reward unlocking
import { ITEM } from './world.js';

export class MCLevel {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.tasks = config.tasks || [];           // [{ id, type, target, count, current, description }]
    this.rewards = config.rewards || [];       // [{ type, id }] e.g. { type: 'skill', id: 'mc_mine_002' }
    this.unlockSkills = config.unlockSkills || [];
    this.terrains = config.terrains || [{ id: 'default', name: '默认', seedOffset: 0, biomeType: 'plains' }];
    this.completionItemRewards = config.completionItemRewards || [];
    this.completed = false;
    this.rewardsClaimed = false;
    this.prebuiltWorld = config.prebuiltWorld || null;
    this.prebuiltBlocks = config.prebuiltBlocks || null;
  }

  // Check progress of all tasks based on player inventory
  checkTasks(inventory, mobs) {
    let allDone = true;
    for (const task of this.tasks) {
      switch (task.type) {
        case 'collect':
          task.current = inventory.countItem(task.target);
          break;
        case 'kill':
          task.current = task.current || 0;
          break;
        case 'explore':
          task.current = task.current || 0;
          break;
        case 'build':
          task.current = inventory.countItem(task.target);
          break;
        default:
          task.current = task.current || 0;
      }
      if (!task.optional && task.current < task.count) allDone = false;
    }
    this.completed = allDone;
    return allDone;
  }

  // Get tasks display info
  getTaskProgress() {
    return this.tasks.map(t => ({
      id: t.id,
      description: t.description,
      current: t.current || 0,
      count: t.count,
      done: (t.current || 0) >= t.count,
      optional: t.optional || false,
    }));
  }

  // Count how many tasks are completed
  getCompletedTaskCount() {
    return this.tasks.filter(t => (t.current || 0) >= t.count).length;
  }

  // Get total task count
  getTotalTaskCount() {
    return this.tasks.length;
  }
}
