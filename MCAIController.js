// MCAIController — AI decision-making that auto-uses skills based on context
import { getSkill } from './skillLibrary.js';
import { raycast } from './raycast.js';

export class MCAIController {
  constructor(config = {}) {
    this.enabled = config.enabled !== undefined ? config.enabled : true;
    this.skillSlots = config.skillSlots || [];   // Array of skill IDs assigned to slots
    this.autoMode = config.autoMode || 'semi';   // 'manual' | 'semi' | 'auto'
    this.thinkInterval = config.thinkInterval || 1.0; // seconds between AI decisions
    this._thinkTimer = 0;

    // Retreat behavior
    this.retreatTarget = null;     // { x, z } high ground position
    this.retreating = false;
    this.combatDisabledUntilHeal = false;
  }

  // Assign a skill to a slot (0-5)
  assignSkill(slotIndex, skillId) {
    this.skillSlots[slotIndex] = skillId;
  }

  // Get the skill instance at a given slot
  getSlotSkill(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.skillSlots.length) return null;
    return getSkill(this.skillSlots[slotIndex]);
  }

  // Auto-think: decide which skill to use based on context
  // Returns the skill ID to use, or null if no skill should be used
  autoThink(player, world, mobs, time, input, cameraCtrl, steveModel, inventory, renderer) {
    if (!this.enabled || this.autoMode === 'manual') return null;
    if (this.skillSlots.length === 0) return null;

    const [px, py, pz] = player.position;
    const isSwamp = world._currentLevelId === 'level_006';
    const isRaining = world._isRaining;

    // Swamp-specific priority system
    if (isSwamp) {
      // Count nearby slimes
      const slimes = (mobs || []).filter(m => m.isSlime && !m.dead);
      const nearbySlimes = slimes.filter(m => {
        const mx = m.position ? m.position[0] : m.group?.position?.x;
        const mz = m.position ? m.position[2] : m.group?.position?.z;
        if (mx === undefined) return false;
        const dist = Math.sqrt((mx - px) ** 2 + (mz - pz) ** 2);
        return dist <= 8;
      });
      const slimeCount = nearbySlimes.length;

      // P0: Evasion — HP < 30% + slimes nearby
      if (player.health / player.maxHealth < 0.3 && slimeCount > 0) {
        // Check for explore-type skill to retreat
        for (const slotIdx of this._getSkillIndicesByType('explore')) {
          const skill = getSkill(this.skillSlots[slotIdx]);
          if (skill && skill.canUse(time)) {
            return skill.id;
          }
        }
        // If no explore skill, try fight AoE to clear area
        for (const slotIdx of this._getSkillIndicesByType('fight')) {
          const skill = getSkill(this.skillSlots[slotIdx]);
          if (skill && skill.canUse(time) && skill.radius > 0) {
            return skill.id;
          }
        }
      }

      // P1: Combat — slimes nearby
      if (slimeCount > 0) {
        if (slimeCount >= 3) {
          // 3+ slimes: use AoE (mc_fight_001)
          for (const slotIdx of this._getSkillIndicesByType('fight')) {
            const skill = getSkill(this.skillSlots[slotIdx]);
            if (skill && skill.canUse(time) && skill.radius > 0) {
              return skill.id;
            }
          }
        }
        // 1-2 slimes or no AoE skill: use single-target (mc_fight_002)
        for (const slotIdx of this._getSkillIndicesByType('fight')) {
          const skill = getSkill(this.skillSlots[slotIdx]);
          if (skill && skill.canUse(time)) {
            // During rain, prefer AoE over single-target if both available
            if (isRaining && skill.radius > 0) return skill.id;
            if (!isRaining) return skill.id;
          }
        }
      }

      // P2: Resource — scan for MUD/CLAY
      for (const slotIdx of this._getSkillIndicesByType('explore')) {
        const skill = getSkill(this.skillSlots[slotIdx]);
        if (skill && skill.canUse(time)) {
          return skill.id;
        }
      }
    }

    // Original priority logic for non-swamp levels
    // Priority 1: Fight — if mobs are nearby and player has fight skills
    if (mobs && mobs.length > 0) {
      for (const slotIdx of this._getSkillIndicesByType('fight')) {
        const skill = getSkill(this.skillSlots[slotIdx]);
        if (!skill || !skill.canUse(time)) continue;

        for (const mob of mobs) {
          if (mob.dead) continue;
          const mx = mob.position ? mob.position[0] : mob.group?.position?.x;
          const my = mob.position ? mob.position[1] : mob.group?.position?.y;
          const mz = mob.position ? mob.position[2] : mob.group?.position?.z;
          if (mx === undefined) continue;
          const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2 + (mz - pz) ** 2);
          if (dist <= skill.range) {
            return skill.id;
          }
        }
      }
    }

    // Priority 2: Mine — if looking at a breakable block
    if (this.autoMode === 'auto') {
      const rayOrigin = cameraCtrl.getRaycastOrigin(player);
      const rayDir = cameraCtrl.getRaycastDirection(input);
      const hitResult = raycast(rayOrigin, rayDir, (x, y, z) => world.getBlock(x, y, z), 8);
      if (hitResult.hit) {
        for (const slotIdx of this._getSkillIndicesByType('mine')) {
          const skill = getSkill(this.skillSlots[slotIdx]);
          if (skill && skill.canUse(time)) {
            return skill.id;
          }
        }
      }
    }

    return null;
  }

  // Get the suggested skill for semi-auto mode (returns skill ID or null)
  getSuggestion(player, world, mobs, time) {
    if (this.autoMode !== 'semi') return null;
    if (this.skillSlots.length === 0) return null;

    const [px, py, pz] = player.position;

    // Count nearby mobs
    const nearby = this._countNearbyMobs(mobs, px, pz, 8);

    if (nearby.hostile > 0) {
      // Emergency: HP < 30%
      if (player.health / player.maxHealth < 0.3) {
        return '建议: 血量大减，立即撤退！';
      }
      // AoE for groups of 3+
      if (nearby.hostile >= 3) {
        const aoeSkill = this._getFirstReadyFightSkill(time, true);
        if (aoeSkill) return `建议: 使用 ${aoeSkill.name}`;
      }
      // Single target
      const singleSkill = this._getFirstReadyFightSkill(time, false);
      if (singleSkill) return `建议: 使用 ${singleSkill.name}`;
    }

    // No threats: suggest mining
    for (const slotIdx of this._getSkillIndicesByType('mine')) {
      const skill = getSkill(this.skillSlots[slotIdx]);
      if (skill && skill.canUse(time)) {
        return `建议: 使用 ${skill.name}`;
      }
    }

    return null;
  }

  // Count nearby mobs by type
  _countNearbyMobs(mobs, px, pz, range) {
    let hostile = 0;
    if (!mobs) return { hostile };
    for (const mob of mobs) {
      if (mob.dead) continue;
      const mx = mob.position ? mob.position[0] : mob.group?.position?.x;
      const mz = mob.position ? mob.position[2] : mob.group?.position?.z;
      if (mx === undefined) continue;
      const dist = Math.sqrt((mx - px) ** 2 + (mz - pz) ** 2);
      if (dist <= range) {
        if (mob.isSlime) hostile++;
      }
    }
    return { hostile };
  }

  // Get first ready fight skill
  _getFirstReadyFightSkill(time, preferAoe) {
    for (const slotIdx of this._getSkillIndicesByType('fight')) {
      const skill = getSkill(this.skillSlots[slotIdx]);
      if (skill && skill.canUse(time)) {
        if (preferAoe && skill.radius > 0) return skill;
        if (!preferAoe) return skill;
      }
    }
    return null;
  }

  // Find and set retreat target (high ground)
  findRetreatTarget(world, px, pz) {
    // Search for a column with height >= 25 within 20 blocks
    let bestTarget = null;
    let bestHeight = 0;

    for (let dx = -20; dx <= 20; dx += 2) {
      for (let dz = -20; dz <= 20; dz += 2) {
        const bx = Math.floor(px + dx);
        const bz = Math.floor(pz + dz);
        if (!world.inBounds(bx, 0, bz)) continue;

        let height = 0;
        for (let y = world.WORLD_HEIGHT - 1; y >= 0; y--) {
          const block = world.getBlock(bx, y, bz);
          if (block !== 0 && block !== 6) { // not air or water
            height = y + 1;
            break;
          }
        }
        if (height >= 25 && height > bestHeight) {
          // Check that the area is free of water below
          let hasWater = false;
          for (let y = 0; y < height; y++) {
            if (world.getBlock(bx, y, bz) === 6) { hasWater = true; break; }
          }
          if (!hasWater) {
            bestHeight = height;
            bestTarget = { x: px + dx, z: pz + dz };
          }
        }
      }
    }

    this.retreatTarget = bestTarget;
    this.retreating = bestTarget !== null;
    this.combatDisabledUntilHeal = true;
    return bestTarget;
  }

  // Check if player has reached retreat target
  hasReachedRetreatTarget(player, threshold = 2) {
    if (!this.retreatTarget) return true;
    const dx = player.position[0] - this.retreatTarget.x;
    const dz = player.position[2] - this.retreatTarget.z;
    return (dx * dx + dz * dz) < threshold * threshold;
  }

  // Update retreat and combat state
  updateRetreat(player) {
    if (!this.retreating) return false;

    // Check if player has recovered enough to resume combat
    if (player.health / player.maxHealth >= 0.5) {
      this.retreating = false;
      this.retreatTarget = null;
      this.combatDisabledUntilHeal = false;
      return false;
    }

    // Check if reached target
    if (this.hasReachedRetreatTarget(player)) {
      this.retreatTarget = null;
      return false; // Stay at position and heal
    }

    return true; // Still retreating
  }

  // Get indices of skill slots that match a given type
  _getSkillIndicesByType(type) {
    const indices = [];
    for (let i = 0; i < this.skillSlots.length; i++) {
      const skill = getSkill(this.skillSlots[i]);
      if (skill && skill.type === type) {
        indices.push(i);
      }
    }
    return indices;
  }

  // Check if a skill is assigned
  hasSkill(skillId) {
    return this.skillSlots.includes(skillId);
  }

  // Get all assigned skill instances
  getAssignedSkills() {
    return this.skillSlots.map(id => getSkill(id)).filter(Boolean);
  }

  // Update timer
  update(dt) {
    // Both auto and semi modes need thinking timer
    this._thinkTimer += dt;
  }

  // Check if AI should think now
  shouldThink() {
    if (this.autoMode === 'manual') return false;
    if (this._thinkTimer >= this.thinkInterval) {
      this._thinkTimer = 0;
      return true;
    }
    return false;
  }
}
