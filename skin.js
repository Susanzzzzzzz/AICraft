// Skin module — MC 64×64 skin texture loading, UV splitting, application
import * as THREE from 'three';
import { ROLES, generateRoleSkin } from './role.js';

// MC skin UV regions (64×64 format)
const SKIN_REGIONS = {
  head: {
    top:    { x: 8,  y: 0,  w: 8,  h: 8 },
    bottom: { x: 16, y: 0,  w: 8,  h: 8 },
    front:  { x: 8,  y: 8,  w: 8,  h: 8 },
    back:   { x: 24, y: 8,  w: 8,  h: 8 },
    right:  { x: 0,  y: 8,  w: 8,  h: 8 },
    left:   { x: 16, y: 8,  w: 8,  h: 8 },
  },
  body: {
    front:  { x: 20, y: 20, w: 8,  h: 12 },
    back:   { x: 32, y: 20, w: 8,  h: 12 },
    right:  { x: 16, y: 20, w: 4,  h: 12 },
    left:   { x: 28, y: 20, w: 4,  h: 12 },
    top:    { x: 20, y: 16, w: 8,  h: 4 },
    bottom: { x: 28, y: 16, w: 8,  h: 4 },
  },
  arm_R: {
    top:    { x: 44, y: 16, w: 4,  h: 4 },
    bottom: { x: 48, y: 16, w: 4,  h: 4 },
    front:  { x: 44, y: 20, w: 4,  h: 12 },
    back:   { x: 52, y: 20, w: 4,  h: 12 },
    right:  { x: 40, y: 20, w: 4,  h: 12 },
    left:   { x: 48, y: 20, w: 4,  h: 12 },
  },
  arm_L: {
    top:    { x: 36, y: 48, w: 4,  h: 4 },
    bottom: { x: 40, y: 48, w: 4,  h: 4 },
    front:  { x: 36, y: 52, w: 4,  h: 12 },
    back:   { x: 44, y: 52, w: 4,  h: 12 },
    right:  { x: 32, y: 52, w: 4,  h: 12 },
    left:   { x: 40, y: 52, w: 4,  h: 12 },
  },
  leg_R: {
    top:    { x: 4,  y: 16, w: 4,  h: 4 },
    bottom: { x: 8,  y: 16, w: 4,  h: 4 },
    front:  { x: 4,  y: 20, w: 4,  h: 12 },
    back:   { x: 12, y: 20, w: 4,  h: 12 },
    right:  { x: 0,  y: 20, w: 4,  h: 12 },
    left:   { x: 8,  y: 20, w: 4,  h: 12 },
  },
  leg_L: {
    top:    { x: 20, y: 48, w: 4,  h: 4 },
    bottom: { x: 24, y: 48, w: 4,  h: 4 },
    front:  { x: 20, y: 52, w: 4,  h: 12 },
    back:   { x: 28, y: 52, w: 4,  h: 12 },
    right:  { x: 16, y: 52, w: 4,  h: 12 },
    left:   { x: 24, y: 52, w: 4,  h: 12 },
  },
};

export class SkinManager {
  constructor(initialRoleId = 'steve') {
    this.currentRoleId = initialRoleId;
    this.skins = {};      // roleId -> Canvas
    this._initRoleSkins();
  }

  _initRoleSkins() {
    // Programmatically generate skins for all non-locked roles
    for (const roleId of Object.keys(ROLES)) {
      if (!ROLES[roleId].locked) {
        this.skins[roleId] = generateRoleSkin(roleId);
      }
    }
  }

  applyRole(roleId) {
    if (!this.skins[roleId]) return;
    this.currentRoleId = roleId;
  }

  // Apply skin to Steve model
  applySkin(steveModel, skinName) {
    const skinCanvas = this.skins[skinName];
    if (!skinCanvas) return;

    this.currentRoleId = skinName;

    for (const partName of ['head', 'body', 'arm_R', 'arm_L', 'leg_R', 'leg_L']) {
      const mesh = steveModel.parts[partName];
      if (!mesh) continue;

      const regions = SKIN_REGIONS[partName];
      const materials = this._createPartMaterials(skinCanvas, regions);

      if (mesh.material) {
        mesh.material = materials;
      }
    }
  }

  _createPartMaterials(skinCanvas, regions) {
    // Create a 6-face material array (right, left, top, bottom, front, back)
    const faceOrder = ['right', 'left', 'top', 'bottom', 'front', 'back'];
    const materials = faceOrder.map(face => {
      const region = regions[face];
      if (!region) {
        return new THREE.MeshLambertMaterial({ color: 0xFF00FF }); // Debug pink
      }

      const tex = this._extractTexture(skinCanvas, region);
      return new THREE.MeshLambertMaterial({ map: tex });
    });

    return materials;
  }

  _extractTexture(skinCanvas, region) {
    const { x, y, w, h } = region;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(skinCanvas, x, y, w, h, 0, 0, w, h);

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  getAvailableSkins() {
    return Object.keys(this.skins);
  }

  getCurrentSkin() {
    return this.currentRoleId;
  }

  getCurrentRoleId() {
    return this.currentRoleId;
  }
}
