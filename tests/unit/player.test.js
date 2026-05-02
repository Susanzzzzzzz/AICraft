// L2 Unit Test: Player module (physics, flight, fall damage)
import { Player } from '../../player.js';
import { BLOCK } from '../../world.js';

const GRAVITY = -25;
const FLIGHT_SPEED = 8;

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

function approx(a, b, tolerance) {
  return Math.abs(a - b) <= (tolerance || 0.01);
}

// Create a mock world with solid ground below a given height
function makeWorld(groundHeight) {
  return {
    groundY: groundHeight,
    useChunks: false,
    width: 128,
    height: 64,
    depth: 128,
    getBlock(x, y, z) {
      return Math.floor(y) < groundHeight ? BLOCK.GRASS : BLOCK.AIR;
    }
  };
}

// ---- Test: Gravity and ground collision ----
{
  const world = makeWorld(1); // ground at y=0, surface at y=1
  const player = new Player(world);
  player.position = [10, 10, 10]; // start above ground
  player.velocity = [0, 0, 0];

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: () => false,
    consumeAction: () => false,
  };

  // Simulate ~2 seconds with 0.05s steps
  for (let i = 0; i < 60; i++) {
    player.update(0.05, input);
  }

  assert(player.onGround === true, 'player is on ground after falling');
  assert(approx(player.position[1], 1), `landed at y=1, got y=${player.position[1]}`);
  assert(approx(player.velocity[1], 0, 0.001), 'vertical velocity is zero after landing');
}

// ---- Test: Jump (from ground) ----
{
  const world = makeWorld(1);
  const player = new Player(world);
  player.position = [10, 1, 10];
  player.onGround = true;
  player.velocity = [0, 0, 0];

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: () => false,
    consumeAction: (action) => action === 'jump',
  };

  player.update(0.05, input);

  assert(player.onGround === false, 'player leaves ground after jump');
  assert(player.velocity[1] > 0, 'player has upward velocity after jump');
}

// ---- Test: Flight mode toggle ----
{
  const world = makeWorld(1);
  const player = new Player(world);
  player.position = [10, 10, 10];
  player.velocity = [0, 0, 0];

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: (code) => code === 'Space',
    consumeAction: () => false,
  };

  // Toggle flight on and fly upward
  player.toggleFlight();
  assert(player.isFlying === true, 'isFlying is true after toggle');

  for (let i = 0; i < 10; i++) {
    player.update(0.05, input);
  }

  assert(player.position[1] > 10.1, `player flew upward (y=${player.position[1]})`);
}

// ---- Test: Flight mode descending ----
{
  const world = makeWorld(1);
  const player = new Player(world);
  player.position = [10, 20, 10];
  player.velocity = [0, 0, 0];
  player.isFlying = true;

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: (code) => code === 'ShiftLeft',
    consumeAction: () => false,
  };

  for (let i = 0; i < 10; i++) {
    player.update(0.05, input);
  }

  assert(player.position[1] < 19.9, `player descended (y=${player.position[1]})`);
}

// ---- Test: Flight ignores gravity ----
{
  const world = makeWorld(1);
  const player = new Player(world);
  player.position = [10, 10, 10];
  player.velocity = [0, 1, 0];
  player.isFlying = true;

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: () => false,
    consumeAction: () => false,
  };

  // Flying with no input: velocity[1] is reset to 0 per frame
  player.update(0.05, input);
  assert(approx(player.velocity[1], 0, 0.001), 'no gravity when flying');
  assert(approx(player.position[1], 10), 'position unchanged when flying with no input');
}

// ---- Test: Fall damage threshold ----
{
  const world = makeWorld(1); // ground at y=0, surface at y=1
  const player = new Player(world);
  player.position = [10, 10, 10]; // 9 blocks above ground
  player.health = 20;

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: () => false,
    consumeAction: () => false,
  };

  // Disable healing during test to isolate fall damage
  player.healTimer = -999;

  // Fall from y=10 to ground at y=1
  for (let i = 0; i < 60; i++) {
    player.update(0.05, input);
  }

  assert(player.health < 20, `fall damage applied (health=${player.health})`);
  // Fall distance > 6 triggers damage: floor(9-6) = 3
  assert(player.health === 17, `expected health 17 after fall, got ${player.health}`);
}

// ---- Test: Small fall (< 6) does no damage ----
{
  const world = makeWorld(10); // ground at y=9
  const player = new Player(world);
  player.position = [10, 14, 10]; // 4 blocks above ground
  player.health = 20;

  const input = {
    getForwardFlat: () => [0, 0, -1],
    isKeyDown: () => false,
    consumeAction: () => false,
  };

  for (let i = 0; i < 60; i++) {
    player.update(0.05, input);
  }

  assert(player.health === 20, `no damage from small fall (health=${player.health})`);
}

// ---- Summary ----
console.log(`\nPlayer tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
process.exit(failed > 0 ? 1 : 0);
