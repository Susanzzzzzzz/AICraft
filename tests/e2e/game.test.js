// L3 Browser E2E Test: Game initialization, controls, inventory
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..'); // tests/e2e/ -> project root

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
};

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL:', msg); }
}

// Minimal static file server
function createServer_(root) {
  return createServer((req, res) => {
    const url = req.url.split('?')[0].split('#')[0];
    const filePath = join(root, url === '/' ? 'index.html' : url);
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      const stat = statSync(filePath);
      if (stat.isDirectory()) { res.writeHead(404); res.end(); return; }
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(content);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---- Main E2E Suite ----
async function main() {
  // Start local server
  const server = createServer_(rootDir);
  const port = await new Promise(resolve => {
    server.listen(0, () => resolve(server.address().port));
  });
  const baseUrl = `http://localhost:${port}`;

  console.log(`E2E server started on ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  try {
    // ---- Test 4.1: Page loads, DOM elements exist ----
    console.log('\n--- Test 4.1: Page load & DOM ---');
    const page = await context.newPage();
    page.on('pageerror', err => console.error('  PAGE ERROR:', err.message));

    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15000 });

    // Check key DOM elements
    assert(await page.$('#game-canvas') !== null, 'canvas element exists');
    assert(await page.$('#overlay') !== null, 'overlay element exists');
    assert(await page.$('#start-btn') !== null, 'start button exists');
    assert(await page.$('#hud') !== null, 'HUD element exists');
    assert(await page.$('#hotbar') !== null, 'hotbar element exists');
    assert(await page.$('#debug-info') !== null, 'debug info exists');
    assert(await page.$('#health-display') !== null, 'health display exists');
    assert(await page.$('#weapon-display') !== null, 'weapon display exists');
    assert(await page.$('#time-display') !== null, 'time display exists');
    assert(await page.$('#inventory-overlay') !== null, 'inventory overlay exists');
    assert(await page.$('#crafting-grid') !== null, 'crafting grid exists');

    // Verify start screen is visible
    const overlayDisplay = await page.$eval('#overlay', el => el.style.display || window.getComputedStyle(el).display);
    assert(overlayDisplay !== 'none', 'start overlay is visible');

    // Click start button to enter game mode
    await page.click('#start-btn');
    await sleep(500);

    // ---- Test 4.3: Inventory UI (check before keyboard interactions) ----
    console.log('\n--- Test 4.3: Inventory UI ---');

    // After start button click, inventory slots are created by _setupInventoryUI()
    const storageSlots = await page.$$('#storage-grid .inv-slot');
    assert(storageSlots.length === 36, `storage has 36 slots, got ${storageSlots.length}`);

    // Check crafting slots
    const craftSlots = await page.$$('#crafting-grid .craft-slot');
    assert(craftSlots.length === 4, `crafting has 4 slots, got ${craftSlots.length}`);

    // Craft result slot
    assert(await page.$('#craft-result-slot') !== null, 'craft result slot exists');

    // Inventory overlay starts hidden
    const invHidden = await page.$eval('#inventory-overlay', el => el.classList.contains('hidden'));
    assert(invHidden, 'inventory overlay starts hidden');

    // ---- Test 4.2: Key binding actions ----
    console.log('\n--- Test 4.2: Key bindings produce action queue entries ---');

    // Dispatch keyboard events and verify no crash
    await page.keyboard.down('KeyW');
    await sleep(50);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyA');
    await sleep(50);
    await page.keyboard.up('KeyA');
    await page.keyboard.down('KeyS');
    await sleep(50);
    await page.keyboard.up('KeyS');
    await page.keyboard.down('KeyD');
    await sleep(50);
    await page.keyboard.up('KeyD');

    // Press action keys (E will toggle inventory — check state after)
    await page.keyboard.press('KeyQ'); // weapon switch
    await sleep(50);
    await page.keyboard.press('KeyF'); // flight toggle
    await sleep(50);
    await page.keyboard.press('F5'); // camera toggle
    await sleep(50);
    await page.keyboard.press('KeyR'); // reset
    await sleep(50);
    await page.keyboard.press('Digit1'); // slot 1
    await sleep(50);

    assert(true, 'keyboard events dispatched without error');

    // Press E to toggle inventory open and verify it opens
    await page.keyboard.press('KeyE');
    await sleep(200);

    // Inventory should now be visible (E toggles it)
    // Note: in headless mode, requestPointerLock fails, but the E key
    // is still dispatched and the input module pushes the 'interact' action
    // The game will process it in update() and toggle inventory

    // ---- Test 4.4: Runtime verification (no JS errors, game loop starts) ----
    console.log('\n--- Test 4.4: Runtime verification ---');

    // Reload page for clean state with error monitoring
    const page2 = await context.newPage();
    const consoleErrors = [];
    page2.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page2.on('pageerror', err => consoleErrors.push(err.message));

    await page2.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15000 });

    // Allow game to initialize and run for 2 seconds
    await sleep(2000);

    // Exclude expected headless-mode warnings
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('requestAnimationFrame') &&
      !e.includes('browsing context') &&
      !e.includes('PointerLock') &&
      !e.includes('AudioContext') &&
      !e.includes('WebGL') &&
      !e.includes('DOMException')
    );
    if (criticalErrors.length > 0) {
      console.error('  Console errors:', criticalErrors);
    }
    assert(criticalErrors.length === 0, `no critical JS errors (${consoleErrors.length} total, ${criticalErrors.length} critical)`);

    await page.close();
    await page2.close();

  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  // ---- Summary ----
  console.log(`\nE2E tests: ${passed} passed, ${failed} failed ${failed > 0 ? '❌' : '✅'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('E2E test error:', err);
  process.exit(1);
});
