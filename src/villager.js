// Villager module — Annoying villager NPC
// Inspired by Minecraft villagers: big head, big nose, brown robe, "Hmm" sounds
import * as THREE from 'three';
import { isSolid } from './world.js';

const AI_IDLE = 0;
const AI_WANDER = 1;

/**
 * Create a 64x64 canvas texture with a Minecraft villager face.
 * Features: brown/tan skin, dark eyes, big pixel nose, brown robe collar.
 */
function _createVillagerFaceCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Skin tone background
  ctx.fillStyle = '#C4A882';
  ctx.fillRect(0, 0, 64, 64);

  // Hair / top of head
  ctx.fillStyle = '#4A3B2C';
  ctx.fillRect(0, 0, 64, 6);

  // Eyebrows
  ctx.fillStyle = '#5C4A32';
  ctx.fillRect(14, 10, 14, 3);
  ctx.fillRect(36, 10, 14, 3);

  // Eyes — two dark brown squares
  ctx.fillStyle = '#4A3B2C';
  ctx.fillRect(16, 16, 10, 7);
  ctx.fillRect(38, 16, 10, 7);

  // Pupils (darker)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(20, 18, 4, 5);
  ctx.fillRect(42, 18, 4, 5);

  // Eye highlight (small white dot)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(20, 18, 2, 2);
  ctx.fillRect(42, 18, 2, 2);

  // Big pixel nose — long rectangular nose, the key villager feature
  ctx.fillStyle = '#8B6F4E';
  ctx.fillRect(27, 24, 10, 16);

  // Nose shadow (left edge)
  ctx.fillStyle = '#7A5F42';
  ctx.fillRect(27, 24, 3, 16);

  // Nose highlight (center ridge)
  ctx.fillStyle = '#A88864';
  ctx.fillRect(30, 24, 4, 14);

  // Nostrils
  ctx.fillStyle = '#5C4A32';
  ctx.fillRect(29, 36, 3, 3);
  ctx.fillRect(33, 36, 3, 3);

  // Nose tip shadow
  ctx.fillStyle = '#7A5F42';
  ctx.fillRect(27, 38, 10, 3);

  // Robe collar at chin area
  ctx.fillStyle = '#3B2314';
  ctx.fillRect(8, 44, 48, 12);

  // Collar lighter fold
  ctx.fillStyle = '#5C3A21';
  ctx.fillRect(10, 44, 44, 3);

  // Collar V-neck detail
  ctx.fillStyle = '#2A1A0E';
  ctx.fillRect(27, 48, 10, 8);

  return canvas;
}

class Villager {
  constructor(world, position) {
    this.world = world;
    this.position = [...position];
    this.velocity = [0, 0, 0];
    this.yaw = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.animTime = 0;
    this.dead = false;
    this.isVillager = true;

    // Nearly invulnerable
    this.maxHealth = 9999;
    this.health = this.maxHealth;

    // Size
    this.width = 0.7;
    this.height = 1.8;
    this.speed = 0.7;

    // AI state
    this.aiState = AI_IDLE;
    this.aiTimer = 2 + Math.random() * 2;
    this.aiTargetYaw = this.yaw;

    // Sound cooldown (prevent spam)
    this._soundCooldown = 0;

    // Build the 3D model and name tag
    this.group = new THREE.Group();
    this._buildModel();
    this._createNameTag();
    this.group.traverse((child) => child.layers.set(1));
    this._updateGroupPosition();
  }

  _buildModel() {
    // Head with canvas-drawn villager face texture
    const faceCanvas = _createVillagerFaceCanvas();
    const texture = new THREE.CanvasTexture(faceCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const headMat = new THREE.MeshStandardMaterial({ map: texture });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
    head.position.set(0, 1.55, 0);
    this.group.add(head);

    // Body / Robe (brown)
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x5C3A21 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), bodyMat);
    body.position.set(0, 0.95, 0);
    this.group.add(body);

    // Robe belt/accent
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x3B2314 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.32), beltMat);
    belt.position.set(0, 0.7, 0);
    this.group.add(belt);

    // Arms
    const armMat = new THREE.MeshLambertMaterial({ color: 0x5C3A21 });
    for (let s = -1; s <= 1; s += 2) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), armMat);
      arm.position.set(s * 0.35, 0.9, 0);
      this.group.add(arm);
    }

    // Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2A1A0E });
    for (let s = -1; s <= 1; s += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), legMat);
      leg.position.set(s * 0.12, 0.17, 0);
      this.group.add(leg);
    }
  }

  _createNameTag() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    this._nameTagCanvas = canvas;
    const texture = new THREE.CanvasTexture(canvas);
    this._nameTagTexture = texture;
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, this.height + 0.3, 0);
    sprite.scale.set(1.2, 0.6, 1);
    sprite.layers.set(1);
    this._nameTagSprite = sprite;
    this._updateNameTagTexture();
    this.group.add(sprite);
  }

  _updateNameTagTexture() {
    if (!this._nameTagSprite || !this._nameTagCanvas) return;
    const ctx = this._nameTagCanvas.getContext('2d');
    const w = this._nameTagCanvas.width;
    const h = this._nameTagCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Name text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('村民', w / 2, 4);

    // Health bar background
    const barX = 14;
    const barY = 28;
    const barW = 100;
    const barH = 10;
    const radius = 3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this._roundRect(ctx, barX, barY, barW, barH, radius);
    ctx.fill();

    // Health bar fill (always full green — villager is invulnerable)
    const ratio = this.health / this.maxHealth;
    const fillW = Math.max(0, barW * ratio);
    ctx.fillStyle = '#4CAF50';
    this._roundRect(ctx, barX, barY, fillW, barH, radius);
    ctx.fill();

    // Health text
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(this.health)}/${this.maxHealth}`,
      barX + barW - 4,
      barY + barH / 2
    );

    this._nameTagTexture.needsUpdate = true;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _updateGroupPosition() {
    this.group.position.set(
      this.position[0],
      this.position[1],
      this.position[2]
    );
    this.group.rotation.y = this.yaw;
  }

  /** Play the classic Villager "Hmm" sound using Web Audio API. */
  _playHmmSound() {
    try {
      const actx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = actx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.3);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.15, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(actx.currentTime);
      osc.stop(actx.currentTime + 0.4);
    } catch (_e) {
      // Audio not available — silently ignore
    }
  }

  /**
   * takeDamage — villager is nearly invulnerable.
   * Ignores all damage, plays "Hmm" sound, always returns false.
   */
  takeDamage(amount) {
    if (this.dead) return false;
    this._playHmmSound();
    // Reset health to max — villager cannot die
    this.health = this.maxHealth;
    this._updateNameTagTexture();
    return false;
  }

  update(dt, playerPosition) {
    if (this.dead) return;
    this.animTime += dt;
    this._soundCooldown -= dt;

    // --- AI ---
    const distToPlayer = this._updateAI(dt, playerPosition);

    // --- Face the player when close ---
    if (playerPosition && distToPlayer !== undefined && distToPlayer < 4) {
      const dx = playerPosition[0] - this.position[0];
      const dz = playerPosition[2] - this.position[2];
      // Smoothly face toward player
      const targetYaw = Math.atan2(-dx, -dz);
      this.yaw += (targetYaw - this.yaw) * 0.08;
    }

    // --- "Hmm" sound logic ---
    if (playerPosition && distToPlayer !== undefined && distToPlayer < 6 && this._soundCooldown <= 0) {
      // ~5% chance per second to emit the annoying sound
      if (Math.random() < 0.05 * dt * 60) {
        this._playHmmSound();
        this._soundCooldown = 1.5;
      }
    }

    // --- Gravity ---
    this.velocity[1] += -25 * dt;
    this.position[1] += this.velocity[1] * dt;
    this._resolveCollisionY();

    // --- Walking animation (body sway) ---
    const isMoving =
      Math.abs(this.velocity[0]) > 0.05 || Math.abs(this.velocity[2]) > 0.05;
    if (isMoving) {
      const sway = Math.sin(this.animTime * 4) * 0.08;
      this.group.rotation.z = sway;
    } else {
      this.group.rotation.z *= 0.85; // smooth decay back to neutral
    }

    this._updateGroupPosition();
  }

  /**
   * Wander AI: IDLE then WANDER to a random nearby point, then IDLE again.
   * Returns distance to player (if playerPosition provided).
   */
  _updateAI(dt, playerPosition) {
    this.aiTimer -= dt;

    const dx = playerPosition
      ? playerPosition[0] - this.position[0]
      : 0;
    const dz = playerPosition
      ? playerPosition[2] - this.position[2]
      : 0;
    const distToPlayer = playerPosition
      ? Math.sqrt(dx * dx + dz * dz)
      : undefined;

    switch (this.aiState) {
      case AI_IDLE:
        this.velocity[0] = 0;
        this.velocity[2] = 0;
        if (this.aiTimer <= 0) {
          // Pick random wander direction and distance
          const angle = Math.random() * Math.PI * 2;
          this.aiTargetYaw = Math.atan2(-Math.sin(angle), -Math.cos(angle));
          this.aiState = AI_WANDER;
          this.aiTimer = 2 + Math.random() * 3;
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

        // Bumped into a wall — go idle
        if (this.velocity[0] === 0 || this.velocity[2] === 0) {
          this.aiState = AI_IDLE;
          this.aiTimer = 1 + Math.random() * 2;
        }

        // Wander timer expired — go idle
        if (this.aiTimer <= 0) {
          this.aiState = AI_IDLE;
          this.aiTimer = 2 + Math.random() * 4;
        }

        // Stay within world bounds
        if (
          this.position[0] < 2 ||
          this.position[0] > this.world.width - 2 ||
          this.position[2] < 2 ||
          this.position[2] > this.world.depth - 2
        ) {
          this.aiTargetYaw += Math.PI;
          this.aiState = AI_IDLE;
          this.aiTimer = 1;
        }
        break;
    }

    return distToPlayer;
  }

  // --- Collision helpers (same pattern as PassiveAnimal / HostileMob) ---

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
            this.velocity[0] = 0;
            return;
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
            this.velocity[2] = 0;
            return;
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

  /** Remove the name tag sprite from the scene group. */
  _disposeNameTag() {
    if (this._nameTagSprite) {
      if (this._nameTagSprite.material) {
        this._nameTagSprite.material.dispose();
      }
      this.group.remove(this._nameTagSprite);
      this._nameTagSprite = null;
    }
    if (this._nameTagTexture) {
      this._nameTagTexture.dispose();
      this._nameTagTexture = null;
    }
    this._nameTagCanvas = null;
  }

  /** Axis-aligned bounding box for collision / interaction queries. */
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
}

export { Villager };
