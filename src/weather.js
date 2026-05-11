// Weather module — Rain/Snow/Blossom particle system using Three.js Points
import * as THREE from 'three';

const RAIN_AREA_WIDTH = 20;
const RAIN_AREA_HEIGHT = 15;
const RAIN_AREA_DEPTH = 20;
const DEFAULT_PARTICLE_COUNT = 2000;
const RAIN_FALL_SPEED = 15; // blocks/second
const SNOW_FALL_SPEED = 4;
const BLOSSOM_FALL_SPEED = 2.5;

const WEATHER_CONFIG = {
  rain: {
    particleCount: 2000,
    fallSpeed: RAIN_FALL_SPEED,
    size: 0.12,
    color: 0xAADDFF,
    opacity: 0.4,
    texture: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(170, 221, 255, 0.6)';
      ctx.fillRect(1, 0, 2, h);
    },
    drift: 0,
  },
  snow: {
    particleCount: 1500,
    fallSpeed: SNOW_FALL_SPEED,
    size: 0.15,
    color: 0xFFFFFF,
    opacity: 0.6,
    texture: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
    },
    drift: 1.5,
  },
  blossom: {
    particleCount: 800,
    fallSpeed: BLOSSOM_FALL_SPEED,
    size: 0.18,
    color: 0xFFB7C5,
    opacity: 0.5,
    texture: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(255, 183, 197, 0.7)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
    },
    drift: 2.0,
  },
};

export class WeatherManager {
  constructor() {
    this.isRaining = false;
    this.particleSystem = null;
    this.geometry = null;
    this._type = 'rain';
    this._config = WEATHER_CONFIG.rain;
    this.particleCount = DEFAULT_PARTICLE_COUNT;
    this.fallSpeed = RAIN_FALL_SPEED;
    this.areaWidth = RAIN_AREA_WIDTH;
    this.areaHeight = RAIN_AREA_HEIGHT;
    this.areaDepth = RAIN_AREA_DEPTH;
    this._time = 0;
  }

  init(scene) {
    this._createParticleSystem();
    scene.add(this.particleSystem);
  }

  _createParticleSystem() {
    const cfg = this._config;
    const count = cfg.particleCount;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.areaWidth;
      positions[i * 3 + 1] = Math.random() * this.areaHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.areaDepth;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create texture based on weather type
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    cfg.texture(ctx, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: cfg.size,
      map: texture,
      transparent: true,
      opacity: cfg.opacity,
      color: cfg.color,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(this.geometry, material);
    this.particleSystem.visible = false;
  }

  start(type) {
    if (type && type !== this._type) {
      if (!WEATHER_CONFIG[type]) {
        console.warn(`Unknown weather type: "${type}", falling back to rain`);
      }
      this._type = type;
      this._config = WEATHER_CONFIG[type] || WEATHER_CONFIG.rain;
      this.fallSpeed = this._config.fallSpeed;
      // Rebuild particle system with new config
      if (this.particleSystem && this.particleSystem.parent) {
        const parent = this.particleSystem.parent;
        // Dispose old GPU resources before creating new ones
        if (this.geometry) this.geometry.dispose();
        if (this.particleSystem.material) {
          if (this.particleSystem.material.map) this.particleSystem.material.map.dispose();
          this.particleSystem.material.dispose();
        }
        parent.remove(this.particleSystem);
        this._createParticleSystem();
        parent.add(this.particleSystem);
      }
    }
    this.isRaining = true;
    if (this.particleSystem) {
      this.particleSystem.visible = true;
    }
  }

  stop() {
    this.isRaining = false;
    if (this.particleSystem) {
      this.particleSystem.visible = false;
    }
  }

  update(dt, playerPosition) {
    if (!this.isRaining || !this.geometry) return;

    this._time += dt;
    const cfg = this._config;
    const positions = this.geometry.attributes.position.array;
    const drift = cfg.drift || 0;

    for (let i = 0; i < positions.length; i += 3) {
      // Vertical fall
      positions[i + 1] -= this.fallSpeed * dt;

      // Horizontal drift (snow, blossom)
      if (drift > 0) {
        positions[i] += Math.sin(this._time + i) * drift * dt * 0.5;
        positions[i + 2] += Math.cos(this._time * 0.7 + i * 1.3) * drift * dt * 0.5;
      }

      // Reset at bottom
      if (positions[i + 1] < 0) {
        positions[i + 1] = this.areaHeight;
        positions[i] = (Math.random() - 0.5) * this.areaWidth;
        positions[i + 2] = (Math.random() - 0.5) * this.areaDepth;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;

    // Follow player
    if (playerPosition) {
      this.particleSystem.position.set(
        playerPosition[0],
        playerPosition[1],
        playerPosition[2]
      );
    }
  }
}
