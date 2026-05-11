// Player module — movement, physics, collision
import { World, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH, BLOCK, ITEM } from './world.js';

const GRAVITY = -25;
const JUMP_VELOCITY = 8;
const FLIGHT_SPEED = 8;
const PLAYER_SPEED = 4.3;
const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.6;
const COYOTE_TIME = 0.1; // seconds player can still jump after walking off edge

export class Player {
  constructor(world) {
    this.world = world;
    this.position = [this.world.width / 2, 24, this.world.depth / 2];
    this.velocity = [0, 0, 0];
    this.onGround = false;
    this.isFlying = false;

    // Collision box dimensions
    this.width = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;
    this.eyeHeight = EYE_HEIGHT;
    this.speed = PLAYER_SPEED;
    this.jumpVelocity = JUMP_VELOCITY;
    this.speedMultiplier = 1.0;

    // Health system
    this.health = 20;
    this.maxHealth = 20;
    this.fallStartY = null;
    this.healTimer = 0;
    this.coyoteTimer = 0;

    // Water/drowning system
    this.underwaterTimer = 0;
    this.drowningDamageTimer = 0;
    this.wasUnderwater = false;
  }

  getEyePosition() {
    return [
      this.position[0],
      this.position[1] + this.eyeHeight,
      this.position[2],
    ];
  }

  getAABB() {
    const hw = this.width / 2;
    return {
      minX: this.position[0] - hw,
      maxX: this.position[0] + hw,
      minY: this.position[1],
      maxY: this.position[1] + this.height,
      minZ: this.position[2] - hw,
      maxZ: this.position[2] + hw,
    };
  }

  takeDamage(amount, armorMultiplier = 1.0) {
    const finalDamage = Math.round(amount * armorMultiplier);
    this.health = Math.max(0, this.health - finalDamage);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  update(dt, input) {
    // Movement input
    const forward = input.getForwardFlat();
    const moveDir = [0, 0, 0];

    if (input.isKeyDown('KeyW')) {
      moveDir[0] += forward[0];
      moveDir[2] += forward[2];
    }
    if (input.isKeyDown('KeyS')) {
      moveDir[0] -= forward[0];
      moveDir[2] -= forward[2];
    }
    if (input.isKeyDown('KeyA')) {
      moveDir[0] += forward[2];
      moveDir[2] -= forward[0];
    }
    if (input.isKeyDown('KeyD')) {
      moveDir[0] -= forward[2];
      moveDir[2] += forward[0];
    }

    // Normalize horizontal movement
    const len = Math.sqrt(moveDir[0] * moveDir[0] + moveDir[2] * moveDir[2]);
    if (len > 0) {
      moveDir[0] /= len;
      moveDir[2] /= len;
    }

    const WATER_LEVEL = 28;

    // Water detection at feet
    const bx = Math.floor(this.position[0]);
    const by = Math.floor(this.position[1] + 0.1);
    const bz = Math.floor(this.position[2]);
    const inWater = this.world.getBlock(bx, by, bz) === BLOCK.WATER;

    // Water movement penalty
    if (inWater && !this.isFlying) {
      const isShallow = (by >= WATER_LEVEL - 1);
      let waterMultiplier = isShallow ? 0.8 : 0.6;
      const finalMultiplier = waterMultiplier * this.speedMultiplier;
      this.velocity[0] = moveDir[0] * this.speed * finalMultiplier;
      this.velocity[2] = moveDir[2] * this.speed * finalMultiplier;
    } else {
      this.velocity[0] = moveDir[0] * this.speed * this.speedMultiplier;
      this.velocity[2] = moveDir[2] * this.speed * this.speedMultiplier;
    }

    // Coyote time: brief grace period after walking off edge
    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Jump: disabled in deep water, normal in shallow/land
    const canJump = !this.isFlying && !(inWater && by < WATER_LEVEL - 1);
    if (input.consumeAction('jump') && (this.onGround || this.coyoteTimer > 0) && canJump) {
      this.velocity[1] = this.jumpVelocity;
      this.onGround = false;
    }

    // Drowning detection: check if head is in water
    const headY = Math.floor(this.position[1] + this.eyeHeight);
    const headInWater = this.world.getBlock(bx, headY, bz) === BLOCK.WATER;

    if (headInWater && !this.isFlying) {
      this.underwaterTimer += dt;
      if (this.underwaterTimer > 15) {
        this.drowningDamageTimer += dt;
        if (this.drowningDamageTimer >= 1.0) {
          this.drowningDamageTimer -= 1.0;
          this.takeDamage(1);
        }
      }
    } else {
      // Reset drowning timers when surfacing
      this.underwaterTimer = 0;
      this.drowningDamageTimer = 0;
    }

    // Fall damage tracking (before gravity)
    if (this.isFlying) {
      this.fallStartY = null;
    } else if (!this.onGround && !inWater && this.fallStartY === null) {
      this.fallStartY = this.position[1];
    } else if (this.onGround && this.fallStartY !== null) {
      const fallDistance = this.fallStartY - this.position[1];
      if (fallDistance > 6) {
        const damage = Math.floor(fallDistance - 6);
        this.takeDamage(damage);
      }
      this.fallStartY = null;
    }

    // Regeneration
    this.healTimer += dt;
    if (this.healTimer >= 1.0) {
      this.healTimer -= 1.0;
      this.heal(0.5);
    }

    if (this.isFlying) {
      // Flight mode: no gravity, Space/Shift for vertical
      this.velocity[1] = 0;
      if (input.isKeyDown('Space')) this.velocity[1] = FLIGHT_SPEED;
      else if (input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight')) this.velocity[1] = -FLIGHT_SPEED;
    } else {
      // Gravity
      this.velocity[1] += GRAVITY * dt;
    }

    // Split-axis collision detection and movement
    // X axis
    this.position[0] += this.velocity[0] * dt;
    this.resolveCollisionX();

    // Y axis (collision always active to prevent flying through ground)
    this.position[1] += this.velocity[1] * dt;
    this.resolveCollisionY();

    // Z axis
    this.position[2] += this.velocity[2] * dt;
    this.resolveCollisionZ();

    // Clamp position to world bounds
    const hw = this.width / 2;
    this.position[0] = Math.max(hw, Math.min(this.world.width - hw, this.position[0]));
    this.position[2] = Math.max(hw, Math.min(this.world.depth - hw, this.position[2]));

    // Safety: don't fall below y=0
    if (this.position[1] < 0) {
      this.position[1] = 0;
      this.velocity[1] = 0;
      this.onGround = true;
    }
  }

  getOverlappingBlocks() {
    const aabb = this.getAABB();
    const minBX = Math.floor(aabb.minX);
    const maxBX = Math.floor(aabb.maxX);
    const minBY = Math.floor(aabb.minY);
    const maxBY = Math.floor(aabb.maxY);
    const minBZ = Math.floor(aabb.minZ);
    const maxBZ = Math.floor(aabb.maxZ);

    const blocks = [];
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (this.world.getBlock(bx, by, bz) !== BLOCK.AIR &&
              this.world.getBlock(bx, by, bz) !== BLOCK.WATER) {
            blocks.push([bx, by, bz]);
          }
        }
      }
    }
    return blocks;
  }

  resolveCollisionX() {
    const aabb = this.getAABB();
    const blocks = this.getOverlappingBlocks();
    const hw = this.width / 2;

    for (const [bx, by, bz] of blocks) {
      // Block AABB
      const bMinX = bx, bMaxX = bx + 1;
      const bMinY = by, bMaxY = by + 1;
      const bMinZ = bz, bMaxZ = bz + 1;

      // Check overlap
      if (aabb.maxX > bMinX && aabb.minX < bMaxX &&
          aabb.maxY > bMinY && aabb.minY < bMaxY &&
          aabb.maxZ > bMinZ && aabb.minZ < bMaxZ) {
        // Resolve X
        if (this.velocity[0] > 0) {
          this.position[0] = bMinX - hw;
        } else if (this.velocity[0] < 0) {
          this.position[0] = bMaxX + hw;
        }
        this.velocity[0] = 0;
        // Update AABB
        aabb.minX = this.position[0] - hw;
        aabb.maxX = this.position[0] + hw;
      }
    }
  }

  resolveCollisionY() {
    const aabb = this.getAABB();
    const blocks = this.getOverlappingBlocks();

    this.onGround = false;

    for (const [bx, by, bz] of blocks) {
      const bMinX = bx, bMaxX = bx + 1;
      const bMinY = by, bMaxY = by + 1;
      const bMinZ = bz, bMaxZ = bz + 1;

      if (aabb.maxX > bMinX && aabb.minX < bMaxX &&
          aabb.maxY > bMinY && aabb.minY < bMaxY &&
          aabb.maxZ > bMinZ && aabb.minZ < bMaxZ) {
        // Resolve Y
        if (this.velocity[1] < 0) {
          this.position[1] = bMaxY;
          this.onGround = true;
        } else if (this.velocity[1] > 0) {
          this.position[1] = bMinY - this.height;
        }
        this.velocity[1] = 0;
        // Update AABB
        aabb.minY = this.position[1];
        aabb.maxY = this.position[1] + this.height;
      }
    }
  }

  resolveCollisionZ() {
    const aabb = this.getAABB();
    const blocks = this.getOverlappingBlocks();
    const hw = this.width / 2;

    for (const [bx, by, bz] of blocks) {
      const bMinX = bx, bMaxX = bx + 1;
      const bMinY = by, bMaxY = by + 1;
      const bMinZ = bz, bMaxZ = bz + 1;

      if (aabb.maxX > bMinX && aabb.minX < bMaxX &&
          aabb.maxY > bMinY && aabb.minY < bMaxY &&
          aabb.maxZ > bMinZ && aabb.minZ < bMaxZ) {
        // Resolve Z
        if (this.velocity[2] > 0) {
          this.position[2] = bMinZ - hw;
        } else if (this.velocity[2] < 0) {
          this.position[2] = bMaxZ + hw;
        }
        this.velocity[2] = 0;
        aabb.minZ = this.position[2] - hw;
        aabb.maxZ = this.position[2] + hw;
      }
    }
  }

  // Check if a block position overlaps with the player
  blockOverlapsPlayer(bx, by, bz) {
    const aabb = this.getAABB();
    return aabb.maxX > bx && aabb.minX < bx + 1 &&
           aabb.maxY > by && aabb.minY < by + 1 &&
           aabb.maxZ > bz && aabb.minZ < bz + 1;
  }

  toggleFlight() {
    this.isFlying = !this.isFlying;
    if (this.isFlying) {
      this.velocity[1] = 0;
    }
  }

  // Reset to spawn position
  resetPosition() {
    this.position = [this.world.width / 2, 24, this.world.depth / 2];
    this.velocity = [0, 0, 0];
  }
}
