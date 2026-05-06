// Renderer module — Three.js scene, InstancedMesh, sky, lights
import * as THREE from 'three';
import { World, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH, CHUNK_SIZE, CHUNK_HEIGHT, BLOCK, BLOCK_COLORS, BLOCK_OPACITY, MAX_BLOCK_TYPE } from './world.js';
import { getBlockMaterial } from './textures.js';

export class Renderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.meshes = {}; // blockType -> InstancedMesh (non-chunk mode)
    this.blockGeometry = null;
    this.highlightMesh = null;
    this.ambientLight = null;
    this.directionalLight = null;
    this.timeOfDay = 0.25;
    this.swampFogActive = false;
    this._defaultFogColor = 0x87CEEB;
    this._defaultFogNear = 60;
    this._defaultFogFar = 180;

    // Explore skill temporary highlights
    this._exploreHighlights = [];

    // Chunk mode
    this.useChunks = false;
    this.world = null;
    this.chunkMeshData = new Map(); // "cx,cz" -> { meshes: Map<type -> InstancedMesh>, chunk: Chunk }
    this.chunkBBoxes = new Map();   // "cx,cz" -> THREE.Box3

    // Frustum culling
    this.frustum = new THREE.Frustum();
    this._projScreenMatrix = new THREE.Matrix4();

    // LOD settings
    this.fullDetailChunks = 4;  // chunks within this range get full detail
    this.lodChunks = 8;         // chunks within this range get merged LOD
    this.farChunks = 11;        // chunks beyond this are not rendered (fog)

    // Dungeon lighting
    this._dungeonLights = [];   // PointLight objects for torches
    this._dungeonLightMeshes = []; // Small glow meshes for torches
    // Destruction particles
    this._particles = [];
    this._lastParticleTime = 0;

    // Break progress visuals
    this._breakOverlay = null;
    this._breakProgressBar = null;
    this._breakProgressFill = null;
    this._initBreakVisuals();
  }

  _initBreakVisuals() {
    // Darkening overlay (BoxGeometry 1.002)
    const overlayGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const overlayMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      renderOrder: 1,
    });
    this._breakOverlay = new THREE.Mesh(overlayGeo, overlayMat);
    this._breakOverlay.visible = false;
    this.scene.add(this._breakOverlay);

    // Progress bar background (0.8 × 0.06)
    const barBgGeo = new THREE.PlaneGeometry(0.8, 0.06);
    const barBgMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      renderOrder: 2,
    });
    this._breakProgressBar = new THREE.Mesh(barBgGeo, barBgMat);
    this._breakProgressBar.visible = false;
    this.scene.add(this._breakProgressBar);

    // Progress bar fill (0.76 × 0.04, pivot at left edge)
    const fillGeo = new THREE.PlaneGeometry(0.76, 0.04);
    fillGeo.translate(0.38, 0, 0); // pivot at left edge
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      renderOrder: 3,
    });
    this._breakProgressFill = new THREE.Mesh(fillGeo, fillMat);
    this._breakProgressFill.visible = false;
    this.scene.add(this._breakProgressFill);
  }

  showBreaking(position, progress) {
    if (!position) {
      this._breakOverlay.visible = false;
      this._breakProgressBar.visible = false;
      this._breakProgressFill.visible = false;
      return;
    }
    const x = position[0] + 0.5;
    const y = position[1] + 0.5;
    const z = position[2] + 0.5;

    this._breakOverlay.position.set(x, y, z);
    this._breakOverlay.material.opacity = progress * 0.55;
    this._breakOverlay.visible = true;

    const barY = position[1] + 1.15;
    this._breakProgressBar.position.set(x, barY, z);
    this._breakProgressBar.visible = true;

    this._breakProgressFill.position.set(x - 0.38, barY, z);
    this._breakProgressFill.scale.x = Math.max(0.001, progress);
    // Color gradient: white→yellow→orange→red→dark red
    const p = progress;
    let color;
    if (p < 0.25) color = new THREE.Color(0xffffff).lerp(new THREE.Color(0xFFEB3B), p / 0.25);
    else if (p < 0.5) color = new THREE.Color(0xFFEB3B).lerp(new THREE.Color(0xFF9800), (p - 0.25) / 0.25);
    else if (p < 0.75) color = new THREE.Color(0xFF9800).lerp(new THREE.Color(0xF44336), (p - 0.5) / 0.25);
    else color = new THREE.Color(0xF44336).lerp(new THREE.Color(0xB71C1C), (p - 0.75) / 0.25);
    this._breakProgressFill.material.color.copy(color);
    this._breakProgressFill.visible = true;
  }

  init(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 180);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.layers.enable(1); // Steve model parts are on layer 1

    this.orthoCamera = new THREE.OrthographicCamera(
      -window.innerWidth / 200, window.innerWidth / 200,
      window.innerHeight / 200, -window.innerHeight / 200,
      0.1, 300
    );
    this.orthoCamera.layers.enable(1);
    this.orthoActive = false;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ambientLight = new THREE.AmbientLight(0x8899aa, 0.5);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4CAF50, 0.3);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(1, 1.5, 0.5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.scene.add(this.directionalLight);

    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Block highlight
    const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      const hw = window.innerWidth / 200;
      const hh = window.innerHeight / 200;
      this.orthoCamera.left = -hw;
      this.orthoCamera.right = hw;
      this.orthoCamera.top = hh;
      this.orthoCamera.bottom = -hh;
      this.orthoCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // === Build meshes (entry point) ===
  buildMeshes(world) {
    this.world = world;
    if (world.useChunks) {
      this.useChunks = true;
      this._clearChunkMeshes();
      this._buildChunkMeshes(world);
    } else {
      this.useChunks = false;
      for (const type in this.meshes) {
        const m = this.meshes[type];
        this.scene.remove(m);
        if (m) m.dispose();
      }
      this.meshes = {};
      const counts = world.getBlockCounts();
      for (let type = 1; type <= MAX_BLOCK_TYPE; type++) {
        this._buildTypeMesh(world, type, counts[type] || 0);
      }
    }
  }

  // === Update dirty meshes ===
  updateDirtyMeshes(world) {
    this.world = world;
    if (world.useChunks) {
      this._updateChunkMeshes(world);
      return;
    }
    if (world.dirtyTypes.size === 0) return;
    const types = [...world.dirtyTypes];
    let rebuilt = 0;
    for (const type of types) {
      if (type === BLOCK.AIR) continue;
      world.dirtyTypes.delete(type);
      this._buildTypeMesh(world, type);
      rebuilt++;
      if (rebuilt >= 2) break;
    }
  }

  // === Chunk mesh management ===
  _clearChunkMeshes() {
    for (const [key, data] of this.chunkMeshData) {
      for (const mesh of data.meshes.values()) {
        this.scene.remove(mesh);
        this._disposeMesh(mesh);
      }
    }
    this.chunkMeshData.clear();
    this.chunkBBoxes.clear();
  }

  _disposeMesh(mesh) {
    if (mesh.material) {
      mesh.material.dispose();
    }
    mesh.dispose();
  }

  _buildChunkMeshes(world) {
    const chunks = world.chunkManager.getAllLoadedChunks();
    for (const chunk of chunks) {
      this._buildChunk(chunk, world);
    }
  }

  _buildChunk(chunk, world) {
    const key = `${chunk.cx},${chunk.cz}`;
    const wx0 = chunk.cx * CHUNK_SIZE;
    const wz0 = chunk.cz * CHUNK_SIZE;

    const distToPlayer = this._chunkDistToPlayer(chunk);
    const useLOD = distToPlayer > this.fullDetailChunks && distToPlayer <= this.lodChunks;

    const meshesByType = new Map();
    const dummy = new THREE.Object3D();

    if (useLOD) {
      // LOD mode: 2x2x2 merged blocks
      for (let lx = 0; lx < CHUNK_SIZE; lx += 2) {
        for (let ly = 0; ly < CHUNK_HEIGHT; ly += 2) {
          for (let lz = 0; lz < CHUNK_SIZE; lz += 2) {
            let hasSolid = false;
            let dominantType = BLOCK.AIR;
            let solidCount = 0;
            for (let dx = 0; dx < 2; dx++) {
              for (let dy = 0; dy < 2; dy++) {
                for (let dz = 0; dz < 2; dz++) {
                  const type = chunk.getBlock(lx + dx, ly + dy, lz + dz);
                  if (type !== BLOCK.AIR && type !== BLOCK.WATER) {
                    hasSolid = true;
                    solidCount++;
                    if (dominantType === BLOCK.AIR) dominantType = type;
                  }
                }
              }
            }
            if (!hasSolid || solidCount < 4) continue;

            const wx = wx0 + lx;
            const wz = wz0 + lz;

            if (!meshesByType.has(dominantType)) {
              meshesByType.set(dominantType, []);
            }
            meshesByType.get(dominantType).push({ wx, wy: ly, wz, scale: 2 });
          }
        }
      }
    } else {
      // Full detail mode
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const type = chunk.getBlock(lx, ly, lz);
            if (type === BLOCK.AIR || type === BLOCK.TORCH) continue;
            const wx = wx0 + lx;
            const wz = wz0 + lz;
            if (!world.isExposed(wx, ly, wz)) continue;
            if (!meshesByType.has(type)) {
              meshesByType.set(type, []);
            }
            meshesByType.get(type).push({ wx, wy: ly, wz, scale: 1 });
          }
        }
      }
    }

    // Remove old meshes for this chunk
    if (this.chunkMeshData.has(key)) {
      const oldData = this.chunkMeshData.get(key);
      for (const mesh of oldData.meshes.values()) {
        this.scene.remove(mesh);
        this._disposeMesh(mesh);
      }
    }

    // Create new meshes
    const meshMap = new Map();
    for (const [type, positions] of meshesByType) {
      if (positions.length === 0) continue;
      const material = getBlockMaterial(type);
      const scale = positions[0].scale || 1;
      const geo = (scale === 1) ? this.blockGeometry : new THREE.BoxGeometry(scale, scale, scale);
      const mesh = new THREE.InstancedMesh(geo, material, positions.length);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const s = p.scale || 1;
        dummy.position.set(p.wx + s / 2, p.wy + s / 2, p.wz + s / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = positions.length;
      this.scene.add(mesh);
      meshMap.set(type, mesh);
    }

    this.chunkMeshData.set(key, { meshes: meshMap, chunk });

    // Precompute bounding box for frustum culling
    const bbox = new THREE.Box3(
      new THREE.Vector3(wx0, 0, wz0),
      new THREE.Vector3(wx0 + CHUNK_SIZE, CHUNK_HEIGHT, wz0 + CHUNK_SIZE)
    );
    this.chunkBBoxes.set(key, bbox);

    chunk.dirty = false;
  }

  _chunkDistToPlayer(chunk) {
    if (!this.world || !this.camera) return 0;
    const cx = chunk.cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    const cz = chunk.cz * CHUNK_SIZE + CHUNK_SIZE / 2;
    const dx = cx - this.camera.position.x;
    const dz = cz - this.camera.position.z;
    return Math.sqrt(dx * dx + dz * dz) / CHUNK_SIZE;
  }

  _updateChunkMeshes(world) {
    const loadedKeys = new Set();
    const chunks = world.chunkManager.getAllLoadedChunks();

    for (const chunk of chunks) {
      const key = `${chunk.cx},${chunk.cz}`;
      loadedKeys.add(key);
      if (chunk.dirty) {
        this._buildChunk(chunk, world);
      }
    }

    // Remove meshes for unloaded chunks
    for (const [key, data] of this.chunkMeshData) {
      if (!loadedKeys.has(key)) {
        for (const mesh of data.meshes.values()) {
          this.scene.remove(mesh);
          this._disposeMesh(mesh);
        }
        this.chunkMeshData.delete(key);
        this.chunkBBoxes.delete(key);
      }
    }
  }

  // === Frustum culling ===
  _updateFrustum() {
    this._projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this._projScreenMatrix);
  }

  _applyFrustumCulling() {
    this._updateFrustum();
    for (const [key, data] of this.chunkMeshData) {
      const bbox = this.chunkBBoxes.get(key);
      const visible = bbox && this.frustum.intersectsBox(bbox);
      for (const mesh of data.meshes.values()) {
        mesh.visible = visible;
      }
    }
  }

  // === LOD distance-based culling ===
  _applyLODCulling() {
    for (const [key, data] of this.chunkMeshData) {
      const dist = this._chunkDistToPlayer(data.chunk);
      if (dist > this.lodChunks) {
        for (const mesh of data.meshes.values()) {
          mesh.visible = false;
        }
      }
    }
  }

  // === Dungeon lighting ===
  _clearDungeonLights() {
    for (const light of this._dungeonLights) {
      this.scene.remove(light);
    }
    this._dungeonLights = [];
    for (const mesh of this._dungeonLightMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this._dungeonLightMeshes = [];
  }

  setupDungeonLights(world) {
    this._clearDungeonLights();
    if (!world.useChunks || !world._torchPositions) return;

    for (const pos of world._torchPositions) {
      const light = new THREE.PointLight(0xFF6600, 0.8, 8);
      light.position.set(pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5);
      this.scene.add(light);
      this._dungeonLights.push(light);

      // Small glow mesh at torch
      const glowGeo = new THREE.SphereGeometry(0.15, 6, 6);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF8800 });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5);
      this.scene.add(glowMesh);
      this._dungeonLightMeshes.push(glowMesh);
    }
  }

  // === Legacy methods ===
  _buildTypeMesh(world, type, preCount) {
    const positions = world.getExposedPositions(type);
    const count = preCount !== undefined ? preCount : positions.length;

    if (this.meshes[type]) {
      this.scene.remove(this.meshes[type]);
      const oldMesh = this.meshes[type];
      if (oldMesh.material) oldMesh.material.dispose();
      oldMesh.dispose();
    }

    if (count === 0) {
      this.meshes[type] = null;
      return;
    }

    const material = getBlockMaterial(type);
    const mesh = new THREE.InstancedMesh(this.blockGeometry, material, count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = positions[i];
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = positions.length;
    this.scene.add(mesh);
    this.meshes[type] = mesh;
  }

  showHighlight(position) {
    if (position) {
      this.highlightMesh.position.set(position[0] + 0.5, position[1] + 0.5, position[2] + 0.5);
      this.highlightMesh.visible = true;
    } else {
      this.highlightMesh.visible = false;
    }
  }

  setSwampFog(active) {
    this.swampFogActive = active;
    if (active) {
      this.scene.fog = new THREE.FogExp2(0x88AACC, 0.03);
    } else {
      this.scene.fog = new THREE.Fog(this._defaultFogColor, this._defaultFogNear, this._defaultFogFar);
      if (this.scene.background) {
        this.scene.fog.color.copy(this.scene.background);
      }
    }
  }

  updateDaylight(timeOfDay) {
    this.timeOfDay = timeOfDay;
    const t = timeOfDay;

    const nightColor = new THREE.Color(0x0a0a1e);
    const sunriseColor = new THREE.Color(0xff9e5e);
    const noonColor = new THREE.Color(0x87CEEB);
    const sunsetColor = new THREE.Color(0xff6b35);

    let skyColor;
    if (t < 0.25) {
      const p = t / 0.25;
      skyColor = nightColor.clone().lerp(sunriseColor, p);
    } else if (t < 0.5) {
      const p = (t - 0.25) / 0.25;
      skyColor = sunriseColor.clone().lerp(noonColor, p);
    } else if (t < 0.75) {
      const p = (t - 0.5) / 0.25;
      skyColor = noonColor.clone().lerp(sunsetColor, p);
    } else {
      const p = (t - 0.75) / 0.25;
      skyColor = sunsetColor.clone().lerp(nightColor, p);
    }

    this.scene.background = skyColor;
    if (this.scene.fog && !this.swampFogActive) {
      this.scene.fog.color.copy(skyColor);
    }

    let lightIntensity;
    if (t < 0.25) {
      lightIntensity = 0.1 + 0.9 * (t / 0.25);
    } else if (t < 0.5) {
      lightIntensity = 1.0;
    } else if (t < 0.75) {
      lightIntensity = 1.0 - 0.9 * ((t - 0.5) / 0.25);
    } else {
      lightIntensity = 0.1;
    }
    this.directionalLight.intensity = lightIntensity;
    this.ambientLight.intensity = 0.3 + 0.4 * lightIntensity;
  }

  highlightTemporaryBlocks(positions, durationSeconds = 3, color = 0x00FF00) {
    if (!positions || positions.length === 0) return;

    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < positions.length; i++) {
      dummy.position.set(positions[i][0] + 0.5, positions[i][1] + 0.5, positions[i][2] + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(mesh);
    this._exploreHighlights.push({
      mesh,
      expireTime: performance.now() + durationSeconds * 1000,
    });
  }

  _cleanupExpiredHighlights() {
    if (this._exploreHighlights.length === 0) return;
    const now = performance.now();
    this._exploreHighlights = this._exploreHighlights.filter(h => {
      if (now >= h.expireTime) {
        this.scene.remove(h.mesh);
        h.mesh.geometry.dispose();
        h.mesh.material.dispose();
        return false;
      }
      return true;
    });
  }

  toggleOrtho() {
    this.orthoActive = !this.orthoActive;
    return this.orthoActive;
  }

  spawnDestructionParticles(position, color) {
    const count = 8;
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position[0] + 0.5 + (Math.random() - 0.5) * 0.3,
        position[1] + 0.5 + (Math.random() - 0.5) * 0.3,
        position[2] + 0.5 + (Math.random() - 0.5) * 0.3
      );
      const speed = 2 + Math.random() * 3;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random(),
        Math.random() - 0.5
      ).normalize().multiplyScalar(speed);
      this.scene.add(mesh);
      this._particles.push({ mesh, vel: dir, life: 0.6 + Math.random() * 0.4 });
    }
    geo.dispose();
  }

  _updateParticles(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this._particles.splice(i, 1);
        continue;
      }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.vel.y -= 9.8 * dt; /* gravity */
      p.mesh.scale.setScalar(p.life); /* shrink over time */
    }
  }
  // === Entity shadow helpers ===
  enableShadowsOnGroup(group) {
    group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  render() {
    this._cleanupExpiredHighlights();

    if (this._particles.length > 0) {
      const now = performance.now();
      const dt = this._lastParticleTime ? Math.min((now - this._lastParticleTime) / 1000, 0.05) : 0.016;
      this._lastParticleTime = now;
      this._updateParticles(dt);
    }

    // Billboard: make progress bar face camera
    if (this._breakProgressBar && this._breakProgressBar.visible) {
      this._breakProgressBar.lookAt(this.camera.position);
      this._breakProgressFill.lookAt(this.camera.position);
    }

    if (this.useChunks) {
      this._applyLODCulling();
      this._applyFrustumCulling();
    }

    if (this.orthoActive) {
      this.orthoCamera.position.copy(this.camera.position);
      this.orthoCamera.quaternion.copy(this.camera.quaternion);
      this.renderer.render(this.scene, this.orthoCamera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
