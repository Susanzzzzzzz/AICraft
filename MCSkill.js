// MCSkill — Skill system with cooldown, types (mine/build/fight/explore), and AI auto-use
import * as THREE from 'three';
import { raycast } from './raycast.js';
import { BLOCK, MAX_BLOCK_TYPE } from './world.js';
import { getWeapon } from './weapons.js';

export class MCSkill {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.type = config.type;       // 'mine' | 'build' | 'fight' | 'explore'
    this.cooldown = config.cooldown || 1;  // seconds
    this.range = config.range || 8;
    this.radius = config.radius || 0;      // AoE radius
    this.damage = config.damage || 0;
    this.blockTypes = config.blockTypes || null; // Array of block type IDs for explore filter
    this.lastUsed = 0;
  }

  canUse(time) {
    return (time - this.lastUsed) >= this.cooldown;
  }

  use(player, world, mobs, time, input, cameraCtrl, steveModel, inventory, renderer) {
    if (!this.canUse(time)) return false;
    this.lastUsed = time;

    const rayOrigin = cameraCtrl.getRaycastOrigin(player);
    const rayDir = cameraCtrl.getRaycastDirection(input);
    const hitResult = raycast(rayOrigin, rayDir, (x, y, z) => world.getBlock(x, y, z), this.range);

    switch (this.type) {
      case 'mine':
        return this._mine(player, world, hitResult, steveModel, inventory);
      case 'build':
        return this._build(player, world, hitResult, input, inventory);
      case 'fight':
        return this._fight(player, mobs, inventory);
      case 'explore':
        return this._explore(player, world, renderer);
      default:
        return false;
    }
  }

  _mine(player, world, hitResult, steveModel, inventory) {
    if (!hitResult.hit) return false;
    const [bx, by, bz] = hitResult.position;
    const blockType = world.getBlock(bx, by, bz);
    if (blockType === BLOCK.AIR || blockType === BLOCK.WATER || by <= 0) return false;

    const positions = this.radius > 0 ? this._getAreaPositions(bx, by, bz) : [[bx, by, bz]];

    steveModel.triggerAnimation('mining', () => {
      for (const [px, py, pz] of positions) {
        if (world.inBounds(px, py, pz) && py > 0) {
          const bt = world.getBlock(px, py, pz);
          if (bt !== BLOCK.AIR && bt !== BLOCK.WATER) {
            world.setBlock(px, py, pz, BLOCK.AIR);
            inventory.addItem(bt, 1);
          }
        }
      }
    });
    return true;
  }

  _build(player, world, hitResult, input, inventory) {
    if (!hitResult.hit) return false;
    const [bx, by, bz] = hitResult.position;
    const [nx, ny, nz] = hitResult.normal;
    const blockType = input.selectedBlock;
    if (blockType < 1 || blockType > MAX_BLOCK_TYPE) return false;
    if (!inventory.hasItem(blockType, 1)) return false;

    const positions = this.radius > 0
      ? this._getAreaPositions(bx + nx, by + ny, bz + nz)
      : [[bx + nx, by + ny, bz + nz]];

    for (const [px, py, pz] of positions) {
      if (world.inBounds(px, py, pz) &&
          world.getBlock(px, py, pz) === BLOCK.AIR &&
          !player.blockOverlapsPlayer(px, py, pz) &&
          inventory.hasItem(blockType, 1)) {
        world.setBlock(px, py, pz, blockType);
        inventory.removeItem(blockType, 1);
      }
    }
    return true;
  }

  _fight(player, mobs, inventory) {
    if (!mobs || mobs.length === 0) return false;
    const [px, py, pz] = player.position;
    let hitAny = false;

    // Get current weapon effects
    const selectedItem = inventory ? inventory.getSelectedItem() : null;
    const weapon = selectedItem ? getWeapon(selectedItem.type) : null;
    const effects = weapon && weapon.effects ? weapon.effects : {};

    for (const mob of mobs) {
      if (!mob || mob.dead) continue;
      const dx = mob.position ? mob.position[0] - px : mob.group.position.x - px;
      const dy = mob.position ? mob.position[1] - py : mob.group.position.y - py;
      const dz = mob.position ? mob.position[2] - pz : mob.group.position.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= this.range) {
        let damage = this.damage || 5;

        // Apply weapon effects
        if (Object.keys(effects).length > 0) {
          // Slime bonus: +10% damage against slimes
          if (effects.slimeBonus && mob.isSlime) {
            damage = Math.round(damage * effects.slimeBonus);
          }
          // Armor penetration: ignores 10% defense
          if (effects.armorPenetration) {
            damage = Math.round(damage * (1 + effects.armorPenetration));
          }
          // Fire damage: additional damage over time (handled via mob property)
          if (effects.fireDamage) {
            mob.fireDamageTimer = 3; // 3 seconds of fire damage
            mob.fireDamagePerTick = effects.fireDamage;
          }
          // Slow effect
          if (effects.slow) {
            mob.slowTimer = 2; // 2 seconds slow
            mob.slowFactor = effects.slow;
          }
        }

        if (typeof mob.takeDamage === 'function') {
          mob.takeDamage(damage);
        } else if (mob.health !== undefined) {
          mob.health -= damage;
          if (mob.health <= 0) mob.dead = true;
        }
        hitAny = true;
      }
    }
    return hitAny;
  }

  _explore(player, world, renderer) {
    const [px, py, pz] = player.position;
    const cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz);
    const r = this.radius > 0 ? this.radius : 5;

    // Use blockTypes filter if provided, otherwise use default types
    const targetTypes = this.blockTypes || [BLOCK.STONE, BLOCK.WOOD, BLOCK.DIAMOND];

    const foundPositions = [];
    for (let dx = -r; dx <= r && foundPositions.length < 20; dx++) {
      for (let dy = -r; dy <= r && foundPositions.length < 20; dy++) {
        for (let dz = -r; dz <= r && foundPositions.length < 20; dz++) {
          const bx = cx + dx, by = cy + dy, bz = cz + dz;
          if (world.inBounds(bx, by, bz)) {
            const block = world.getBlock(bx, by, bz);
            if (targetTypes.includes(block) && world.isExposed(bx, by, bz)) {
              foundPositions.push([bx, by, bz]);
            }
          }
        }
      }
    }

    if (foundPositions.length > 0 && renderer && typeof renderer.highlightTemporaryBlocks === 'function') {
      renderer.highlightTemporaryBlocks(foundPositions, 3, 0x00FF00);
      return true;
    }

    return foundPositions.length > 0;
  }

  _getAreaPositions(cx, cy, cz) {
    const r = this.radius;
    const positions = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          positions.push([cx + dx, cy + dy, cz + dz]);
        }
      }
    }
    return positions;
  }
}
