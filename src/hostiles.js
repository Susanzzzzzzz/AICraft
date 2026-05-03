// Hostile mobs module -- HostileMob base + Zombie, Skeleton, Spider, DropItem
import * as THREE from 'three';
import { BLOCK, ITEM, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH, isSolid } from './world.js';

const AI_IDLE = 0;
const AI_WANDER = 1;
const AI_CHASE = 2;
const AI_RETREAT = 3;

export class DropItem {
  constructor(scene, position, itemType, count = 1) {
    this.scene = scene;
    this.position = [...position];
    this.itemType = itemType;
    this.count = count;
    this.age = 0;
    this.lifetime = 60;
    this.collected = false;

    this.group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.2;
    this.group.add(this.mesh);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 0.2 });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glowMat);
    glow.position.y = 0.2;
    this.group.add(glow);

    this.group.position.set(position[0], position[1] + 0.3, position[2]);
    scene.add(this.group);
  }

  update(dt, playerPos) {
    if (this.collected) return;
    this.age += dt;
    this.mesh.position.y = 0.2 + Math.sin(this.age * 3) * 0.05;
    this.group.rotation.y += dt * 1.5;
    if (this.age >= this.lifetime) { this.remove(); return; }
    if (playerPos) {
      const dx = this.position[0] - playerPos[0];
      const dy = this.position[1] - playerPos[1];
      const dz = this.position[2] - playerPos[2];
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 2.5) this.collected = true;
    }
  }

  remove() {
    this.collected = true;
    if (this.group.parent) this.group.parent.remove(this.group);
  }
}

class HostileMob {
  constructor(world, position, config) {
    this.world = world;
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.yaw = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.animTime = 0;
    this.dead = false;
    this.isHostile = true;

    this.maxHealth = config.maxHealth || 20;
    this.health = this.maxHealth;
    this.atk = config.atk || 5;
    this.speed = config.speed || 1.0;
    this.attackRange = config.attackRange || 1.5;
    this.attackCooldown = config.attackCooldown || 1.0;
    this.trackingRange = config.trackingRange || 16;
    this.width = config.width || 0.6;
    this.height = config.height || 1.8;

    this.slowTimer = 0;
    this.slowFactor = 0;
    this.fireDamageTimer = 0;
    this.fireDamagePerTick = 0;

    this.aiState = AI_IDLE;
    this.aiTimer = 2 + Math.random() * 4;
    this.aiTargetYaw = this.yaw;
    this._atkTimer = 0;
    this._sunCheckTimer = 0;

    this.group = new THREE.Group();
    this.pivots = {};
    this._buildModel();
    this.group.traverse(child => child.layers.set(1));
    this._updateGroupPosition();
  }

  _buildModel() {}

  _updateGroupPosition() {
    this.group.position.set(this.position[0], this.position[1], this.position[2]);
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.health -= amount;
    this.aiState = AI_CHASE;
    this.aiTimer = 5;
    this.group.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m.emissive) { m.emissive.setHex(0xFFFFFF); m.emissiveIntensity = 0.5; } });
        } else if (child.material.emissive) {
          child.material.emissive.setHex(0xFFFFFF);
          child.material.emissiveIntensity = 0.5;
        }
      }
    });
    setTimeout(() => {
      if (this.dead) return;
      this.group.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { m.emissiveIntensity = 0; });
          } else if (child.material.emissive) {
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }, 100);
    if (this.health <= 0) { this.health = 0; this.die(); return true; }
    return false;
  }

  die() {
    this.dead = true;
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
  }

  getDrops() { return []; }

  update(dt, playerPos, timeOfDay) {
    if (this.dead) return;
    this.animTime += dt;
    this._atkTimer -= dt;
    this._sunCheckTimer -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.fireDamageTimer > 0) {
      this.fireDamageTimer -= dt;
      if (this.fireDamagePerTick > 0) {
        this.health -= this.fireDamagePerTick * dt;
        if (this.health <= 0) { this.die(); return; }
      }
    }
    this._updateSunDamage(dt, timeOfDay);
    this._updateAI(dt, playerPos);
    this.velocity[1] += -25 * dt;
    this.position[1] += this.velocity[1] * dt;
    this._resolveCollisionY();
    this._updateGroupPosition();
  }

  _updateSunDamage(dt, timeOfDay) {}

  _updateAI(dt, playerPos) {
    if (!playerPos) { this._idleAI(dt); return; }
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    switch (this.aiState) {
      case AI_IDLE:
        this.velocity[0] = 0; this.velocity[2] = 0;
        if (this.aiTimer <= 0) {
          if (Math.random() < 0.4) {
            this.aiState = AI_WANDER;
            this.aiTargetYaw = this.yaw + (Math.random() - 0.5) * Math.PI;
            this.aiTimer = 1.5 + Math.random() * 3;
          } else { this.aiTimer = 2 + Math.random() * 4; }
        }
        if (dist < this.trackingRange) { this.aiState = AI_CHASE; this.aiTimer = 5; }
        break;
      case AI_WANDER:
        this.yaw += (this.aiTargetYaw - this.yaw) * 0.03;
        this.velocity[0] = -Math.sin(this.yaw) * this.speed;
        this.velocity[2] = -Math.cos(this.yaw) * this.speed;
        this._moveWithCollision(dt);
        if (dist < this.trackingRange) { this.aiState = AI_CHASE; this.aiTimer = 5; }
        if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
        break;
      case AI_CHASE:
        if (dist > this.trackingRange + 5) { this.aiState = AI_IDLE; this.aiTimer = 2; break; }
        this._doChaseAI(dt, playerPos, dist);
        break;
      case AI_RETREAT:
        this._doRetreatAI(dt, playerPos, dist);
        break;
    }
    if (this.position[0] < 2 || this.position[0] > this.world.width - 2 ||
        this.position[2] < 2 || this.position[2] > this.world.depth - 2) {
      this.aiTargetYaw += Math.PI; this.aiState = AI_IDLE; this.aiTimer = 1;
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.08;
    if (dist > this.attackRange) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed;
      this._moveWithCollision(dt);
    } else { this.velocity[0] = 0; this.velocity[2] = 0; }
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
  }

  _doRetreatAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(dx, dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.08;
    this.velocity[0] = -Math.sin(this.yaw) * this.speed;
    this.velocity[2] = -Math.cos(this.yaw) * this.speed;
    this._moveWithCollision(dt);
    if (this.aiTimer <= 0) this.aiState = AI_CHASE;
  }

  _idleAI(dt) { this.velocity[0] = 0; this.velocity[2] = 0; }

  _moveWithCollision(dt) {
    this.position[0] += this.velocity[0] * dt;
    this._resolveCollisionX();
    this.position[2] += this.velocity[2] * dt;
    this._resolveCollisionZ();
  }

  _resolveCollisionX() {
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
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.position[0] = Math.floor(this.position[0]) + 0.5;
            this.velocity[0] = 0; return;
          }
        }
      }
    }
  }

  _resolveCollisionZ() {
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
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.position[2] = Math.floor(this.position[2]) + 0.5;
            this.velocity[2] = 0; return;
          }
        }
      }
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
    for (let bx = minBX; bx <= maxBX; bx++) {
      for (let by = minBY; by <= maxBY; by++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (!isSolid(this.world.getBlock(bx, by, bz))) continue;
          if (this.velocity[1] < 0) { this.position[1] = by + 1; this.onGround = true; }
          else if (this.velocity[1] > 0) { this.position[1] = by - this.height; }
          this.velocity[1] = 0; return;
        }
      }
    }
  }

  getAttackDamage() { return this.atk; }
  canAttack() { return this._atkTimer <= 0; }
  resetAttackCooldown() { this._atkTimer = this.attackCooldown; }

  getAABB() {
    const hw = this.width / 2;
    return {
      minX: this.position[0] - hw, maxX: this.position[0] + hw,
      minY: this.position[1], maxY: this.position[1] + this.height,
      minZ: this.position[2] - hw, maxZ: this.position[2] + hw,
    };
  }
}

class Zombie extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 20, atk: 5, speed: 1.0,
      attackRange: 1.5, attackCooldown: 1.0,
      trackingRange: 16, width: 0.6, height: 1.8,
    });
  }

  _buildModel() {
    const varR = () => Math.round((Math.random() - 0.5) * 16);
    const bodyColor = new THREE.Color().setRGB(
      (0x2E / 255) + varR()/255, (0x7D / 255) + varR()/255, (0x32 / 255) + varR()/255);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMat);
    body.position.set(0, 0.9, 0);
    this.group.add(body);

    const headMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.35), headMat);
    head.position.set(0, 1.45, 0);
    this.group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat);
      eye.position.set(s * 0.1, 1.45, 0.18);
      this.group.add(eye);
    }

    const armMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    for (let s = -1; s <= 1; s += 2) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), armMat);
      arm.position.set(s * 0.35, 0.75, 0);
      arm.rotation.x = s * 0.2;
      arm.rotation.z = s * 0.15;
      this.group.add(arm);
    }

    const legMat = new THREE.MeshLambertMaterial({ color: 0x1B5E20 });
    for (let s = -1; s <= 1; s += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), legMat);
      leg.position.set(s * 0.12, 0.2, 0);
      this.group.add(leg);
    }
  }

  _updateSunDamage(dt, timeOfDay) {
    if (timeOfDay === undefined) return;
    if (timeOfDay > 0.25 && timeOfDay < 0.75) {
      this._sunCheckTimer -= dt;
      if (this._sunCheckTimer <= 0) {
        this._sunCheckTimer = 1;
        const bx = Math.floor(this.position[0]);
        const bz = Math.floor(this.position[2]);
        let exposed = true;
        for (let y = Math.floor(this.position[1] + this.height); y < this.world.height; y++) {
          if (isSolid(this.world.getBlock(bx, y, bz))) { exposed = false; break; }
        }
        if (exposed) {
          this.health -= 2;
          this.group.traverse(child => {
            if (child.isMesh && child.material && child.material.color)
              child.material.color.setHex(0xFF6F00);
          });
        }
      }
    }
  }

  getDrops() {
    const drops = [];
    if (Math.random() < 0.05) drops.push({ type: ITEM.IRON_INGOT, count: 1 });
    return drops;
  }
}

class Skeleton extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 20, atk: 6, speed: 1.0,
      attackRange: 8, attackCooldown: 2.0,
      trackingRange: 15, width: 0.6, height: 1.8,
    });
  }

  _buildModel() {
    const varR = () => Math.round((Math.random() - 0.5) * 12);
    const bodyColor = new THREE.Color().setRGB(
      (0xE0/255) + varR()/255, (0xE0/255) + varR()/255, (0xE0/255) + varR()/255);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.25), bodyMat);
    body.position.set(0, 0.9, 0);
    this.group.add(body);

    // Ribcage detail (thin horizontal bars)
    const ribMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), ribMat);
      rib.position.set(0, 0.75 + i * 0.12, 0.14);
      this.group.add(rib);
    }

    const headMat = new THREE.MeshLambertMaterial({ color: 0xF5F5F5 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.3), headMat);
    head.position.set(0, 1.4, 0);
    this.group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), eyeMat);
      eye.position.set(s * 0.08, 1.4, 0.16);
      this.group.add(eye);
    }

    const armMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    for (let s = -1; s <= 1; s += 2) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), armMat);
      arm.position.set(s * 0.28, 0.85, 0);
      this.group.add(arm);
    }

    const legMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
    for (let s = -1; s <= 1; s += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), legMat);
      leg.position.set(s * 0.1, 0.2, 0);
      this.group.add(leg);
    }

    // Better bow: main arc + bowstring
    const bowMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const bowArc = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), bowMat);
    bowArc.position.set(0.35, 0.9, 0.2);
    bowArc.rotation.z = 0.3;
    this.group.add(bowArc);
    const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.35, 0.01), new THREE.MeshBasicMaterial({ color: 0xDDDDDD }));
    bowString.position.set(0.3, 0.9, 0.2);
    bowString.rotation.z = -0.1;
    this.group.add(bowString);
  }

  _updateSunDamage(dt, timeOfDay) {
    if (timeOfDay === undefined) return;
    if (timeOfDay > 0.25 && timeOfDay < 0.75) {
      this._sunCheckTimer -= dt;
      if (this._sunCheckTimer <= 0) {
        this._sunCheckTimer = 1;
        const bx = Math.floor(this.position[0]);
        const bz = Math.floor(this.position[2]);
        let exposed = true;
        for (let y = Math.floor(this.position[1] + this.height); y < this.world.height; y++) {
          if (isSolid(this.world.getBlock(bx, y, bz))) { exposed = false; break; }
        }
        if (exposed) this.health -= 2;
      }
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.08;
    if (dist < 5) {
      this.velocity[0] = Math.sin(this.yaw) * this.speed * 0.7;
      this.velocity[2] = Math.cos(this.yaw) * this.speed * 0.7;
    } else if (dist > 10) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed * 0.5;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed * 0.5;
    } else {
      this.velocity[0] = 0; this.velocity[2] = 0;
    }
    this._moveWithCollision(dt);
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
  }

  getDrops() {
    const drops = [];
    if (Math.random() < 0.5) {
      const c = Math.floor(Math.random() * 3);
      if (c > 0) drops.push({ type: ITEM.ARROW, count: c });
    }
    return drops;
  }
}

class Spider extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 16, atk: 3, speed: 1.8,
      attackRange: 1.5, attackCooldown: 1.0,
      trackingRange: 20, width: 0.7, height: 0.8,
    });
    this._jumpTimer = 0;
  }

  _buildModel() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), bodyMat);
    body.position.set(0, 0.3, 0);
    this.group.add(body);

    const abdomenMat = new THREE.MeshLambertMaterial({ color: 0x2C1A0E });
    const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.35), abdomenMat);
    abdomen.position.set(-0.2, 0.25, 0);
    this.group.add(abdomen);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat);
      eye.position.set(0.3, 0.4, s * 0.15);
      this.group.add(eye);
    }

    const legMat = new THREE.MeshLambertMaterial({ color: 0x2C1A0E });
    const legPositions = [
      [0.22, 0.15, 0.35], [0.22, 0.15, -0.35],
      [0.05, 0.15, 0.4], [0.05, 0.15, -0.4],
      [-0.15, 0.15, 0.4], [-0.15, 0.15, -0.4],
      [-0.3, 0.15, 0.35], [-0.3, 0.15, -0.35],
    ];
    for (const pos of legPositions) {
      // Upper leg segment
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), legMat);
      upper.position.set(pos[0], pos[1], pos[2]);
      this.group.add(upper);
      // Lower leg segment (bent)
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), legMat);
      const zOff = pos[2] > 0 ? 1 : -1;
      lower.position.set(pos[0] + 0.02, pos[1] - 0.02, pos[2] + zOff * 0.1);
      lower.rotation.x = zOff * 0.3;
      this.group.add(lower);
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.08;
    if (dist > this.attackRange) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed;
      this._moveWithCollision(dt);
      if (this.onGround && this.velocity[1] >= -0.1) {
        this._jumpTimer -= dt;
        if (this._jumpTimer <= 0) {
          const ax = -Math.sin(this.yaw) * 0.6;
          const az = -Math.cos(this.yaw) * 0.6;
          const bx = Math.floor(this.position[0] + ax);
          const bz = Math.floor(this.position[2] + az);
          const by = Math.floor(this.position[1]);
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.velocity[1] = 8;
            this._jumpTimer = 0.5;
          }
        }
      }
    } else { this.velocity[0] = 0; this.velocity[2] = 0; }
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
  }

  getDrops() {
    const drops = [];
    const c = Math.floor(Math.random() * 3);
    if (c > 0) drops.push({ type: ITEM.SLIME_BALL, count: c });
    return drops;
  }
}

// ---- New Hostile Mobs ----

class Creeper extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 20, atk: 49, speed: 0.7,
      attackRange: 2.5, attackCooldown: 3.0,
      trackingRange: 12, width: 0.6, height: 0.8,
    });
    this._fuseTimer = -1;
  }

  _buildModel() {
    const bodyColor = 0x4CAF50;
    const headColor = 0x66BB6A;
    const legColor = 0x388E3C;

    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), bodyMat);
    body.position.set(0, 0.4, 0);
    this.group.add(body);

    const headMat = new THREE.MeshLambertMaterial({ color: headColor });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
    head.position.set(0, 0.85, 0);
    this.group.add(head);

    // Face details
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1B1B1B });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.02), faceMat);
    mouth.position.set(0, 0.75, 0.26);
    this.group.add(mouth);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.02), faceMat);
    eyes.position.set(0, 0.9, 0.26);
    this.group.add(eyes);

    const legMat = new THREE.MeshLambertMaterial({ color: legColor });
    for (let s1 = -1; s1 <= 1; s1 += 2) {
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), legMat);
        leg.position.set(s1 * 0.18, 0.08, s2 * 0.18);
        this.group.add(leg);
      }
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    if (dist <= this.attackRange) {
      if (this._fuseTimer < 0) this._fuseTimer = 1.5;
      this._fuseTimer -= dt;
      if (this._fuseTimer <= 0) this._explode();
      this.velocity[0] = 0;
      this.velocity[2] = 0;
      return;
    }
    this._fuseTimer = -1;
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.06;
    this.velocity[0] = -Math.sin(this.yaw) * this.speed;
    this.velocity[2] = -Math.cos(this.yaw) * this.speed;
    this._moveWithCollision(dt);
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 3 + Math.random() * 4; }
  }

  _explode() {
    if (this._exploded) return;
    this._exploded = true;
    this.dead = true;
  }

  getDrops() {
    return [{ type: ITEM.GUNPOWDER, count: 1 + Math.floor(Math.random() * 2) }];
  }
}

class Enderman extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 40, atk: 7, speed: 1.2,
      attackRange: 2.0, attackCooldown: 1.5,
      trackingRange: 20, width: 0.5, height: 2.0,
    });
    this._teleportCooldown = 0;
  }

  _buildModel() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2E0A4E });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), bodyMat);
    body.position.set(0, 0.8, 0);
    this.group.add(body);

    const headMat = new THREE.MeshLambertMaterial({ color: 0x1A0033 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.4), headMat);
    head.position.set(0, 1.65, 0);
    this.group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xE040FB });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), eyeMat);
      eye.position.set(s * 0.1, 1.7, 0.22);
      this.group.add(eye);
    }

    const limbMat = new THREE.MeshLambertMaterial({ color: 0x2E0A4E });
    for (let s = -1; s <= 1; s += 2) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), limbMat);
      arm.position.set(s * 0.32, 1.0, 0);
      this.group.add(arm);
    }
    for (let s = -1; s <= 1; s += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), limbMat);
      leg.position.set(s * 0.12, 0.25, 0);
      this.group.add(leg);
    }
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    if (!this.dead && this._teleportCooldown <= 0) {
      this._teleportCooldown = 2.0;
      this._teleport();
    }
  }

  _teleport() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 8;
      const nx = Math.floor(this.position[0] + Math.cos(angle) * dist);
      const nz = Math.floor(this.position[2] + Math.sin(angle) * dist);
      if (nx < 2 || nx >= 126 || nz < 2 || nz >= 126) continue;
      let ny = -1;
      for (let y = 31; y >= 0; y--) {
        if (this.world.getBlock(nx, y, nz) !== 0) { ny = y + 1; break; }
      }
      if (ny <= 0 || ny >= 62) continue;
      this.position[0] = nx + 0.5;
      this.position[1] = ny;
      this.position[2] = nz + 0.5;
      this.group.position.set(this.position[0], this.position[1], this.position[2]);
      break;
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    if (this._teleportCooldown > 0) this._teleportCooldown -= dt;
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.1;
    if (dist > this.attackRange) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed;
      this._moveWithCollision(dt);
    } else { this.velocity[0] = 0; this.velocity[2] = 0; }
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
  }

  getDrops() {
    if (Math.random() < 0.5) return [{ type: ITEM.ENDER_PEARL, count: 1 }];
    return [];
  }
}

class Wolf extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 8, atk: 3, speed: 1.5,
      attackRange: 1.2, attackCooldown: 0.8,
      trackingRange: 10, width: 0.4, height: 0.5,
    });
    this._packTimer = 0;
  }

  _buildModel() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x9E9E9E });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });
    const legMat = new THREE.MeshLambertMaterial({ color: 0x757575 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), bodyMat);
    body.position.set(0, 0.22, 0);
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.25), headMat);
    head.position.set(0.35, 0.35, 0);
    this.group.add(head);

    for (let s = -1; s <= 1; s += 2) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), headMat);
      ear.position.set(0.35, 0.5, s * 0.1);
      this.group.add(ear);
    }

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
      eye.position.set(0.45, 0.38, s * 0.08);
      this.group.add(eye);
    }

    for (let s1 = -1; s1 <= 1; s1 += 2) {
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.06), legMat);
        leg.position.set(s1 * 0.15, 0.08, s2 * 0.1);
        this.group.add(leg);
      }
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), bodyMat);
    tail.position.set(-0.3, 0.35, 0);
    this.group.add(tail);
  }

  _doChaseAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.12;
    if (dist > this.attackRange) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed;
      this._moveWithCollision(dt);
    } else { this.velocity[0] = 0; this.velocity[2] = 0; }
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 1 + Math.random() * 2; }
  }

  getDrops() {
    return [];
  }
}

class CaveSpider extends HostileMob {
  constructor(world, position) {
    super(world, position, {
      maxHealth: 12, atk: 2, speed: 2.0,
      attackRange: 1.5, attackCooldown: 1.0,
      trackingRange: 16, width: 0.4, height: 0.5,
    });
    this._jumpTimer = 0;
    this._poisonDuration = 3;
  }

  _buildModel() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x00BCD4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.25), bodyMat);
    body.position.set(0, 0.25, 0);
    this.group.add(body);

    const abdomenMat = new THREE.MeshLambertMaterial({ color: 0x00838F });
    const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.25), abdomenMat);
    abdomen.position.set(-0.15, 0.2, 0);
    this.group.add(abdomen);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
      eye.position.set(0.2, 0.33, s * 0.1);
      this.group.add(eye);
    }

    const legMat = new THREE.MeshLambertMaterial({ color: 0x006064 });
    const legPositions = [
      [0.18, 0.12, 0.2], [0.18, 0.12, -0.2],
      [0.05, 0.12, 0.25], [0.05, 0.12, -0.25],
      [-0.08, 0.12, 0.25], [-0.08, 0.12, -0.25],
      [-0.18, 0.12, 0.2], [-0.18, 0.12, -0.2],
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.18), legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      this.group.add(leg);
    }
  }

  _doChaseAI(dt, playerPos, dist) {
    const dx = playerPos[0] - this.position[0];
    const dz = playerPos[2] - this.position[2];
    this.aiTargetYaw = Math.atan2(-dx, -dz);
    this.yaw += (this.aiTargetYaw - this.yaw) * 0.08;
    if (dist > this.attackRange) {
      this.velocity[0] = -Math.sin(this.yaw) * this.speed;
      this.velocity[2] = -Math.cos(this.yaw) * this.speed;
      this._moveWithCollision(dt);
      if (this.onGround && this.velocity[1] >= -0.1) {
        this._jumpTimer -= dt;
        if (this._jumpTimer <= 0) {
          const ax = -Math.sin(this.yaw) * 0.4;
          const az = -Math.cos(this.yaw) * 0.4;
          const bx = Math.floor(this.position[0] + ax);
          const bz = Math.floor(this.position[2] + az);
          const by = Math.floor(this.position[1]);
          if (isSolid(this.world.getBlock(bx, by, bz))) {
            this.velocity[1] = 7;
            this._jumpTimer = 0.5;
          }
        }
      }
    } else { this.velocity[0] = 0; this.velocity[2] = 0; }
    if (this.aiTimer <= 0) { this.aiState = AI_IDLE; this.aiTimer = 2 + Math.random() * 3; }
  }

  getDrops() {
    const c = Math.floor(Math.random() * 2);
    if (c > 0) return [{ type: ITEM.SLIME_BALL, count: c }];
    return [];
  }
}

export { HostileMob, Zombie, Skeleton, Spider, Creeper, Enderman, Wolf, CaveSpider };
