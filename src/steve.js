// Steve model — BoxGeometry composite with pivot mechanism
// Now parameterized by body proportions for role system
import * as THREE from 'three';
import { buildWeaponMesh, getWeapon } from './weapons.js';

const DEFAULT_PROPS = {
  headWidth: 0.50, headHeight: 0.50, headDepth: 0.50,
  bodyWidth: 0.50, bodyHeight: 0.75, bodyDepth: 0.30,
  armWidth: 0.25, armHeight: 0.75, armDepth: 0.25,
  legWidth: 0.25, legHeight: 0.75, legDepth: 0.25,
};

export class SteveModel {
  constructor(bodyProps) {
    this.props = { ...DEFAULT_PROPS, ...bodyProps };
    this.group = new THREE.Group();
    this.parts = {};
    this.pivots = {};
    this.weaponModel = null;
    this.animTime = 0;

    this.animState = 'idle';
    this.animTimer = 0;
    this.animCallback = null;
    this.animExecuted = false;

    this._buildModel(this.props);
  }

  _buildModel(props) {
    const {
      headWidth, headHeight, headDepth,
      bodyWidth, bodyHeight, bodyDepth,
      armWidth, armHeight, armDepth,
      legWidth, legHeight, legDepth,
    } = props;

    const skinColor = 0xC8956C;
    const shirtColor = 0x00AAAA;
    const pantsColor = 0x2B2B7F;
    const hairColor = 0x4A3728;

    // ---- Head ----
    const headGeo = new THREE.BoxGeometry(headWidth, headHeight, headDepth);
    const headMat = new THREE.MeshLambertMaterial({ color: skinColor });

    // --- Visual Enhancement: Canvas-based face texture with eyes and mouth ---
    {
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = 64;
      faceCanvas.height = 64;
      const fctx = faceCanvas.getContext('2d');
      // Skin base
      fctx.fillStyle = '#C8956C';
      fctx.fillRect(0, 0, 64, 64);
      // Hair area (top)
      fctx.fillStyle = '#4A3728';
      fctx.fillRect(0, 0, 64, 20);
      fctx.fillRect(0, 0, 8, 28);
      fctx.fillRect(56, 0, 8, 28);
      // Eye whites
      fctx.fillStyle = '#FFFFFF';
      fctx.fillRect(17, 22, 10, 6);
      fctx.fillRect(37, 22, 10, 6);
      // Pupils
      fctx.fillStyle = '#000000';
      fctx.fillRect(19, 23, 6, 4);
      fctx.fillRect(39, 23, 6, 4);
      // Mouth
      fctx.fillRect(24, 34, 16, 3);

      const faceTexture = new THREE.CanvasTexture(faceCanvas);
      faceTexture.magFilter = THREE.NearestFilter;
      faceTexture.minFilter = THREE.NearestFilter;
      headMat.map = faceTexture;
    }

    this.parts.head = new THREE.Mesh(headGeo, headMat);
    this.parts.head.position.set(0, legHeight + bodyHeight + headHeight / 2, 0);
    this.group.add(this.parts.head);

    // Hair (scaled slightly to match head size)
    const hairGeo = new THREE.BoxGeometry(headWidth + 0.02, headHeight * 0.52, headDepth + 0.02);
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, headHeight * 0.26, -0.02);
    this.parts.head.add(hair);

    // ---- Body ----
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    this.parts.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.parts.body.position.set(0, legHeight + bodyHeight / 2, 0);
    this.group.add(this.parts.body);

    // --- Visual Enhancement: Neck transition (small box between head and body) ---
    const neckGeo = new THREE.BoxGeometry(0.2, 0.08, 0.2);
    const neckMat = new THREE.MeshLambertMaterial({ color: skinColor });
    this.parts.neck = new THREE.Mesh(neckGeo, neckMat);
    this.parts.neck.position.set(0, legHeight + bodyHeight + 0.04, 0);
    this.group.add(this.parts.neck);

    // --- Visual Enhancement: Shoulder slope geometry ---
    const shoulderGeo = new THREE.BoxGeometry(0.32, 0.06, 0.2);
    const shoulderMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    // Left shoulder (sloped outward)
    this.parts.shoulder_L = new THREE.Mesh(shoulderGeo, shoulderMat);
    this.parts.shoulder_L.position.set(-(bodyWidth / 2 + armWidth / 2 - 0.05), legHeight + bodyHeight + 0.03, 0);
    this.parts.shoulder_L.rotation.z = 0.35;
    this.group.add(this.parts.shoulder_L);
    // Right shoulder (sloped outward)
    this.parts.shoulder_R = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
    this.parts.shoulder_R.position.set(bodyWidth / 2 + armWidth / 2 - 0.05, legHeight + bodyHeight + 0.03, 0);
    this.parts.shoulder_R.rotation.z = -0.35;
    this.group.add(this.parts.shoulder_R);

    // ---- Left arm ----
    const armGeo = new THREE.BoxGeometry(armWidth, armHeight, armDepth);
    const armMat = new THREE.MeshLambertMaterial({ color: skinColor });
    this.parts.arm_L = new THREE.Mesh(armGeo, armMat);
    this.parts.arm_L.position.set(0, -armHeight / 2, 0); // Offset so pivot is at top (shoulder)

    const armPivotL = new THREE.Group();
    armPivotL.position.set(-(bodyWidth / 2 + armWidth / 2), legHeight + bodyHeight, 0); // Shoulder
    armPivotL.add(this.parts.arm_L);
    this.pivots.arm_L = armPivotL;
    this.group.add(armPivotL);

    // ---- Right arm ----
    this.parts.arm_R = new THREE.Mesh(armGeo, armMat.clone());
    this.parts.arm_R.position.set(0, -armHeight / 2, 0);

    const armPivotR = new THREE.Group();
    armPivotR.position.set(bodyWidth / 2 + armWidth / 2, legHeight + bodyHeight, 0);
    armPivotR.add(this.parts.arm_R);
    this.pivots.arm_R = armPivotR;
    this.group.add(armPivotR);

    this.currentWeaponId = null;

    // ---- Left leg ----
    const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legDepth);
    const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
    this.parts.leg_L = new THREE.Mesh(legGeo, legMat);
    this.parts.leg_L.position.set(0, -legHeight / 2, 0); // Offset so pivot is at top (hip)

    const legPivotL = new THREE.Group();
    legPivotL.position.set(-legWidth / 2, legHeight, 0); // Hip
    legPivotL.add(this.parts.leg_L);
    this.pivots.leg_L = legPivotL;
    this.group.add(legPivotL);

    // ---- Right leg ----
    this.parts.leg_R = new THREE.Mesh(legGeo, legMat.clone());
    this.parts.leg_R.position.set(0, -legHeight / 2, 0);

    const legPivotR = new THREE.Group();
    legPivotR.position.set(legWidth / 2, legHeight, 0);
    legPivotR.add(this.parts.leg_R);
    this.pivots.leg_R = legPivotR;
    this.group.add(legPivotR);

    // Set layers so raycast can exclude steve
    this.group.traverse((child) => {
      child.layers.set(1);
    });
  }

  // Rebuild the model with new body proportions
  rebuild(props) {
    // Save weapon state before cleanup
    const weaponId = this.currentWeaponId;

    // Remove weapon from old pivot if present
    if (this.weaponModel) {
      // Weapon will be orphaned; re-attach later
      this.weaponModel = null;
    }

    // Dispose all old geometries/materials and remove from group
    this._disposeModel();

    // Update props
    this.props = { ...DEFAULT_PROPS, ...props };

    // Rebuild from scratch
    this.parts = {};
    this.pivots = {};
    this._buildModel(this.props);

    // Re-attach weapon
    if (weaponId) {
      this.currentWeaponId = null;
      this.switchWeapon(weaponId);
    }
  }

  _disposeModel() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this._disposeNode(child);
      this.group.remove(child);
    }
  }

  _disposeNode(node) {
    if (node.isMesh) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          node.material.dispose();
        }
      }
    }
    // Dispose children recursively (working backwards for safe removal)
    for (let i = node.children.length - 1; i >= 0; i--) {
      this._disposeNode(node.children[i]);
      node.remove(node.children[i]);
    }
  }

  switchWeapon(weaponId) {
    if (this.weaponModel) {
      this.pivots.arm_R.remove(this.weaponModel);
      this.weaponModel = null;
    }
    this.currentWeaponId = weaponId;
    if (weaponId) {
      this.weaponModel = buildWeaponMesh(weaponId);
      if (this.weaponModel) {
        // Use per-weapon tpOffset for positioning relative to right arm pivot
        const wp = getWeapon(weaponId);
        const tp = (wp && wp.tpOffset) ? wp.tpOffset : { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 };
        this.weaponModel.position.set(tp.x, tp.y, tp.z);
        this.weaponModel.rotation.set(tp.rotX, tp.rotY, tp.rotZ);
        this.pivots.arm_R.add(this.weaponModel);
      }
    }
  }

  triggerAnimation(type, callback) {
    if (this.animState !== 'idle') return;
    this.animState = type;
    this.animTimer = 0.35;
    this.animCallback = callback;
    this.animExecuted = false;
  }

  isAnimating() {
    return this.animState !== 'idle';
  }

  updateAnimation(dt, isMoving) {
    if (this.animState !== 'idle') {
      // Mining/placing animation overrides walk
      this.animTimer -= dt;
      const totalDuration = 0.35;
      const elapsed = totalDuration - this.animTimer;
      const progress = Math.max(0, Math.min(1, elapsed / totalDuration));

      // Three-phase swing curve:
      // 0.0 - 0.12: windup (arm goes back)
      // 0.12 - 0.25: strike (arm swings forward fast)
      // 0.25 - 0.35: recover (arm returns to neutral)
      let angle;
      if (progress < 0.35) {
        // Windup phase: 0 → -0.8 (backswing)
        const t = progress / 0.35;
        angle = -0.8 * t;
      } else if (progress < 0.7) {
        // Strike phase: -0.8 → 0.6 (forward swing, ease-out)
        const t = (progress - 0.35) / 0.35;
        const eased = 1 - (1 - t) * (1 - t);
        angle = -0.8 + 1.4 * eased;
      } else {
        // Recover phase: 0.6 → 0 (return to neutral, ease-in)
        const t = (progress - 0.7) / 0.3;
        const eased = t * t;
        angle = 0.6 - 0.6 * eased;
      }

      if (this.pivots.arm_R) {
        this.pivots.arm_R.rotation.x = angle;
      }

      // Execute block action at ~0.55 progress (mid-strike)
      if (progress >= 0.53 && !this.animExecuted && this.animCallback) {
        this.animExecuted = true;
        this.animCallback();
        this.animCallback = null;
      }

      if (this.animTimer <= 0) {
        // End animation, reset arm
        this.animState = 'idle';
        this.animTimer = 0;
        this.animExecuted = false;
        if (this.pivots.arm_R) {
          this.pivots.arm_R.rotation.x = 0;
        }
      }
      return; // Skip walk animation while animating
    }

    // Normal walk/idle animation (unchanged)
    if (isMoving) {
      this.animTime += dt;
      const swing = Math.sin(this.animTime * 8) * 0.5;

      if (this.pivots.arm_L) this.pivots.arm_L.rotation.x = swing;
      if (this.pivots.arm_R) this.pivots.arm_R.rotation.x = -swing;
      if (this.pivots.leg_L) this.pivots.leg_L.rotation.x = -swing;
      if (this.pivots.leg_R) this.pivots.leg_R.rotation.x = swing;
      // Reset weapon breathing when walking
      if (this.weaponModel) this.weaponModel.rotation.z = 0;
    } else {
      this.animTime += dt;
      if (this.pivots.arm_L) this.pivots.arm_L.rotation.x = 0;
      if (this.pivots.leg_L) this.pivots.leg_L.rotation.x = 0;
      if (this.pivots.leg_R) this.pivots.leg_R.rotation.x = 0;

      if (this.pivots.arm_R) {
        this.pivots.arm_R.rotation.x = Math.sin(this.animTime * 2) * 0.05;
      }
      // Idle weapon breathing animation (sin(time*1.5)*0.02 rotation)
      if (this.weaponModel) {
        this.weaponModel.rotation.z = Math.sin(this.animTime * 1.5) * 0.02;
      }
    }
  }

  updatePosition(playerPos, yaw) {
    this.group.position.set(playerPos[0], playerPos[1], playerPos[2]);
    this.group.rotation.y = yaw + Math.PI;
  }

  setVisible(visible) {
    // Toggle individual body parts instead of group.visible
    const bodyParts = ['head', 'body', 'arm_L', 'arm_R', 'leg_L', 'leg_R', 'neck', 'shoulder_L', 'shoulder_R'];
    bodyParts.forEach(key => { if (this.parts[key]) this.parts[key].visible = visible; });
    const hidePivots = ['arm_L', 'leg_L', 'leg_R'];
    hidePivots.forEach(key => { if (this.pivots[key]) this.pivots[key].visible = visible; });
  }

  setWeaponVisible(visible) {
    if (this.weaponModel) this.weaponModel.visible = visible;
  }
}
