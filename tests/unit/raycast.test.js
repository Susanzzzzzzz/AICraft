// L1 Unit Test: Raycast module (DDA algorithm)
import { raycast } from '../../raycast.js';

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

// Create a simple block getter
// Blocks at (0,0,0) and (2,0,0) and (0,0,2) are solid
function makeWorld() {
  const blocks = new Map();
  blocks.set('0,0,0', 1);
  blocks.set('2,0,0', 1);
  blocks.set('0,0,2', 1);
  return (x, y, z) => blocks.get(`${x},${y},${z}`) || 0;
}

// ---- Test: Ray hits block directly in front ----
{
  const world = makeWorld();
  // Approach from outside the block so normal is properly set
  const result = raycast([-0.5, 0, 0], [1, 0, 0], world, 8);
  assert(result.hit === true, 'hit block at (0,0,0)');
  assert(result.position[0] === 0 && result.position[1] === 0 && result.position[2] === 0,
    `hit position is (0,0,0) got (${result.position})`);
  assert(result.normal[0] === -1, 'normal points back');
}

// ---- Test: Ray hits block at distance ----
{
  const world = makeWorld();
  const result = raycast([-0.5, 0, 0], [1, 0, 0], world, 8);
  assert(result.hit === true, 'hit block at distance');
}

// ---- Test: Ray misses into air ----
{
  const world = makeWorld();
  // Start from an air block (1,0,0) going upward — origin not inside a block
  const result = raycast([1, 0, 0], [0, 1, 0], world, 8);
  assert(result.hit === false, 'air above: no hit');
}

// ---- Test: Ray misses beyond maxDist ----
{
  const world = makeWorld();
  const result = raycast([10, 0, 0], [-1, 0, 0], world, 5);
  assert(result.hit === false, 'block too far: no hit');
}

// ---- Test: Ray hits at angle (Z axis) ----
{
  const world = makeWorld();
  const result = raycast([0, 0, -0.5], [0, 0, 1], world, 8);
  assert(result.hit === true, 'hit block along Z');
  assert(result.position[2] === 0, 'Z hit position is 0');
}

// ---- Test: Ray returns normal facing the correct direction ----
{
  const world = makeWorld();
  const result = raycast([-1, 0, 0], [1, 0, 0], world, 8);
  assert(result.hit === true, 'hit from negative X');
  assert(result.normal[0] === -1, 'normal points back (negative X)');
}

// ---- Test: maxDist 0 returns immediately ----
{
  const world = makeWorld();
  const result = raycast([0, 0, 0], [1, 0, 0], world, 0);
  assert(result.hit === false, 'zero distance: no hit');
}

// ---- Summary ----
console.log(`\nRaycast tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
process.exit(failed > 0 ? 1 : 0);
