// Character Preview — 3D角色预览模块 (启动/暂停界面)
import * as THREE from 'three';
import { SteveModel } from './steve.js';
import { Pet } from './pet.js';
import { ROLES, getRole } from './role.js';

export class CharacterPreview {
  constructor(skinManager, bodyProps) {
    this.skinManager = skinManager;
    this.bodyProps = bodyProps || {};
    this.visible = false;

    // Three.js objects
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.previewSteve = null;
    this._previewPet = null;
    this._currentPreviewRole = null;

    // Animation
    this.autoRotateSpeed = 0.3; // radians/sec (~21s per revolution)
    this.animTime = 0;

    // Independent rAF for start screen
    this._rafId = null;
    this._lastTime = 0;
    this._selfDriven = false;
  }

  init(container) {
    if (!container) return;

    // Create preview canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'preview-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 300;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene — sky gradient background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    // Camera — front-facing, slightly above, looking at model center
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    this.camera.layers.enable(1); // Steve model parts are on layer 1
    this.camera.position.set(0, 1.2, 3.5);
    this.camera.lookAt(0, 0.9, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(2, 3, 2);
    this.scene.add(directional);

    // Steve model (independent instance for preview)
    this.previewSteve = new SteveModel(this.bodyProps);
    this.previewSteve.setVisible(true);
    this.previewSteve.group.position.set(0, 0, 0);
    this.scene.add(this.previewSteve.group);

    // Apply default skin
    this.skinManager.applySkin(this.previewSteve, this.skinManager.getCurrentSkin());

    // Handle container resize
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(container);
  }

  _onResize() {
    const container = this.canvas?.parentElement;
    if (!container || !this.camera || !this.renderer) return;

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 300;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  syncSkin(skinName) {
    if (this.previewSteve && this.skinManager) {
      this.skinManager.applySkin(this.previewSteve, skinName);
    }
  }

  /** Rebuild the preview model with new body proportions */
  rebuildModel(bodyProps) {
    if (this.previewSteve) {
      this.previewSteve.rebuild(bodyProps);
      this.bodyProps = bodyProps;
    }
  }

  /** Set a pet in the preview scene at a fixed display position */
  setPet(petType) {
    // Remove existing preview pet
    if (this._previewPet) {
      this._previewPet.remove();
      this._previewPet = null;
    }
    if (petType && this.scene) {
      this._previewPet = new Pet(petType, this.scene);
      // Position pet slightly to the side of Steve for display
      this._previewPet.group.position.set(0.8, 0.3, 0.8);
    }
  }

  /** Switch to a different role for preview */
  setRole(roleId) {
    if (this._currentPreviewRole === roleId) return;
    this._currentPreviewRole = roleId;
    const role = getRole(roleId);
    if (!role) return;
    this.rebuildModel(role.proportions);
    this.skinManager.applySkin(this.previewSteve, roleId);
    this.setPet(role.pet);
  }

  /** Move the preview canvas to a different container element */
  setContainer(newContainer) {
    if (!newContainer || !this.canvas) return;
    // Remove from current parent
    const oldParent = this.canvas.parentElement;
    if (oldParent) {
      oldParent.removeChild(this.canvas);
    }
    // Add to new container
    newContainer.appendChild(this.canvas);
    // Re-assign resize observer to the new container
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(newContainer);
    // Trigger resize to adapt to new container dimensions
    this._onResize();
  }

  /** Get the current container element of the preview canvas */
  getContainer() {
    return this.canvas?.parentElement || null;
  }

  show() {
    if (this.visible) return;
    this.visible = true;

    if (this.canvas) {
      this.canvas.style.display = 'block';
    }

    // If game loop is not running (start screen), drive our own rAF
    this._startSelfDriven();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    if (this.canvas) {
      this.canvas.style.display = 'none';
    }

    this._stopSelfDriven();
  }

  update(dt) {
    if (!this.visible) return;

    // Auto-rotate steve
    this.animTime += dt;
    if (this.previewSteve) {
      this.previewSteve.group.rotation.y += this.autoRotateSpeed * dt;

      // Idle breathing animation
      const breathScale = 1.0 + Math.sin(this.animTime * 2) * 0.01;
      this.previewSteve.group.scale.set(breathScale, breathScale, breathScale);

      // Update steve internal animation (idle arm swing)
      this.previewSteve.updateAnimation(dt, false);
    }

    // Update preview pet animation (with fixed position, no player following)
    if (this._previewPet) {
      this._previewPet.update(dt, [0, 0, 0], 0);
    }

    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // --- Self-driven rAF loop (for start screen, before game loop starts) ---

  _startSelfDriven() {
    if (this._selfDriven) return;
    this._selfDriven = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._selfDrivenLoop(t));
  }

  _stopSelfDriven() {
    this._selfDriven = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _selfDrivenLoop(time) {
    if (!this._selfDriven) return;

    const dt = Math.min((time - this._lastTime) / 1000, 0.1);
    this._lastTime = time;

    this.update(dt);

    this._rafId = requestAnimationFrame((t) => this._selfDrivenLoop(t));
  }

  /**
   * Switch from self-driven rAF to game-loop driven updates.
   * Called when the game starts running.
   */
  switchToGameDriven() {
    this._stopSelfDriven();
  }

  /**
   * Switch back to self-driven rAF.
   * Called when returning to the overlay (pause/start screen).
   */
  switchToSelfDriven() {
    if (this.visible) {
      this._startSelfDriven();
    }
  }

  dispose() {
    this._stopSelfDriven();
    if (this._previewPet) {
      this._previewPet.remove();
      this._previewPet = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
