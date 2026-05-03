// L1 Unit Test: Weapons module (data definitions + model factory)
import { getWeapon, WEAPONS } from '../../src/weapons.js';

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

// ---- Test: WEAPONS array has all entries ----
{
  assert(WEAPONS.length === 20, '20 weapons defined');
  assert(WEAPONS[0].id === 102, 'first weapon id 102 (wood)');
  assert(WEAPONS[4].id === 106, 'weapon id 106 (netherite)');
  assert(WEAPONS[19].id === 126, 'last weapon id 126 (bow)');
}

// ---- Test: getWeapon returns correct weapon by ID ----
{
  const w = getWeapon(102);
  assert(w !== null, 'getWeapon(102) found');
  assert(w.name === '木剑', 'wood sword name');
  assert(w.damage === 4, 'wood sword damage 4');
  assert(w.speed === 0.5, 'wood sword speed 0.5');
}

// ---- Test: getWeapon returns correct diamond sword ----
{
  const w = getWeapon(105);
  assert(w !== null, 'diamond sword found');
  assert(w.name === '钻石剑', 'diamond sword name');
  assert(w.damage === 8, 'diamond sword damage 8');
  assert(w.color === 0x2BD2E8, 'diamond sword color');
}

// ---- Test: getWeapon returns null for invalid ID ----
{
  assert(getWeapon(0) === null, 'invalid ID returns null');
  assert(getWeapon(999) === null, 'unknown ID returns null');
}

// ---- Test: getWeapon returns null for block IDs ----
{
  assert(getWeapon(1) === null, 'block type 1 (grass) returns null');
  assert(getWeapon(8) === null, 'block type 8 (flower) returns null');
}

// ---- Test: All weapons have fpOffset and tpOffset ----
{
  let allHaveOffsets = true;
  for (const w of WEAPONS) {
    if (!w.fpOffset || typeof w.fpOffset.x !== 'number' ||
        !w.tpOffset || typeof w.tpOffset.x !== 'number') {
      console.error('  Missing/invalid offset for:', w.name, '(id=' + w.id + ')');
      allHaveOffsets = false;
      break;
    }
    // Verify offset structure
    const requiredKeys = ['x', 'y', 'z', 'rotX', 'rotY', 'rotZ'];
    for (const key of requiredKeys) {
      if (typeof w.fpOffset[key] !== 'number' || typeof w.tpOffset[key] !== 'number') {
        console.error('  Offset missing key "' + key + '" for:', w.name, '(id=' + w.id + ')');
        allHaveOffsets = false;
        break;
      }
    }
  }
  assert(allHaveOffsets, 'All 20 weapons have valid fpOffset and tpOffset');
}

// ---- Test: buildWeaponMesh (with THREE mock) ----
{
  const { buildWeaponMesh } = await import('../../src/weapons.js');
  const mesh = buildWeaponMesh(102);
  assert(mesh !== null, 'wood sword mesh created');
  assert(typeof mesh.children !== 'undefined', 'mesh is a Group');
  assert(mesh.children.length >= 3, 'mesh has handle + guard + blade: ' + mesh.children.length);

  const invalidMesh = buildWeaponMesh(999);
  assert(invalidMesh === null, 'invalid ID returns null from buildWeaponMesh');
}

// ---- Summary ----
console.log(`\nWeapons tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
process.exit(failed > 0 ? 1 : 0);
