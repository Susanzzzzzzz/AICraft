// AICraft Test Runner — runs L1 → L2 → L3 tests sequentially
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = join(__dirname, '..'); // project root (parent of tests/)
const TEST_FILES = [
  // L1: Unit tests (pure logic, no mocks needed)
  { name: 'L1: Inventory',     file: 'unit/inventory.test.js' },
  { name: 'L1: Crafting',      file: 'unit/crafting.test.js' },
  { name: 'L1: Raycast',       file: 'unit/raycast.test.js' },
  { name: 'L1: Weapons',       file: 'unit/weapons.test.js' },
  // L2: Integration tests (module mocks)
  { name: 'L2: Player',        file: 'unit/player.test.js' },
  // L3: E2E browser tests (Playwright)
  { name: 'L3: E2E (browser)', file: 'e2e/game.test.js', optional: true },
];

let totalPassed = 0;
let totalFailed = 0;
let allResults = [];

async function runTest(name, filePath) {
  return new Promise((resolve) => {
    const fullPath = join(__dirname, filePath);
    const proc = spawn('node', [fullPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: ROOT_DIR, // run from project root so test imports resolve correctly
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      // Extract summary line
      const lines = stdout.split('\n').filter(l => l.trim());
      const summaryLine = lines.find(l => l.includes('passed') && l.includes('failed')) ||
                          lines[lines.length - 1] || '';

      // Parse pass/fail counts
      const passMatch = summaryLine.match(/(\d+)\s+passed/);
      const failMatch = summaryLine.match(/(\d+)\s+failed/);
      const p = passMatch ? parseInt(passMatch[1]) : 0;
      const f = failMatch ? parseInt(failMatch[1]) : (code !== 0 ? 1 : 0);

      const status = code === 0 ? '✓' : '✗';
      const details = summaryLine || (code === 0 ? 'all passed' : `exit code ${code}`);

      resolve({ name, status, passed: p, failed: f, details, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ name, status: '✗', passed: 0, failed: 1, details: err.message, stdout: '', stderr: '' });
    });
  });
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     AICraft Test Runner             ║');
  console.log('╚══════════════════════════════════════╝\n');

  for (const test of TEST_FILES) {
    process.stdout.write(`Running ${test.name}... `);

    const result = await runTest(test.name, test.file);

    if (result.status === '✓') {
      console.log(`✓ (${result.passed} passed)`);
    } else {
      console.log(`✗ (${result.failed} failed)`);
    }

    // Print failure details
    if (result.status === '✗' && result.stderr) {
      const failLines = result.stderr.split('\n').filter(l => l.includes('FAIL'));
      for (const line of failLines) {
        console.error(`  ${line}`);
      }
    }

    allResults.push(result);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('RESULTS');
  console.log('═'.repeat(50));

  let allPassed = true;
  for (const r of allResults) {
    const icon = r.status === '✓' ? '✓' : '✗';
    console.log(`  ${icon} ${r.name}: ${r.details}`);
    if (r.status !== '✓') allPassed = false;
  }

  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed ${totalFailed > 0 ? '❌' : '✅'}`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
