// Animals module — Passive animals: Pig, Cow, Sheep, Chicken + Hostile: Slime
import * as THREE from 'three';
import { World, BLOCK, ITEM, WORLD_WIDTH, WORLD_DEPTH, isSolid } from './world.js';

// Shared idle/wander AI state
const AI_IDLE = 0;
const AI_WANDER = 1;

class PassiveAnimal {
  constructor(world, position, config) {
    this.world = world;
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.yaw = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.animTime = 0;

    // Health system
    this.maxHealth = config.maxHealth || 10;
    this.health = this.maxHealth;
    this.dead = false;

    // Slow effect state
    this.slowTimer = 0;
    this.slowFactor = 0;

    // Fire damage state
    this.fireDamageTimer = 0;
    this.fireDamagePerTick = 0;

    // Config from subclass
    this.width = config.width;
    this.height = config.height;
    this.speed = config.speed;
    this.bodyColor = config.bodyColor;
    this.accentColor = config.accentColor;

    // AI state
    this.aiState = AI_IDLE;
    this.aiTimer = 2 + Math.random() * 4;
    this.aiTargetYaw = this.yaw;

    // Model
    this.group = new THREE.Group();
    this.pivots = {};
    this._buildModel();

    // Set layers for raycast exclusion
    this.group.traverse((child) => {
      child.layers.set(1);
    });

    this._updateGroupPosition();
  }

  _buildModel() {
    // Override in subclasses
    const bodyGeo = new THREE.BoxGeometry(this.width, this.height * 0.6, this.width * 0.7);
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.bodyColor });
    this.pivots.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.pivots.body.position.set(0, this.height * 0.4, 0);
    this.group.add(this.pivots.body);

    // Head
    const headSize = this.width * 0.5;
    const headGeo = new THREE.BoxGeometry(headSize, headSize * 0.8, headSize * 0.6);
    const headMat = new THREE.MeshLambertMaterial({ color: this.accentColor || this.bodyColor });
    this.pivots.head = new THREE.Mesh(headGeo, headMat);
    this.pivots.head.position.set(this.width * 0.5, this.height * 0.6, 0);
    this.group.add(this.pivots.head);

    // Legs (simple pegs)
    const legGeo = new THREE.BoxGeometry(this.width * 0.12, this.height * 0.35, this.width * 0.12);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const legPositions = [
      [this.width * 0.3, 0, this.width * 0.25],
      [this.width * 0.3, 0, -this.width * 0.25],
      [-this.width * 0.3, 0, this.width * 0.25],
      [-this.width * 0.3, 0, -this.width * 0.25],
    ];
    this.pivots.legs = [];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      this.group.add(leg);
      this.pivots.legs.push(leg);
    }
  }

  _restoreColors() {
    this.group.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.userData._origColor !== undefined) {
              m.color.setHex(m.userData._origColor);
              delete m.userData._origColor;
            }
          });
        } else if (child.material.color) {
          if (child.material.userData._origColor !== undefined) {
            child.material.color.setHex(child.material.userData._origColor);
            delete child.material.userData._origColor;
          }
        }
      }
    });
  }

  _updateGroupPosition() {
    this.group.position.set(this.position[0], this.position[1], this.position[2]);
    this.group.rotation.y = this.yaw;
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true; // killed
    }
    return false;
  }

  die() {
    this.dead = true;
    // Remove from scene after a short delay for death animation
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  update(dt) {
    if (this.dead) return;
    this._updateAI(dt);

    const hadSlow = this.slowTimer > 0;
    const hadFire = this.fireDamageTimer > 0;

    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.fireDamageTimer > 0) {
      this.fireDamageTimer -= dt;
      if (this.fireDamagePerTick > 0) {
        this.health -= this.fireDamagePerTick * dt;
        if (this.health <= 0) { this.die(); return; }
      }
    }

    // Restore original colors when all effects expire
    if (hadSlow && this.slowTimer <= 0 && this.fireDamageTimer <= 0) {
      this._restoreColors();
    }

    if (this.slowTimer > 0) {
      this.group.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.material.userData._origColor && child.material.color) {
            child.material.userData._origColor = child.material.color.getHex();
          }
          if (child.material.color) child.material.color.setHex(0x7EC8E3);
        }
      });
    }

    if (this.fireDamageTimer > 0) {
      this.group.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.material.userData._origColor && child.material.color) {
            child.material.userData._origColor = child.material.color.getHex();
          }
          if (child.material.color) child.material.color.setHex(0xFF6F00);
        }
      });
    }

    // Gravity
    this.velocity[1] += -25 * dt;

    // Collision Y
    this.position[1] += this.velocity[1] * dt;
    this._resolveCollisionY();

    // Animation
    this.animTime += dt;
    const isMoving = Math.abs(this.velocity[0]) > 0.05 || Math.abs(this.velocity[2]) > 0.05;
    if (!isMoving) {
      // Idle sway
      const sway = Math.sin(this.animTime * 2) * 0.02;
      this.pivots.head.rotation.z = sway;
    }

    this._updateGroupPosition();
  }

  _updateAI(dt) {
    this.aiTimer -= dt;

    switch (this.aiState) {
      case AI_IDLE:
        this.velocity[0] = 0;
        this.velocity[2] = 0;
        if (this.aiTimer <= 0) {
          if (Math.random() < 0.4) {
            this.aiState = AI_WANDER;
            this.aiTargetYaw = this.yaw + (Math.random() - 0.5) * Math.PI * 1.2;
            this.aiTimer = 1.5 + Math.random() * 3;
          } else {
            this.aiTimer = 2 + Math.random() * 5;
          }
        }
        break;

      case AI_WANDER:
        this.yaw += (this.aiTargetYaw - this.yaw) * 0.03;
        this.velocity[0] = -Math.sin(this.yaw) * this.speed;
        this.velocity[2] = -Math.cos(this.yaw) * this.speed;

        this.position[0] += this.velocity[0] * dt;
        this._resolveCollisionX();
        this.position[2] += this.velocity[2] * dt;
        this._resolveCollisionZ();
        if (this.velocity[0] === 0 || this.velocity[2] === 0) {
          this.aiState = AI_IDLE;
          this.aiTimer = 1 + Math.random() * 2;
        }

        if (this.aiTimer <= 0) {
          this.aiState = AI_IDLE;
          this.aiTimer = 2 + Math.random() * 4;
        }

        // Stay in world bounds
        if (this.position[0] < 2 || this.position[0] > this.world.width - 2 ||
            this.position[2] < 2 || this.position[2] > this.world.depth - 2) {
          this.aiTargetYaw += Math.PI;
          this.aiState = AI_IDLE;
          this.aiTimer = 1;
        }
        break;
    }
  }

  _resolveCollisionY() {
    const hw = this.width / 2;
    this.onGround = false;
    const minBX = Math.floor(this.position[0] - hw);
    const maxBX = Math.floor(this.position[0] + hw);
    const minBY = Math.floor(this.position[1]);
    const maxBY = Math.floor(this.position[1] + this.height);
    const minBZ = Math.floor(this.position[2] - hw);
    const maxBZ = Math.floor(this.position[2] + hw);

    let resolved = false;
    for (let bx = minBX; bx <= maxBX && !resolved; bx++) {
      for (let by = minBY; by <= maxBY && !resolved; by++) {
        for (let bz = minBZ; bz <= maxBZ && !resolved; bz++) {
          if (!isSolid(this.world.getBlock(bx, by, bz))) continue;
          if (this.velocity[1] < 0) {
            this.position[1] = by + 1;
            this.onGround = true;
          } else if (this.velocity[1] > 0) {
            this.position[1] = by - this.height;
          }
          this.velocity[1] = 0;
          resolved = true;
        }
      }
    }
  }

  _checkCollisionX() {
    const hw = this.width / 2;
    const minBX = Math.floor(this.position[0] - hw);
    const maxBX = Math.floor(this.position[0] + hw);
    const minBY = Math.floor(this.position[1] + 0.1);
    const maxBY = Math.floor(this.position[1] + this.height - 0.1);
    const minBZ = Math.floor(this.position[2] - hw + 0.1);
    const maxBZ = Math.floor(this.position[2] + hw - 0.1);
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (isSolid(this.world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  _resolveCollisionX() {
    if (this._checkCollisionX()) {
      this.position[0] = Math.floor(this.position[0]) + 0.5;
      this.velocity[0] = 0;
    }
  }

  _checkCollisionZ() {
    const hw = this.width / 2;
    const minBX = Math.floor(this.position[0] - hw + 0.1);
    const maxBX = Math.floor(this.position[0] + hw - 0.1);
    const minBY = Math.floor(this.position[1] + 0.1);
    const maxBY = Math.floor(this.position[1] + this.height - 0.1);
    const minBZ = Math.floor(this.position[2] - hw);
    const maxBZ = Math.floor(this.position[2] + hw);
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (isSolid(this.world.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  _resolveCollisionZ() {
    if (this._checkCollisionZ()) {
      this.position[2] = Math.floor(this.position[2]) + 0.5;
      this.velocity[2] = 0;
    }
  }

  static spawnAnimals(world, AnimalClass, count = 3) {
    const animals = [];
    let attempts = 0;

    while (animals.length < count && attempts < 100) {
      attempts++;
      const x = 3 + Math.random() * (world.width - 6);
      const z = 3 + Math.random() * (world.depth - 6);
      const bx = Math.floor(x);
      const bz = Math.floor(z);

      let groundY = -1;
      for (let y = 31; y >= 0; y--) {
        if (world.getBlock(bx, y, bz) !== BLOCK.AIR) {
          groundY = y + 1;
          break;
        }
      }

      if (groundY > 0) {
        let flat = true;
        for (let dx = -1; dx <= 1 && flat; dx++) {
          for (let dz = -1; dz <= 1 && flat; dz++) {
            const checkY = Math.floor(groundY);
            if (world.getBlock(bx+dx, checkY, bz+dz) !== BLOCK.AIR ||
                world.getBlock(bx+dx, checkY-1, bz+dz) === BLOCK.AIR) {
              if (world.getBlock(bx+dx, checkY-1, bz+dz) === BLOCK.AIR) flat = false;
            }
          }
        }
        if (flat) {
          animals.push(new AnimalClass(world, [x, groundY, z]));
        }
      }
    }

    return animals;
  }
}

// === Subclasses ===

class Pig extends PassiveAnimal {
  constructor(world, position) {
    super(world, position, {
      width: 0.6,
      height: 0.5,
      speed: 1.0,
      bodyColor: 0xF5B0B0,  // pink
      accentColor: 0xE89090,
    });

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.15, 0.08, 0.1);
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0xCC6666 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0.55, -0.02, 0);
    this.pivots.head.add(snout);
  }
}

class Cow extends PassiveAnimal {
  constructor(world, position) {
    super(world, position, {
      width: 0.8,
      height: 0.7,
      speed: 0.8,
      bodyColor: 0xFFFFFF,  // white
      accentColor: 0xDDDDDD,
    });

    // Spots
    const spotGeo = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    const spotMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.position.set(-0.1, 0.25, 0.2);
    this.pivots.body.add(spot);

    // Horns
    const hornGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(0.3, 0.25, -0.2);
    this.pivots.head.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, hornMat.clone());
    hornR.position.set(0.3, 0.25, 0.2);
    this.pivots.head.add(hornR);
  }
}

class Sheep extends PassiveAnimal {
  constructor(world, position) {
    super(world, position, {
      width: 0.7,
      height: 0.6,
      speed: 0.7,
      bodyColor: 0xEEEEE0,  // off-white wool
      accentColor: 0x555555, // dark face
    });

    // Woolly top (extra layer on body)
    const woolGeo = new THREE.BoxGeometry(this.width * 1.15, this.height * 0.25, this.width * 0.85);
    const woolMat = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
    const wool = new THREE.Mesh(woolGeo, woolMat);
    wool.position.set(0, this.height * 0.55, 0);
    this.pivots.body.add(wool);
  }
}

class Chicken extends PassiveAnimal {
  constructor(world, position) {
    super(world, position, {
      width: 0.3,
      height: 0.35,
      speed: 1.2,
      bodyColor: 0xFFF176,  // yellow
      accentColor: 0xE6C300,
    });

    // Beak
    const beakGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xFF8F00 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0.25, 0, 0);
    this.pivots.head.add(beak);

    // Comb
    const combGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const combMat = new THREE.MeshLambertMaterial({ color: 0xDD2C00 });
    const comb = new THREE.Mesh(combGeo, combMat);
    comb.position.set(0.15, 0.2, 0);
    this.pivots.head.add(comb);
  }
}

// === Slime (hostile) ===

const SLIME_STATE_IDLE = 0;
const SLIME_STATE_WANDER = 1;
const SLIME_STATE_CHASE = 2;

class Slime {
  constructor(world, position, isLarge = false) {
    this.world = world;
    this.position = [...position];
    this.isLarge = isLarge;
    this.dead = false;
    this.isSlime = true;

    // Stats based on size (per spec)
    if (isLarge) {
      this.maxHealth = 25;
      this.health = 25;
      this.atk = 4;
      this.speed = 0.6;
      this.radius = 0.6;
    } else {
      this.maxHealth = 10;
      this.health = 10;
      this.atk = 2;
      this.speed = 0.6;
      this.radius = 0.3;
    }
    this.width = this.radius * 2;
    this.height = this.radius * 2;

    // Contact damage cooldown
    this.lastDamageTime = -1;
    this.damageCooldown = 1.0;

    // AI state
    this.aiState = SLIME_STATE_IDLE;
    this.aiTimer = 2 + Math.random() * 3;
    this.aiTargetYaw = Math.random() * Math.PI * 2;

    // Model
    this.group = new THREE.Group();
    this._buildModel();
    this.group.traverse((child) => {
      child.layers.set(1);
    });
    this._updateGroupPosition();

    this.velocity = [0, 0, 0];
    this.onGround = false;
    this.animTime = 0;

    // Slow effect state
    this.slowTimer = 0;
    this.slowFactor = 0;

    // Fire damage state
    this.fireDamageTimer = 0;
    this.fireDamagePerTick = 0;

    // Split callback
    this.onDeath = null;
  }

  _buildModel() {
    // Body — SphereGeometry (per D-2: use sphere + transparent green)
    const bodyGeo = new THREE.SphereGeometry(this.radius, 12, 12);
    const bodyMat = new THREE.MeshLambertMaterial({
      color: this.isLarge ? 0x2E7D32 : 0x4CAF50,
      transparent: true,
      opacity: 0.85,
    });
    this.slimeMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.slimeMesh.position.set(0, this.radius, 0);
    this.group.add(this.slimeMesh);

    // Eyes
    const eyeSize = this.radius * 0.2;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 6);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    for (let side = -1; side <= 1; side += 2) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(eyeSize * 0.8, this.radius * 1.2, side * this.radius * 0.6);
      this.slimeMesh.add(eye);
      // Pupil
      const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.4, 6, 6);
      const pupilMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0.2, 0, side * eyeSize * 0.4);
      eye.add(pupil);
    }
  }

  _restoreColors() {
    this.group.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.userData._origColor !== undefined) {
              m.color.setHex(m.userData._origColor);
              delete m.userData._origColor;
            }
          });
        } else if (child.material.color) {
          if (child.material.userData._origColor !== undefined) {
            child.material.color.setHex(child.material.userData._origColor);
            delete child.material.userData._origColor;
          }
        }
      }
    });
  }

  _updateGroupPosition() {
    this.group.position.set(this.position[0], this.position[1], this.position[2]);
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.health -= amount;
    // Small slimes get aggroed for 5s when attacked (per spec: defensive, retaliate)
    if (!this.isLarge) {
      this.aiState = SLIME_STATE_CHASE;
      this.aiTimer = 5;
    } else {
      this.aiState = SLIME_STATE_CHASE;
      this.aiTimer = 2;
    }
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      if (this.onDeath) {
        this.onDeath(this);
      }
      return true;
    }
    return false;
  }

  die() {
    this.dead = true;
    if (this.group && this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  update(dt, playerPosition) {
    if (this.dead) return;

    this.animTime += dt;

    // Handle slow effect
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
    }

    // Handle fire damage over time
    if (this.fireDamageTimer > 0) {
      this.fireDamageTimer -= dt;
      if (this.fireDamagePerTick > 0) {
        this.health -= this.fireDamagePerTick * dt;
        if (this.health <= 0) {
          this.die();
          if (this.onDeath) this.onDeath(this);
          return;
        }
      }
    }

    // Water immunity — slimes don't sink in water
    const bx = Math.floor(this.position[0]);
    const by = Math.floor(this.position[1] + 0.1);
    const bz = Math.floor(this.position[2]);
    const inWater = this.world.getBlock(bx, by, bz) === BLOCK.WATER;

    // Speed modifier: rain bonus from AI + no water slow
    let speedMult = 1.0;
    if (this.slowTimer > 0) speedMult *= (1 - this.slowFactor);
    // Rain speed bonus is applied externally via world._rainSpeedBonus

    // AI behavior
    const rainSpeedBonus = this.world._rainSpeedBonus || 0;

    this.aiTimer -= dt;
    switch (this.aiState) {
      case SLIME_STATE_IDLE:
        this.velocity[0] = 0;
        this.velocity[2] = 0;
        if (this.aiTimer <= 0) {
          if (Math.random() < 0.5) {
            this.aiState = SLIME_STATE_WANDER;
            this.aiTargetYaw = Math.random() * Math.PI * 2;
            this.aiTimer = 1.5 + Math.random() * 2;
          } else {
            this.aiTimer = 2 + Math.random() * 3;
          }
        }
        // Large slimes aggressively chase within 10 blocks (per spec)
        if (playerPosition && this.isLarge) {
          const dx = playerPosition[0] - this.position[0];
          const dz = playerPosition[2] - this.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 10) {
            this.aiState = SLIME_STATE_CHASE;
            this.aiTimer = 2;
          }
        }
        break;

      case SLIME_STATE_WANDER:
        this.yaw += (this.aiTargetYaw - this.yaw) * 0.05;
        this.velocity[0] = -Math.sin(this.yaw) * this.speed * speedMult;
        this.velocity[2] = -Math.cos(this.yaw) * this.speed * speedMult;
        if (this.aiTimer <= 0) {
          this.aiState = SLIME_STATE_IDLE;
          this.aiTimer = 1 + Math.random() * 2;
        }
        // Large slimes interrupt wander to chase
        if (playerPosition && this.isLarge) {
          const dx = playerPosition[0] - this.position[0];
          const dz = playerPosition[2] - this.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 10) {
            this.aiState = SLIME_STATE_CHASE;
            this.aiTimer = 2;
          }
        }
        break;

      case SLIME_STATE_CHASE:
        if (playerPosition) {
          const dx = playerPosition[0] - this.position[0];
          const dz = playerPosition[2] - this.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          const chaseRange = this.isLarge ? 10 : 12;
          if (dist < chaseRange && dist > 0.5) {
            this.aiTargetYaw = Math.atan2(-dx, -dz);
            this.yaw += (this.aiTargetYaw - this.yaw) * 0.1;
            // Large slimes: 50% speed bonus when chasing (per spec)
            const chaseBonus = this.isLarge ? 1.5 : 1.0;
            this.velocity[0] = -Math.sin(this.yaw) * this.speed * (speedMult + rainSpeedBonus) * chaseBonus;
            this.velocity[2] = -Math.cos(this.yaw) * this.speed * (speedMult + rainSpeedBonus) * chaseBonus;
          } else if (dist <= 0.5) {
            this.velocity[0] = 0;
            this.velocity[2] = 0;
          } else {
            this.aiState = SLIME_STATE_IDLE;
            this.aiTimer = 2 + Math.random() * 2;
          }
        }
        if (this.aiTimer <= 0) {
          this.aiState = SLIME_STATE_IDLE;
          this.aiTimer = 2 + Math.random() * 3;
        }
        break;
    }

    // Physics — water immunity: no sinking in water
    if (inWater) {
      // Float in water (prevent sinking)
      if (this.velocity[1] < -2) this.velocity[1] = -2;
    }
    this.position[0] += this.velocity[0] * dt;
    this._resolveCollisionX();
    this.position[2] += this.velocity[2] * dt;
    this._resolveCollisionZ();

    this.velocity[1] += -25 * dt;
    this.position[1] += this.velocity[1] * dt;
    this._resolveCollisionY();

    // Bounce animation — Y-axis sine wave + scale squish (per spec)
    const bounce = Math.sin(this.animTime * 4);
    const bounceOffset = Math.abs(bounce) * this.radius * 0.15;
    this.position[1] += bounceOffset;

    if (this.slimeMesh) {
      this.slimeMesh.scale.y = 1 + 0.15 * bounce;
      this.slimeMesh.scale.x = 1 - 0.08 * bounce;
      this.slimeMesh.scale.z = 1 - 0.08 * bounce;
    }

    this._updateGroupPosition();
  }

  // Check contact with player AABB, deal damage if overlapping
  checkContactDamage(player, time) {
    if (this.dead) return null;
    if (time - this.lastDamageTime < this.damageCooldown) return null;

    const hw = this.radius;
    const phw = player.width / 2;
    const overlapX = Math.abs(this.position[0] - player.position[0]) < (hw + phw);
    const overlapY = Math.abs(this.position[1] + this.radius - player.position[1] - player.height / 2) < (this.radius + player.height / 2);
    const overlapZ = Math.abs(this.position[2] - player.position[2]) < (hw + phw);

    if (overlapX && overlapY && overlapZ) {
      this.lastDamageTime = time;
      return this.atk;
    }
    return null;
  }

  _resolveCollisionX() {
    const hw = this.radius;
    const minBX = Math.floor(this.position[0] - hw);
    const maxBX = Math.floor(this.position[0] + hw);
    const minBY = Math.floor(this.position[1] + 0.1);
    const maxBY = Math.floor(this.position[1] + this.height - 0.1);
    const minBZ = Math.floor(this.position[2] - hw + 0.1);
    const maxBZ = Math.floor(this.position[2] + hw - 0.1);
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.position[0] = Math.floor(this.position[0]) + 0.5;
            this.velocity[0] = 0;
            return;
          }
        }
      }
    }
  }

  _resolveCollisionZ() {
    const hw = this.radius;
    const minBX = Math.floor(this.position[0] - hw + 0.1);
    const maxBX = Math.floor(this.position[0] + hw - 0.1);
    const minBY = Math.floor(this.position[1] + 0.1);
    const maxBY = Math.floor(this.position[1] + this.height - 0.1);
    const minBZ = Math.floor(this.position[2] - hw);
    const maxBZ = Math.floor(this.position[2] + hw);
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.position[2] = Math.floor(this.position[2]) + 0.5;
            this.velocity[2] = 0;
            return;
          }
        }
      }
    }
  }

  _resolveCollisionY() {
    const hw = this.radius;
    this.onGround = false;
    const minBX = Math.floor(this.position[0] - hw);
    const maxBX = Math.floor(this.position[0] + hw);
    const minBY = Math.floor(this.position[1]);
    const maxBY = Math.floor(this.position[1] + this.height);
    const minBZ = Math.floor(this.position[2] - hw);
    const maxBZ = Math.floor(this.position[2] + hw);
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (!isSolid(this.world.getBlock(bx, by, bz))) continue;
          if (this.velocity[1] < 0) {
            this.position[1] = by + 1;
            this.onGround = true;
          } else if (this.velocity[1] > 0) {
            this.position[1] = by - this.height;
          }
          this.velocity[1] = 0;
          return;
        }
      }
    }
  }

  getAABB() {
    const hw = this.radius;
    return {
      minX: this.position[0] - hw,
      maxX: this.position[0] + hw,
      minY: this.position[1],
      maxY: this.position[1] + this.height,
      minZ: this.position[2] - hw,
      maxZ: this.position[2] + hw,
    };
  }
}

export { PassiveAnimal, Pig, Cow, Sheep, Chicken, Slime };
