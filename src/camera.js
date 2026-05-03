// Camera module — first/third person + god camera control
import * as THREE from 'three';
import { buildWeaponMesh, getWeapon } from './weapons.js';

export const CAMERA_FIRST = 0;
export const CAMERA_THIRD_BACK = 1;
export const CAMERA_THIRD_FRONT = 2;
export const CAMERA_GOD = 3;

export class CameraController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.mode = CAMERA_FIRST;

        this.thirdPersonDist = 4;
    this.thirdPersonHeight = 1.5;

        this.godHeight = 15;            this.godMinHeight = 5;
    this.godMaxHeight = 50;
    this.godPitch = -Math.PI / 3;
        this._forward = new THREE.Vector3();
    this._eyePos = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._offset = new THREE.Vector3();

    // First-person weapon view model (child of camera)
    this._fpWeaponGroup = new THREE.Group();
    this._fpWeaponGroup.position.set(0.35, -0.38, -0.8);
    this._fpWeaponGroup.rotation.z = 0.1;
    this.camera.add(this._fpWeaponGroup);
  }

  setFirstPersonWeapon(weaponId) {
    // Clear old weapon mesh
    while (this._fpWeaponGroup.children.length > 0) {
      const child = this._fpWeaponGroup.children[0];
      this._fpWeaponGroup.remove(child);
    }
    // Build and add new weapon mesh
    if (weaponId) {
      const mesh = buildWeaponMesh(weaponId);
      if (mesh) {
        // Use per-weapon fpOffset for positioning within _fpWeaponGroup
        const wp = getWeapon(weaponId);
        const fp = (wp && wp.fpOffset) ? wp.fpOffset : { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 };
        mesh.position.set(fp.x, fp.y, fp.z);
        mesh.rotation.set(fp.rotX, fp.rotY, fp.rotZ);
        this._fpWeaponGroup.add(mesh);
      }
    }
  }

  cycleMode() {
    this.mode = (this.mode + 1) % 4;
    return this.mode;
  }

  getMode() {
    return this.mode;
  }

  isGodMode() {
    return this.mode === CAMERA_GOD;
  }

  // Called from input module — scroll wheel in god mode adjusts height
  adjustGodHeight(delta) {
    if (this.mode !== CAMERA_GOD) return;
    this.godHeight += delta;
    this.godHeight = Math.max(this.godMinHeight, Math.min(this.godMaxHeight, this.godHeight));
  }

  // Called from input module — mouse vertical in god mode adjusts pitch
  adjustGodPitch(deltaY) {
    if (this.mode !== CAMERA_GOD) return;
    this.godPitch -= deltaY * 0.002;
    // Clamp between -85° and -30°
    this.godPitch = Math.max(-Math.PI * 85 / 180, Math.min(-Math.PI * 30 / 180, this.godPitch));
  }

  resetPitch() {
    // Reset camera pitch to horizontal for first/third person
    if (this.mode === CAMERA_GOD) {
      this.godPitch = -Math.PI / 3;
    }
  }

  update(player, input, steveModel) {
    const eyePos = player.getEyePosition();
    const forward = input.getForward();
    const yaw = input.yaw;

    this._forward.set(forward[0], forward[1], forward[2]);
    this._eyePos.set(eyePos[0], eyePos[1], eyePos[2]);

    switch (this.mode) {
      case CAMERA_FIRST:
        this._updateFirstPerson(steveModel);
        break;
      case CAMERA_THIRD_BACK:
        this._updateThirdPersonBack(yaw, steveModel, player);
        break;
      case CAMERA_THIRD_FRONT:
        this._updateThirdPersonFront(yaw, steveModel, player);
        break;
      case CAMERA_GOD:
        this._updateGod(yaw, steveModel, player);
        break;
    }

    // Update fog based on camera mode
    this._updateFog();
  }

  _updateFirstPerson(steveModel) {
    this.camera.position.copy(this._eyePos);
    this._target.copy(this._eyePos).add(this._forward);
    this.camera.lookAt(this._target);

    // Show first-person weapon, hide Steve body & its weapon
    this._fpWeaponGroup.visible = true;
    if (steveModel) {
      steveModel.setVisible(false);
      steveModel.setWeaponVisible(false);
    }
  }

  _updateThirdPersonBack(yaw, steveModel, player) {
    // Camera behind player
    this._offset.set(
      Math.sin(yaw) * this.thirdPersonDist,
      this.thirdPersonHeight,
      Math.cos(yaw) * this.thirdPersonDist
    );
    this.camera.position.copy(this._eyePos).add(this._offset);
    this._target.copy(this._eyePos).addScaledVector(this._forward, 2);
    this.camera.lookAt(this._target);

    this._fpWeaponGroup.visible = false;
    if (steveModel) {
      steveModel.setVisible(true);
      steveModel.setWeaponVisible(true);
      steveModel.updatePosition(player.position, yaw);
    }
  }

  _updateThirdPersonFront(yaw, steveModel, player) {
    // Camera in front of player
    this._offset.set(
      -Math.sin(yaw) * this.thirdPersonDist,
      this.thirdPersonHeight,
      -Math.cos(yaw) * this.thirdPersonDist
    );
    this.camera.position.copy(this._eyePos).add(this._offset);
    // Look at the player so their face is visible
    this._target.copy(this._eyePos);
    this.camera.lookAt(this._target);

    this._fpWeaponGroup.visible = false;
    if (steveModel) {
      steveModel.setVisible(true);
      steveModel.setWeaponVisible(true);
      steveModel.updatePosition(player.position, yaw);
    }
  }

  _updateGod(yaw, steveModel, player) {
    // Camera above player, looking down at an angle
    const horizDist = this.godHeight * Math.cos(-this.godPitch - Math.PI / 2);
    const vertDist = this.godHeight;

    this.camera.position.set(
      player.position[0] + Math.sin(yaw) * horizDist,
      player.position[1] + vertDist,
      player.position[2] + Math.cos(yaw) * horizDist
    );

        this._target.set(player.position[0], player.position[1] + 1, player.position[2]);
    this.camera.lookAt(this._target);

    this._fpWeaponGroup.visible = false;
    if (steveModel) {
      steveModel.setVisible(true);
      steveModel.setWeaponVisible(true);
      steveModel.updatePosition(player.position, yaw);
    }
  }

  _updateFog() {
    if (!this.scene || !this.scene.fog) return;
    const fogColor = 0x87CEEB;

    switch (this.mode) {
      case CAMERA_FIRST:
      case CAMERA_THIRD_BACK:
      case CAMERA_THIRD_FRONT:
        this.scene.fog.near = 60;
        this.scene.fog.far = 180;
        break;
      case CAMERA_GOD:
        this.scene.fog.near = 120;
        this.scene.fog.far = 300;
        break;
    }
  }

  // Get the raycast origin (adjusted for camera mode)
  getRaycastOrigin(player) {
    if (this.mode === CAMERA_GOD) {
            return [this.camera.position.x, this.camera.position.y, this.camera.position.z];
    }
    return player.getEyePosition();
  }

  // Get the raycast direction (adjusted for camera mode)
  getRaycastDirection(input) {
    if (this.mode === CAMERA_GOD) {
            const dir = new THREE.Vector3(0, 0, -1);
      dir.applyQuaternion(this.camera.quaternion);
      return [dir.x, dir.y, dir.z];
    }
    return input.getForward();
  }
}
