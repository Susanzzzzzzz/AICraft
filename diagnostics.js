// AICraft 自诊断模块 — 实时性能监控 + 卡死检测
// 按 F3 切换诊断面板
// 使用方式: import { Diagnostics } from './diagnostics.js'

export class Diagnostics {
  constructor(game) {
    this.game = game;
    this.enabled = false;

    // 帧时间追踪 (滚动窗口, 保留最近 5 秒)
    this._frameTimings = [];
    this._phaseTimings = {};
    this._phaseTimingsSnapshot = {};
    this._currentPhase = null;
    this._phaseStart = 0;
    this._frameStart = 0;
    this._frameCount = 0;
    this._lastSampleTime = 0;

    // 卡死检测 (超过 50ms 计为一次卡死)
    this._freezeEvents = [];
    this._freezeThreshold = 50;

    // 运行时错误追踪
    this._runtimeErrors = [];

    // 实体统计 (每秒采样)
    this._entitySnapshot = { hostiles: 0, animals: 0, slimes: 0, drops: 0, arrows: 0 };

    // DOM 覆盖层
    this._overlay = null;
    this._els = {};
    this._createOverlay();
  }

  // ===== 帧生命周期 =====

  beginFrame() {
    this._frameStart = performance.now();
  }

  endFrame() {
    const elapsed = performance.now() - this._frameStart;
    this._frameTimings.push(elapsed);
    if (this._frameTimings.length > 300) this._frameTimings.shift();
    this._frameCount++;

    // 卡死检测 (先于采样，数据仍有效)
    if (elapsed > this._freezeThreshold) {
      this._recordFreeze(elapsed);
    }

    // 每秒采样 + 更新显示
    const now = performance.now();
    if (now - this._lastSampleTime > 1000) {
      this._snapshot();
      this._sample();
      this._lastSampleTime = now;
      if (this.enabled) this._updateOverlay();
    }
  }

  // ===== 阶段计时 =====

  beginPhase(name) {
    this._currentPhase = name;
    this._phaseStart = performance.now();
  }

  endPhase() {
    if (!this._currentPhase) return;
    const elapsed = performance.now() - this._phaseStart;
    const arr = this._phaseTimings[this._currentPhase];
    if (arr) arr.push(elapsed);
    else this._phaseTimings[this._currentPhase] = [elapsed];
    this._currentPhase = null;
  }

  // 安全执行一个阶段 (带异常保护)
  phase(name, fn) {
    this.beginPhase(name);
    try { fn(); } finally { this.endPhase(); }
  }

  // ===== 卡死检测 =====

  _recordFreeze(duration) {
    this._freezeEvents.push({
      time: performance.now(),
      duration: Math.round(duration),
      culprit: this._guessCulprit(),
    });
    if (this._freezeEvents.length > 20) this._freezeEvents.shift();
  }

  _guessCulprit() {
    let maxAvg = 0;
    let maxPhase = 'unknown';
    for (const [name, timings] of Object.entries(this._phaseTimings)) {
      if (timings.length === 0) continue;
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      if (avg > maxAvg) { maxAvg = avg; maxPhase = name; }
    }
    return maxPhase;
  }

  // ===== 运行时错误追踪 =====

  recordError(err) {
    const msg = err && err.message ? err.message : String(err);
    this._runtimeErrors.push({ time: performance.now(), message: msg });
    if (this._runtimeErrors.length > 10) this._runtimeErrors.shift();
  }

  // ===== 采样 =====

  // 覆盖层读取快照版本，避免显示被清空
  _snapshot() {
    this._phaseTimingsSnapshot = this._phaseTimings;
    this._phaseTimings = {};
  }

  _sample() {
    const g = this.game;
    this._entitySnapshot = {
      hostiles: g.hostiles ? g.hostiles.filter(m => !m.dead).length : 0,
      animals: g.animals ? g.animals.filter(a => !a.dead).length : 0,
      slimes: g.slimes ? g.slimes.filter(s => !s.dead).length : 0,
      drops: g.dropItems ? g.dropItems.filter(d => !d.collected).length : 0,
      arrows: g._arrows ? g._arrows.filter(a => !a._done).length : 0,
      fps: g.fps || 0,
    };
    this._meshRebuildCount = 0;
    this._meshRebuildTime = 0;
  }

  // ===== DOM 覆盖层 =====

  _createOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = [
      'position:fixed;top:0;left:0;width:380px;',
      'background:rgba(0,0,0,0.85);color:#0f0;',
      'font-family:Courier New,monospace;font-size:13px;',
      'padding:8px 12px;z-index:10000;display:none;',
      'border-right:2px solid #0f0;border-bottom:2px solid #0f0;',
      'border-radius:0 0 8px 0;line-height:1.6;',
    ].join('');

    this._overlay.innerHTML = [
      '<div style="font-weight:bold;margin-bottom:4px;">=== DIAGNOSTICS [F3] ===</div>',
      '<span id="di-fps"></span>',
      ' | <span id="di-avg"></span>',
      ' | <span id="di-max"></span>',
      ' | <span id="di-freezes"></span>',
      '<hr style="border-color:#333;margin:2px 0">',
      '<span id="di-entities" style="color:#888"></span>',
      '<hr style="border-color:#333;margin:2px 0">',
      '<div id="di-phases"></div>',
      '<div id="di-errors" style="color:#f44;margin-top:4px;"></div>',
      '<div id="di-freeze-list"></div>',
    ].join('');

    document.body.appendChild(this._overlay);

    this._els = {
      fps: document.getElementById('di-fps'),
      avg: document.getElementById('di-avg'),
      max: document.getElementById('di-max'),
      freezes: document.getElementById('di-freezes'),
      entities: document.getElementById('di-entities'),
      phases: document.getElementById('di-phases'),
      errors: document.getElementById('di-errors'),
      freezeList: document.getElementById('di-freeze-list'),
    };
  }

  _updateOverlay() {
    const e = this._entitySnapshot;
    const timings = this._frameTimings;
    const n = timings.length;
    const avg = n > 0 ? timings.reduce((a, b) => a + b, 0) / n : 0;
    const max = n > 0 ? Math.max(...timings) : 0;
    const freezeCount = this._freezeEvents.length;
    const recentFreezes = this._freezeEvents.slice(-5);

    // 颜色编码
    const color = (v, g, y) => v < g ? '#0f0' : v < y ? '#ff0' : '#f00';

    this._setVal('fps', `FPS: ${e.fps}`, color(e.fps, 30, 20));
    this._setVal('avg', `avg: ${avg.toFixed(1)}ms`, color(avg, 16, 33));
    this._setVal('max', `max: ${max.toFixed(1)}ms`, color(max, 33, 50));
    this._setVal('freezes', `freezes: ${freezeCount}`, freezeCount > 0 ? '#f44' : '#0f0');
    this._els.entities.textContent =
      `👾${e.hostiles} 🐷${e.animals} 🟢${e.slimes} ✨${e.drops} 🏹${e.arrows}`;

    // 阶段耗时
    let phasesHtml = '';
    for (const [name, timings] of Object.entries(this._phaseTimingsSnapshot)) {
      if (timings.length === 0) continue;
      const rawAvg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const c = color(rawAvg, 5, 15);
      phasesHtml += `<span style="color:${c}">  ▸ ${name}: ${rawAvg.toFixed(1)}ms</span><br>`;
    }
    this._els.phases.innerHTML = phasesHtml;

    // 卡死事件
    if (recentFreezes.length > 0) {
      this._els.freezeList.innerHTML = recentFreezes.map(f =>
        `<span style="color:#f44">  🛑 ${f.duration}ms — ${f.culprit}</span>`
      ).join('<br>');
    } else {
      this._els.freezeList.innerHTML = '';
    }

    // 运行时错误
    if (this._runtimeErrors.length > 0) {
      const last = this._runtimeErrors.slice(-3);
      this._els.errors.innerHTML = '⚠ ' + last.map(e => e.message).join('<br>⚠ ');
    } else {
      this._els.errors.innerHTML = '';
    }
  }

  _setVal(key, text, color) {
    const el = this._els[key];
    if (el) { el.textContent = text; el.style.color = color; }
  }

  toggle() {
    this.enabled = !this.enabled;
    this._overlay.style.display = this.enabled ? 'block' : 'none';
    if (this.enabled) {
      this._frameTimings = [];
      this._freezeEvents = [];
      this._phaseTimings = {};
      this._phaseTimingsSnapshot = {};
      this._runtimeErrors = [];
      this._lastSampleTime = 0;
    }
  }

  // ===== 控制台调用 =====
  report() {
    const timings = this._frameTimings;
    const avg = timings.length > 0
      ? (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(1) : 'N/A';
    const freezeRate = this._frameCount > 0
      ? ((this._freezeEvents.length / this._frameCount) * 100).toFixed(1) : 'N/A';

    return {
      status: parseFloat(avg) < 33 ? '✅ 正常' : '⚠️ 卡顿',
      avgFrameTime: avg + 'ms',
      freezeRate: freezeRate + '%',
      totalFreezes: this._freezeEvents.length,
      entities: this._entitySnapshot,
      recentFreezes: this._freezeEvents.slice(-5).map(f =>
        `${f.duration}ms @ ${new Date(f.time).toISOString().slice(11,19)} (${f.culprit})`
      ),
      runtimeErrors: this._runtimeErrors.map(e => e.message),
    };
  }
}
