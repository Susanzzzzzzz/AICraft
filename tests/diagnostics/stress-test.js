// AICraft 自测程序 — 卡死问题诊断
// 在 Node.js 环境下独立运行，无需浏览器/Three.js
// 用法: node tests/diagnostics/stress-test.js

import { World, BLOCK, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH } from '../../src/world.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = resolve(__dirname, '../../logs/diagnostic-report.md');

// ===== 工具函数 =====
let totalTime = 0;
let totalAlloc = 0;

function measure(label, fn, iterations = 1) {
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  const heapAfter = process.memoryUsage().heapUsed;
  totalTime += elapsed;
  totalAlloc += Math.max(0, heapAfter - heapBefore);
  const avg = elapsed / iterations;
  return { label, elapsed, avg, iterations, heapDelta: Math.max(0, heapAfter - heapBefore) };
}

function reportLine(r) {
  const perSec = r.iterations > 1 ? ` (${(1000/r.avg).toFixed(0)} ops/s)` : '';
  const heapStr = r.heapDelta > 1024 ? ` | heap: ${(r.heapDelta / 1024).toFixed(0)}KB` : '';
  return `| ${r.label.padEnd(45)} | ${r.elapsed.toFixed(1).padStart(8)}ms | ${r.avg.toFixed(3).padStart(8)}ms${perSec}${heapStr} |`;
}

// ===== 1. 世界生成 =====
console.log('=== AICraft 自测程序 ===\n');
console.log('正在生成世界...');

const world = new World();
let genTime;

{
  const start = performance.now();
  world.generate(42);
  genTime = performance.now() - start;
  console.log(`  世界生成: ${genTime.toFixed(0)}ms (${WORLD_WIDTH}×${WORLD_HEIGHT}×${WORLD_DEPTH} = ${WORLD_WIDTH * WORLD_HEIGHT * WORLD_DEPTH} 方块)`);
}

// ===== 2. 关键操作基准测试 =====
console.log('\n--- 基准测试 ---\n');
const results = [];

// 2.1 getExposedPositions — 这是最可能的卡死根源
{
  // 对所有方块类型做一次全扫描，模拟一次完整的网格重建
  const r = measure('getExposedPositions (所有 23 种类型)', () => {
    for (let t = 1; t <= 23; t++) world.getExposedPositions(t);
  }, 1);
  results.push(r);
  console.log(`  ❗ getExposedPositions ×23: ${r.elapsed.toFixed(0)}ms — 如果此项 > 50ms，是卡死主因`);
}

// 2.2 getExposedPositions 单类型
{
  const r = measure('getExposedPositions (单类型)', () => world.getExposedPositions(3), 3);
  results.push(r);
}

// 2.3 getBlockCounts (全量扫描)
{
  const r = measure('getBlockCounts', () => world.getBlockCounts(), 3);
  results.push(r);
}

// 2.4 setBlock + dirty propagation
{
  const r = measure('setBlock ×20 (含 dirty 传播)', () => {
    for (let i = 0; i < 20; i++) {
      world.setBlock(10 + i % 5, 5 + i % 3, 10 + Math.floor(i/5), BLOCK.STONE);
    }
  }, 5);
  results.push(r);
}

// 2.5 isExposed (单次)
const exposedPositions = world.getExposedPositions(3);
const testPos = exposedPositions[0] || [10, 5, 10];
{
  const r = measure('isExposed (单次)', () => world.isExposed(...testPos), 10000);
  results.push(r);
}

// 2.6 getBlock (单次)
{
  const r = measure('getBlock (单次)', () => world.getBlock(...testPos), 100000);
  results.push(r);
}

// 2.7 index (单次)
{
  const r = measure('index (单次)', () => world.index(64, 32, 64), 100000);
  results.push(r);
}

// 2.8 inBounds (单次)
{
  const r = measure('inBounds (单次)', () => world.inBounds(64, 32, 64), 100000);
  results.push(r);
}

// ===== 3. 模拟高频操作场景 =====
console.log('\n--- 场景模拟 ---\n');

// 场景 A: 连续破坏方块 (1秒内破坏10个方块)
console.log('  场景 A: 连续破坏 10 个方块...');
world.dirtyTypes.clear();
const startA = performance.now();
for (let i = 0; i < 10; i++) {
  world.setBlock(20 + i, 10, 20, BLOCK.AIR);
}
const setPhase = performance.now() - startA;

// 模拟 updateDirtyMeshes — 对每个 dirty type 做 getExposedPositions
const dirtyTypes = [...world.dirtyTypes];
let meshRebuildTime = 0;
for (const type of dirtyTypes) {
  const t = performance.now();
  world.getExposedPositions(type);
  meshRebuildTime += performance.now() - t;
}
const totalA = performance.now() - startA;
results.push({
  label: '场景 A: 破坏 10 方块 (setBlock + mesh rebuild)',
  elapsed: totalA,
  avg: totalA,
  iterations: 1,
  heapDelta: 0,
});
console.log(`  破坏 10 方块: setBlock=${setPhase.toFixed(1)}ms, mesh重建=${meshRebuildTime.toFixed(1)}ms (${dirtyTypes.length} 种类型), 总计=${totalA.toFixed(1)}ms`);

// 场景 B: 爆炸范围修改 (模拟Creeper, 3×3×3区域)
console.log('  场景 B: Creeper 爆炸 (3×3×3 区域破坏)...');
world.dirtyTypes.clear();
const startB = performance.now();
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(25 + dx, 10 + dy, 25 + dz, BLOCK.AIR);
    }
  }
}
const setPhaseB = performance.now() - startB;
const dirtyTypesB = [...world.dirtyTypes];
let meshRebuildTimeB = 0;
for (const type of dirtyTypesB) {
  const t = performance.now();
  world.getExposedPositions(type);
  meshRebuildTimeB += performance.now() - t;
}
const totalB = performance.now() - startB;
results.push({
  label: '场景 B: 爆炸 27 方块 (setBlock + mesh rebuild)',
  elapsed: totalB,
  avg: totalB,
  iterations: 1,
  heapDelta: 0,
});
console.log(`  爆炸: setBlock=${setPhaseB.toFixed(1)}ms, mesh重建=${meshRebuildTimeB.toFixed(1)}ms (${dirtyTypesB.length} 种类型), 总计=${totalB.toFixed(1)}ms`);

// ===== 4. 生成诊断报告 =====
console.log('\n--- 诊断报告 ---\n');

// 判断瓶颈
const exposedAllTime = results[0].elapsed;
const sceneATime = totalA;
const sceneBTime = totalB;

const findings = [];
if (exposedAllTime > 50) {
  findings.push('🔴 严重: getExposedPositions 全类型扫描 ' + exposedAllTime.toFixed(0) + 'ms — 主卡死根源');
  findings.push('   每次破坏/放置方块后，游戏会对所有受影响类型做全量世界扫描 (524,288 方块/类型)');
  findings.push('   建议: 在 renderer.js 中限制每帧最多重建 2 种类型，避免单帧卡死');
}
if (sceneATime > 100) {
  findings.push('🔴 严重: 连续破坏场景 ' + sceneATime.toFixed(0) + 'ms — 高频操作卡死');
  findings.push('   玩家快速连续破坏时，每帧都在重建网格');
  findings.push('   建议: 引入脏类型队列，每帧只处理前 N 种');
}
if (sceneBTime > 200) {
  findings.push('🔴 严重: 爆炸场景 ' + sceneBTime.toFixed(0) + 'ms — 瞬间大量方块变化');
  findings.push('   建议: 爆炸破坏使用批量重建，或延迟重建');
}
if (results.find(r => r.label.includes('isExposed') && r.avg * 10000 > 50)) {
  findings.push('🟡 注意: isExposed 单次调用较慢，批量调用时累积明显');
}

// 没有严重问题的输出
if (findings.length === 0) {
  findings.push('✅ 未检测到严重性能瓶颈');
} else {
  findings.push('');
  findings.push('建议优化:');
  findings.push('1. renderer.js updateDirtyMeshes: 每帧限重建 2 种类型');
  findings.push('2. 世界扫描改为增量更新 (仅扫描变化区域)');
  findings.push('3. 爆炸等批量操作使用延迟重建');
}

// ===== 5. 输出汇总表格 =====
console.log('\n结果汇总:');
console.log('='.repeat(100));
console.log(`| ${'操作'.padEnd(45)} | ${'总耗时'.padStart(10)} | ${'平均'.padStart(10)} |`);
console.log('='.repeat(100));
for (const r of results) {
  console.log(reportLine(r));
}
console.log('='.repeat(100));
console.log(`| ${'总计'.padEnd(45)} | ${totalTime.toFixed(1).padStart(10)}ms |${' '.repeat(11)}|`);
console.log('');

for (const f of findings) console.log('  ' + f);

// ===== 6. 写入文件 =====
const content = `# AICraft 诊断报告

生成时间: ${new Date().toLocaleString('zh-CN')}
世界大小: ${WORLD_WIDTH}×${WORLD_HEIGHT}×${WORLD_DEPTH} = ${WORLD_WIDTH * WORLD_HEIGHT * WORLD_DEPTH} 方块

## 基准测试结果

| 操作 | 总耗时 | 平均 |
|------|--------|------|
${results.map(r => `| ${r.label} | ${r.elapsed.toFixed(1)}ms | ${r.avg.toFixed(3)}ms${r.iterations > 1 ? ' (' + (1000/r.avg).toFixed(0) + ' ops/s)' : ''} |`).join('\n')}

## 场景模拟

- **场景 A (连续破坏 10 方块)**: setBlock ${setPhase.toFixed(1)}ms + mesh重建 ${meshRebuildTime.toFixed(1)}ms = 总计 ${totalA.toFixed(1)}ms
- **场景 B (爆炸 27 方块)**: setBlock ${setPhaseB.toFixed(1)}ms + mesh重建 ${meshRebuildTimeB.toFixed(1)}ms = 总计 ${totalB.toFixed(1)}ms

## 诊断结论

${findings.join('\n')}
`;

try {
  writeFileSync(REPORT_PATH, content, 'utf8');
  console.log(`\n报告已保存到: ${REPORT_PATH}`);
} catch (e) {
  // logs dir might not exist
}

// 返回退出码 — 如果有严重问题则 exit 1
if (findings.some(f => f.startsWith('🔴 严重'))) {
  console.log('\n⚠️  检测到严重性能问题，建议修复后再运行游戏');
  process.exit(1);
} else {
  console.log('\n✅ 系统运行正常');
  process.exit(0);
}
