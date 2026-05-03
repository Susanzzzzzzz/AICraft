// Weather module — Rain particle system using Three.js Points
import * as THREE from 'three';

const RAIN_AREA_WIDTH = 20;
const RAIN_AREA_HEIGHT = 15;
const RAIN_AREA_DEPTH = 20;
const DEFAULT_PARTICLE_COUNT = 2000;
const FALL_SPEED = 15; // blocks/second

export class WeatherManager {
  constructor() {
    this.isRaining = false;
    this.particleSystem = null;
    this.geometry = null;
    this.particleCount = DEFAULT_PARTICLE_COUNT;
    this.fallSpeed = FALL_SPEED;
    this.areaWidth = RAIN_AREA_WIDTH;
    this.areaHeight = RAIN_AREA_HEIGHT;
    this.areaDepth = RAIN_AREA_DEPTH;
  }

  init(scene) {
    this._createParticleSystem();
    scene.add(this.particleSystem);
  }

  _createParticleSystem() {
    const count = this.particleCount;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.areaWidth;
      positions[i * 3 + 1] = Math.random() * this.areaHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.areaDepth;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create a thin raindrop texture (canvas-based)
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(170, 221, 255, 0.6)';
    ctx.fillRect(1, 0, 2, 16);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: texture,
      transparent: true,
      opacity: 0.4,
      color: 0xAADDFF,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(this.geometry, material);
    this.particleSystem.visible = false;
  }

  start() {
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

    const positions = this.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= this.fallSpeed * dt;
      if (positions[i + 1] < 0) {
        positions[i + 1] = this.areaHeight;
        positions[i] = (Math.random() - 0.5) * this.areaWidth;
        positions[i + 2] = (Math.random() - 0.5) * this.areaDepth;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;

    // Follow player — center particle system at player position
    if (playerPosition) {
      this.particleSystem.position.set(
        playerPosition[0],
        playerPosition[1],
        playerPosition[2]
      );
    }
  }
}
