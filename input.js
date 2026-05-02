// Input module — keyboard, mouse, PointerLock
import { BLOCK } from './world.js';

export class Input {
  constructor() {
    this.keys = {};
    this.mouseButtons = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.selectedBlock = BLOCK.GRASS;
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.scrollDelta = 0;
    this.godMode = false; // Flag to tell input when we're in god mode

    // One-shot actions (consumed after read)
    this._actions = [];

    // Block/dodge state
    this.blockActive = false;
    this._keyTimestamps = { KeyW: 0, KeyS: 0, KeyA: 0, KeyD: 0 };
    this._dodgeCooldown = 0;
    this._bowCharging = false;

    this._bound = {};

    // New interaction state
    this._touchMode = false;
    this._typing = false;
    this._typingBuffer = '';
    this._typingSubmitBuffer = null;
    this._typingDisplayEl = null;
  }

  init(canvas) {
    this.canvas = canvas;
    canvas.style.touchAction = 'none';

    // Pointer lock
    this._bound.onPointerLockChange = () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) {
        this.mouseButtons = {}; // Clear mouse state on lock loss
      }
    };
    document.addEventListener('pointerlockchange', this._bound.onPointerLockChange);

    // Mouse move
    this._bound.onMouseMove = (e) => {
      if (this.locked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    };
    document.addEventListener('mousemove', this._bound.onMouseMove);

    // Mouse buttons
    this._bound.onMouseDown = (e) => {
      if (!this.locked) {
        if (e.button === 0 || e.button === 2) {
          this.requestLock();
          return;
        }
      }
      if (this.locked) {
        // Prevent browser gesture nav (swipe back/forward) on right-click drag
        if (e.button === 2) e.preventDefault();

        this.mouseButtons[e.button] = true;
        if (e.button === 0) {
          this._actions.push('break');
          this._actions.push('attack');  // left-click also triggers attack detection
        }
        if (e.button === 1) {
          // Middle-click: pick block
          this._actions.push('pick');
        }
        if (e.button === 2) {
          if (e.ctrlKey) {
            // Ctrl+right-click: toggle light
            this._actions.push('light');
          } else {
            // Right-click: place block (blocking moved to G key)
            this._actions.push('place');
          }
        }
      }
    };
    canvas.addEventListener('mousedown', this._bound.onMouseDown);

    this._bound.onMouseUp = (e) => {
      this.mouseButtons[e.button] = false;
      if (e.button === 2 && this.locked) e.preventDefault();
    };
    canvas.addEventListener('mouseup', this._bound.onMouseUp);

    // Prevent browser gesture navigation on right-click + drag
    this._bound.onPointerDown = (e) => {
      if (e.button === 2 && this.locked) { e.preventDefault(); }
    };
    document.addEventListener('pointerdown', this._bound.onPointerDown);

    // Prevent context menu on both canvas and document
    // (when pointer lock is lost, right-click may target document body instead of canvas)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard
    this._bound.onKeyDown = (e) => {
      // --- Entry into typing mode (when not currently typing) ---
      if (!this._typing) {
        if (e.code === 'KeyT') {
          this._typing = true;
          this._typingBuffer = '';
          this.updateTypingDisplay();
          return;
        }
        if (e.code === 'Slash') {
          this._typing = true;
          this._typingBuffer = '/';
          this.updateTypingDisplay();
          return;
        }
        if (e.code === 'Backquote') {
          this._typing = true;
          this._typingBuffer = '`';
          this.updateTypingDisplay();
          return;
        }
      }

      // --- Typing mode handling (when currently typing) ---
      if (this._typing) {
        if (e.code === 'Escape') {
          this._typing = false;
          this._typingBuffer = '';
          this.updateTypingDisplay();
          return;
        }
        if (e.code === 'Enter') {
          this._typingSubmitBuffer = this._typingBuffer;
          this._typing = false;
          this._typingBuffer = '';
          this._actions.push('_typingSubmit');
          this.updateTypingDisplay();
          return;
        }
        if (e.code === 'Backspace') {
          this._typingBuffer = this._typingBuffer.slice(0, -1);
          this.updateTypingDisplay();
          return;
        }
        if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
          // Movement keys work while typing
          this.keys[e.code] = true;
          const now = performance.now();
          const last = this._keyTimestamps[e.code] || 0;
          if (now - last < 300 && now - last > 50) {
            this._actions.push('dodge_' + e.code);
          }
          this._keyTimestamps[e.code] = now;
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey &&
            e.code !== 'Space' && e.code !== 'KeyF') {
          // Printable keys (except function keys that need to fall through)
          this._typingBuffer += e.key;
          this.updateTypingDisplay();
          return;
        }
        // Fall through for function keys (Tab, Shift, F, F5, F6, Space, etc.)
      }

      this.keys[e.code] = true;

      // Number keys for block selection
      if (e.code >= 'Digit1' && e.code <= 'Digit8') {
        const type = parseInt(e.code.charAt(5));
        if (type >= 1 && type <= 8) this.selectedBlock = type;
        this._actions.push('slot' + type);
      }

      // R for cycle item (was reset, now cycle item)
      if (e.code === 'KeyR') {
        this._actions.push('cycleItem');
      }

      // F5 for camera toggle
      if (e.code === 'F5') {
        e.preventDefault();
        this._actions.push('toggleCamera');
      }

      // F3 for diagnostics overlay
      if (e.code === 'F3') {
        e.preventDefault();
        this._actions.push('diagnostics');
      }

      // Tab for flight toggle (was on KeyF, moved to Tab)
      if (e.code === 'Tab') {
        e.preventDefault();
        this._actions.push('flight');
      }

      // F for camera mode cycle (was ortho)
      if (e.code === 'KeyF') {
        this._actions.push('toggleCamera');
      }

      // F6 for day/night speed toggle
      if (e.code === 'F6') {
        e.preventDefault();
        this._actions.push('daySpeed');
      }

      // E for interact
      if (e.code === 'KeyE') {
        this._actions.push('interact');
      }

      // Q for weapon switch
      if (e.code === 'KeyQ') {
        e.preventDefault();
        this._actions.push('weaponSwitch');
      }

      // X for skill use
      if (e.code === 'KeyX') {
        e.preventDefault();
        this._actions.push('skillUseExplore');
      }

      // C for skill cycle
      if (e.code === 'KeyC') {
        e.preventDefault();
        this._actions.push('skillCycleExplore');
      }

      // G for block (was right-click, now G key)
      if (e.code === 'KeyG') {
        this.blockActive = true;
        this._actions.push('block');
      }

      // H for help (new - help panel toggle)
      if (e.code === 'KeyH') {
        this._actions.push('help');
      }

      // ESC for UI escape/back
      if (e.code === 'Escape') {
        this._actions.push('escape');
      }

      // Dodge detection
      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD') {
        const now = performance.now();
        const last = this._keyTimestamps[e.code] || 0;
        if (now - last < 300 && now - last > 50) {
          this._actions.push('dodge_' + e.code);
        }
        this._keyTimestamps[e.code] = now;
      }

      // Space
      if (e.code === 'Space') {
        e.preventDefault();
        this._actions.push('jump');
      }

      // Arrow key mouse emulation
      if (e.code === 'ArrowUp') {
        this.mouseDeltaY -= 2;
        e.preventDefault();
      }
      if (e.code === 'ArrowDown') {
        this.mouseDeltaY += 2;
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft') {
        this.mouseDeltaX -= 2;
        e.preventDefault();
      }
      if (e.code === 'ArrowRight') {
        this.mouseDeltaX += 2;
        e.preventDefault();
      }

      // Enter click emulation (when NOT typing)
      if (e.code === 'Enter') {
        this._actions.push('break');
        this._actions.push('attack');
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', this._bound.onKeyDown);

    this._bound.onKeyUp = (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyG') {
        this.blockActive = false;
      }
    };
    document.addEventListener('keyup', this._bound.onKeyUp);

    // Scroll wheel for block selection
    this._bound.onWheel = (e) => {
      if (this.locked) {
        this.scrollDelta += e.deltaY;
      }
    };
    canvas.addEventListener('wheel', this._bound.onWheel);
  }

  requestLock() {
    if (this._touchMode) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  update() {
    // Apply mouse delta to yaw/pitch
    const sensitivity = 0.002;
    this.yaw -= this.mouseDeltaX * sensitivity;

    // Typing mode doesn't consume mouse delta (mouse still works)
    // Save raw delta for god pitch before clearing
    this._godPitchDelta = this.mouseDeltaY;

    this.pitch -= this.mouseDeltaY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 * 0.99, Math.min(Math.PI / 2 * 0.99, this.pitch));

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    // Scroll handles god camera height only
    if (Math.abs(this.scrollDelta) > 50 && this.godMode) {
      const dir = this.scrollDelta > 0 ? 1 : -1;
      this._godHeightDelta = (this._godHeightDelta || 0) + dir * 2;
      this.scrollDelta = 0;
    }
    this.scrollDelta *= 0.8;
    if (Math.abs(this.scrollDelta) < 1) this.scrollDelta = 0;

    // Update block active state (cleared each frame, set by consumeAction('block') in main.js)
    // Main.js calls block/place logic per frame

    // Dodge cooldown
    if (this._dodgeCooldown > 0) this._dodgeCooldown -= 0.016;
  }

  // Consume god height delta (called by camera controller)
  consumeGodHeightDelta() {
    const delta = this._godHeightDelta || 0;
    this._godHeightDelta = 0;
    return delta;
  }

  // Consume god pitch delta from mouse
  consumeGodPitchDelta() {
    const delta = this._godPitchDelta || 0;
    this._godPitchDelta = 0;
    return delta;
  }

  consumeAction(action) {
    const idx = this._actions.indexOf(action);
    if (idx !== -1) {
      this._actions.splice(idx, 1);
      return true;
    }
    return false;
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  isBlocking() {
    return this.blockActive;
  }

  canDodge() {
    return this._dodgeCooldown <= 0;
  }

  setDodgeCooldown() {
    this._dodgeCooldown = 2.0; // 2 second cooldown
  }

  isBowCharging() {
    return this._bowCharging;
  }

  getForward() {
    return [
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    ];
  }

  getForwardFlat() {
    return [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)];
  }

  // --- New methods ---

  setTouchMode(v) {
    this._touchMode = v;
  }

  isTyping() {
    return this._typing;
  }

  getTypingBuffer() {
    return this._typingSubmitBuffer;
  }

  setTypingDisplay(el) {
    this._typingDisplayEl = el;
  }

  consumeTypingSubmit() {
    const v = this._typingSubmitBuffer;
    this._typingSubmitBuffer = null;
    return v;
  }

  updateTypingDisplay() {
    if (this._typingDisplayEl) {
      this._typingDisplayEl.textContent = this._typingBuffer;
    }
  }
}

/**
 * Parse a chat command string.
 * Returns null for non-command strings, or a parsed command object.
 * @param {string} inputStr
 * @returns {object|null}
 */
export function parseCommand(inputStr) {
  if (!inputStr.startsWith('/')) return null;
  const parts = inputStr.slice(1).trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'tp': {
      if (args.length < 3) return { cmd, valid: false, error: '用法: /tp <x> <y> <z>' };
      return { cmd, valid: true, x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2]) };
    }
    case 'give': {
      return { cmd, valid: true, item: args[0] || '', count: args[1] ? Math.max(1, parseInt(args[1])) : 1 };
    }
    case 'time': {
      const v = parseFloat(args[0]);
      if (isNaN(v) || v < 0 || v > 1) return { cmd, valid: false, error: '用法: /time <0-1>' };
      return { cmd, valid: true, value: v };
    }
    case 'fly': {
      return { cmd, valid: true };
    }
    case 'help': {
      return { cmd, valid: true };
    }
    default:
      return { cmd, valid: false, error: '未知命令: /' + cmd + '，输入 /help 查看可用命令' };
  }
}
