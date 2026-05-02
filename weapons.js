// Weapons module — weapon data definitions and Three.js model factory
import * as THREE from 'three';

// Tool mining speeds (relative multiplier, higher = faster)
export const TOOL_SPEEDS = {
  // Pickaxe: fast on stone/ores, slow on wood/dirt
  pickaxe: {
    wood: 2.0, stone: 4.0, iron: 6.0, diamond: 8.0,
    // Blocks affected
    targets: [3, 13, 14, 15, 16, 17, 18, 20], // stone, ores, gravel
  },
  // Axe: fast on wood/leaves
  axe: {
    wood: 2.0, stone: 3.0, iron: 5.0, diamond: 7.0,
    targets: [4, 7, 22], // wood, leaves, cactus
  },
  // Shovel: fast on dirt/sand/snow
  shovel: {
    wood: 2.0, stone: 3.0, iron: 5.0, diamond: 7.0,
    targets: [1, 2, 9, 10, 19, 21], // grass, dirt, mud, clay, sand, snow
  },
};

export function getToolSpeed(toolId, blockType) {
  if (toolId >= 114 && toolId <= 117) { // Pickaxes
    const tier = ['wood', 'stone', 'iron', 'diamond'][toolId - 114];
    return TOOL_SPEEDS.pickaxe.targets.includes(blockType) ? TOOL_SPEEDS.pickaxe[tier] : 1.0;
  }
  if (toolId >= 118 && toolId <= 121) { // Axes
    const tier = ['wood', 'stone', 'iron', 'diamond'][toolId - 118];
    return TOOL_SPEEDS.axe.targets.includes(blockType) ? TOOL_SPEEDS.axe[tier] : 1.0;
  }
  if (toolId >= 122 && toolId <= 125) { // Shovels
    const tier = ['wood', 'stone', 'iron', 'diamond'][toolId - 122];
    return TOOL_SPEEDS.shovel.targets.includes(blockType) ? TOOL_SPEEDS.shovel[tier] : 1.0;
  }
  return 1.0; // No tool or sword = default speed
}

export const WEAPONS = [
  { id: 102, name: '木剑', damage: 4, speed: 0.5, color: 0x8D6E63, effects: { slimeBonus: 1.1 },
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 103, name: '石剑', damage: 6, speed: 0.5, color: 0x9E9E9E, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 104, name: '铁剑', damage: 7, speed: 0.4, color: 0xC0C0C0, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 105, name: '钻石剑', damage: 8, speed: 0.4, color: 0x2BD2E8, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 106, name: '下界合金剑', damage: 10, speed: 0.6, color: 0x4A0E4E, effects: { armorPenetration: 0.1 },
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  // 网络人气武器
  { id: 111, name: '霜之哀伤', damage: 12, speed: 0.5, color: 0x4FC3F7, effects: { slow: 0.3 },
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 112, name: '屠龙宝刀', damage: 14, speed: 0.5, color: 0xFF5722, effects: { fireDamage: 2 },
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.75, z: 0.15, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  // Tools (can be used as weak weapons)
  { id: 114, name: '木镐', damage: 2, speed: 0.5, color: 0x8D6E63, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 115, name: '石镐', damage: 3, speed: 0.5, color: 0x9E9E9E, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 116, name: '铁镐', damage: 4, speed: 0.4, color: 0xC0C0C0, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 117, name: '钻石镐', damage: 5, speed: 0.4, color: 0x2BD2E8, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 118, name: '木斧', damage: 3, speed: 0.5, color: 0x8D6E63, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 119, name: '石斧', damage: 4, speed: 0.5, color: 0x9E9E9E, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 120, name: '铁斧', damage: 5, speed: 0.4, color: 0xC0C0C0, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 121, name: '钻石斧', damage: 6, speed: 0.4, color: 0x2BD2E8, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 122, name: '木铲', damage: 1, speed: 0.5, color: 0x8D6E63, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 123, name: '石铲', damage: 2, speed: 0.5, color: 0x9E9E9E, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 124, name: '铁铲', damage: 3, speed: 0.4, color: 0xC0C0C0, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 125, name: '钻石铲', damage: 4, speed: 0.4, color: 0x2BD2E8, effects: {},
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
  { id: 126, name: '弓', damage: 0, speed: 0, color: 0x8B4513, effects: { ranged: true },
    fpOffset: { x: 0, y: 0, z: 0, rotX: Math.PI/3, rotY: 0, rotZ: 0 },
    tpOffset: { x: 0, y: -0.72, z: 0.12, rotX: -Math.PI/3, rotY: 0, rotZ: 0 } },
];

const _weaponMap = new Map(WEAPONS.map(w => [w.id, w]));

export function getWeapon(id) {
  return _weaponMap.get(id) || null;
}

export function buildWeaponMesh(weaponId) {
  const weapon = getWeapon(weaponId);
  if (!weapon) return null;

  const group = new THREE.Group();

  if (weapon.id === 111) {
    // 霜之哀伤 (Frostmourne) — longer blade, skull guard, icy glow
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), handleMat);
    handle.position.set(0, -0.09, 0);
    group.add(handle);

    // Skull guard (stylized)
    const guardMat = new THREE.MeshLambertMaterial({ color: 0xB0BEC5 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), guardMat);
    guard.position.set(0, 0, 0);
    group.add(guard);
    // Skull top
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), guardMat);
    skull.position.set(0, 0.025, 0);
    group.add(skull);

    // Icy blade (longer)
    const bladeMat = new THREE.MeshLambertMaterial({ color: weapon.color });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), bladeMat);
    blade.position.set(0, 0.225, 0);
    group.add(blade);

    // Frost glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x80DEEA, transparent: true, opacity: 0.5 });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), glowMat);
    glow.position.set(0, 0.40, 0);
    group.add(glow);

    // Second glow on blade
    const glow2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), glowMat);
    glow2.position.set(0, 0.28, 0);
    group.add(glow2);

  } else if (weapon.id === 112) {
    // 屠龙宝刀 (Dragon Blade) — wide blade, gold guard, fire glow
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), handleMat);
    handle.position.set(0, -0.075, 0);
    group.add(handle);

    // Gold dragon guard
    const guardMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.04), guardMat);
    guard.position.set(0, 0, 0);
    group.add(guard);

    // Wide blade
    const bladeMat = new THREE.MeshLambertMaterial({ color: weapon.color });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.35, 0.06), bladeMat);
    blade.position.set(0, 0.175, 1);
    group.add(blade);

    // Fire glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF6F00, transparent: true, opacity: 0.4 });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), glowMat);
    glow.position.set(0, 0.35, 0);
    group.add(glow);

    // Dragon eye on guard
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), eyeMat);
    eye.position.set(0, 0, 0.03);
    group.add(eye);

  } else if (weaponId >= 114 && weaponId <= 125) {
    // Tool mesh: handle + head
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), handleMat);
    handle.position.set(0, -0.09, 0);
    group.add(handle);

    const headMat = new THREE.MeshLambertMaterial({ color: weapon.color });

    if (weaponId >= 114 && weaponId <= 117) {
      // Pickaxe head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.16), headMat);
      head.position.set(0, 0.02, 0);
      group.add(head);
    } else if (weaponId >= 118 && weaponId <= 121) {
      // Axe head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.03), headMat);
      head.position.set(0, 0.03, 0);
      group.add(head);
    } else {
      // Shovel head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), headMat);
      head.position.set(0, 0.03, 0);
      group.add(head);
    }
  } else {
    // Standard sword building
    // Handle
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), handleMat);
    handle.position.set(0, -0.075, 0);
    group.add(handle);

    // Guard (crossguard)
    const guardMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), guardMat);
    guard.position.set(0, 0, 0);
    group.add(guard);

    // Blade
    const bladeMat = new THREE.MeshLambertMaterial({ color: weapon.color });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), bladeMat);
    blade.position.set(0, 0.175, 0);
    group.add(blade);

    // Glow for diamond and netherite
    if (weapon.id === 105) {
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x88FFFF, transparent: true, opacity: 0.5 });
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), glowMat);
      glow.position.set(0, 0.35, 0);
      group.add(glow);
    } else if (weapon.id === 106) {
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x8B008B, transparent: true, opacity: 0.4 });
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), glowMat);
      glow.position.set(0, 0.35, 0);
      group.add(glow);
    }
  }

  // Return clean group — positioning is handled by caller (camera.js / steve.js) via per-weapon offsets
  return group;
}
