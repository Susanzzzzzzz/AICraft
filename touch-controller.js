/**
 * TouchController - 移动端触摸控制
 * 将触摸事件转换为 Input 类 API
 * 独立模块，不导入任何外部依赖
 */

export class TouchController {
  constructor(input) {
    this.input = input;
    this.active = false;
    this.element = null;

    // Joystick state
    this.joystick = { dx: 0, dy: 0, touchId: null };

    // Camera drag state
    this.cameraDrag = { active: false, touchId: null, lastX: 0, lastY: 0 };

    // Sensitivity
    this.cameraSensitivity = 0.5;

    // Action buttons state - track held button timeouts/intervals
    this._heldButtons = {};

    // DOM references
    this._dom = {};
  }

  /**
   * 检测触摸设备
   */
  static detectTouchDevice() {
    return 'ontouchstart' in window && window.innerWidth < 1024;
  }

  /**
   * 初始化：创建 DOM，绑定事件
   */
  init() {
    if (this.element) return;

    // 主容器
    const container = document.createElement('div');
    container.id = 'touch-controls';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 60;
      pointer-events: none;
      touch-action: none;
    `;
    this.element = container;

    this._dom.container = container;

    // 创建各区域
    this.createJoystick();
    this.createCameraDrag();
    this.createActionButtons();

    document.body.appendChild(container);

    // 默认隐藏
    this.hide();
  }

  /**
   * 销毁：移除 DOM，解绑事件
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._dom = {};
    this.joystick = { dx: 0, dy: 0, touchId: null };
    this.cameraDrag = { active: false, touchId: null, lastX: 0, lastY: 0 };

    // 清除所有 held 定时器
    for (const key of Object.keys(this._heldButtons)) {
      if (this._heldButtons[key]) {
        clearInterval(this._heldButtons[key]);
      }
    }
    this._heldButtons = {};

    this.active = false;
  }

  /**
   * 显示触摸控件
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block';
    }
    this.active = true;
    if (this.input && typeof this.input.setTouchMode === 'function') {
      this.input.setTouchMode(true);
    } else if (this.input) {
      this.input._touchMode = true;
    }
  }

  /**
   * 隐藏触摸控件
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
    this.active = false;
    if (this.input && typeof this.input.setTouchMode === 'function') {
      this.input.setTouchMode(false);
    } else if (this.input) {
      this.input._touchMode = false;
    }
  }

  /**
   * 更新（每帧调用 - 目前事件是实时响应的，此方法可为空）
   */
  update() {
    // 事件已通过 touch 事件实时处理，无需每帧额外操作
  }

  /**
   * 创建摇杆
   */
  createJoystick() {
    const area = document.createElement('div');
    area.className = 'touch-joystick-area';
    area.style.cssText = `
      position: absolute;
      left: 0;
      bottom: 0;
      width: 35vw;
      height: 55vh;
      pointer-events: none;
      touch-action: none;
    `;

    const base = document.createElement('div');
    base.className = 'touch-joystick-base';
    base.style.cssText = `
      position: absolute;
      width: min(90px, 16vw);
      height: min(90px, 16vw);
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.3);
      bottom: 90px;
      left: 20px;
      pointer-events: auto;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    `;

    const knob = document.createElement('div');
    knob.className = 'touch-joystick-knob';
    knob.style.cssText = `
      width: min(36px, 6vw);
      height: min(36px, 6vw);
      border-radius: 50%;
      background: rgba(255,255,255,0.4);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    `;

    base.appendChild(knob);
    area.appendChild(base);
    this.element.appendChild(area);

    this._dom.joystickArea = area;
    this._dom.joystickBase = base;
    this._dom.joystickKnob = knob;

    // --- 摇杆触摸事件 ---
    const baseRect = () => base.getBoundingClientRect();
    const radius = 45; // base 宽度的一半
    const knobRadius = 18; // knob 宽度的一半
    const maxDist = radius - knobRadius;

    const onStart = (e) => {
      e.preventDefault();
      if (this.joystick.touchId !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      this.joystick.touchId = touch.identifier;
      this._updateJoystickPosition(touch, baseRect, maxDist);
    };

    const onMove = (e) => {
      e.preventDefault();
      if (this.joystick.touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystick.touchId) {
          this._updateJoystickPosition(touch, baseRect, maxDist);
          break;
        }
      }
    };

    const onEnd = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystick.touchId) {
          // 重置摇杆
          this.joystick.dx = 0;
          this.joystick.dy = 0;
          this.joystick.touchId = null;
          this._dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
          this._updateKeys();
          break;
        }
      }
    };

    const onCancel = (e) => {
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joystick.touchId = null;
      if (this._dom.joystickKnob) {
        this._dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
      this._updateKeys();
    };

    base.addEventListener('touchstart', onStart, { passive: false });
    base.addEventListener('touchmove', onMove, { passive: false });
    base.addEventListener('touchend', onEnd, { passive: false });
    base.addEventListener('touchcancel', onCancel, { passive: false });

    this._dom.joystickListeners = { onStart, onMove, onEnd, onCancel };
  }

  /**
   * 更新摇杆位置和位移量
   */
  _updateJoystickPosition(touch, baseRect, maxDist) {
    const rect = baseRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = touch.clientX - centerX;
    const rawDy = touch.clientY - centerY;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    let dx = rawDx;
    let dy = rawDy;
    if (dist > maxDist) {
      dx = (rawDx / dist) * maxDist;
      dy = (rawDy / dist) * maxDist;
    }

    // 归一化到 [-1, 1]
    this.joystick.dx = dx / maxDist;
    this.joystick.dy = dy / maxDist;

    // 移动 knob
    this._dom.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

    this._updateKeys();
  }

  /**
   * 根据摇杆状态更新 WASD 按键
   */
  _updateKeys() {
    const deadZone = 0.25;
    const { dx, dy } = this.joystick;
    this.input.keys['KeyW'] = dy < -deadZone;
    this.input.keys['KeyS'] = dy > deadZone;
    this.input.keys['KeyA'] = dx < -deadZone;
    this.input.keys['KeyD'] = dx > deadZone;
  }

  /**
   * 创建摄像机拖拽区域
   */
  createCameraDrag() {
    const area = document.createElement('div');
    area.className = 'touch-camera-area';
    area.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      width: 40vw;
      height: 60vh;
      pointer-events: auto;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    `;

    this.element.appendChild(area);
    this._dom.cameraArea = area;

    const onStart = (e) => {
      e.preventDefault();
      if (this.cameraDrag.touchId !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      this.cameraDrag.touchId = touch.identifier;
      this.cameraDrag.lastX = touch.clientX;
      this.cameraDrag.lastY = touch.clientY;
    };

    const onMove = (e) => {
      e.preventDefault();
      if (this.cameraDrag.touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.cameraDrag.touchId) {
          const dx = touch.clientX - this.cameraDrag.lastX;
          const dy = touch.clientY - this.cameraDrag.lastY;
          this.input.mouseDeltaX += dx * this.cameraSensitivity;
          this.input.mouseDeltaY += dy * this.cameraSensitivity;
          this.cameraDrag.lastX = touch.clientX;
          this.cameraDrag.lastY = touch.clientY;
          break;
        }
      }
    };

    const onEnd = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.cameraDrag.touchId) {
          this.cameraDrag.touchId = null;
          break;
        }
      }
    };

    const onCancel = (e) => {
      this.cameraDrag.touchId = null;
    };

    area.addEventListener('touchstart', onStart, { passive: false });
    area.addEventListener('touchmove', onMove, { passive: false });
    area.addEventListener('touchend', onEnd, { passive: false });
    area.addEventListener('touchcancel', onCancel, { passive: false });

    this._dom.cameraListeners = { onStart, onMove, onEnd, onCancel };
  }

  /**
   * 创建操作按钮
   */
  createActionButtons() {
    // --- 底部动作行 ---
    const actionRow = document.createElement('div');
    actionRow.className = 'touch-action-row';
    actionRow.style.cssText = `
      position: absolute;
      bottom: 15px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      align-items: center;
      pointer-events: none;
      touch-action: none;
    `;

    const actionButtons = [
      { label: '跳', action: 'jump', small: false },
      { label: '挖', action: 'break', small: false, extraClass: 'touch-btn-break' },
      { label: '放', action: 'place', small: false, extraClass: 'touch-btn-place' },
      { label: '闪', action: 'dodge', small: true },
    ];

    for (const btn of actionButtons) {
      const el = document.createElement('button');
      el.textContent = btn.label;
      el.dataset.action = btn.action;

      let btnStyle = `
        pointer-events: auto;
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        border: none;
        border-radius: 50%;
        color: #fff;
        font-size: min(16px, 2.5vw);
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: default;
      `;

      if (btn.small) {
        btnStyle += `
          width: min(36px, 6vw);
          height: min(36px, 6vw);
          background: rgba(255,255,255,0.2);
          font-size: min(11px, 1.8vw);
        `;
      } else {
        btnStyle += `
          width: min(44px, 7vw);
          height: min(44px, 7vw);
          background: rgba(255,255,255,0.25);
          font-size: min(12px, 2vw);
        `;
      }

      if (btn.extraClass === 'touch-btn-break') {
        btnStyle += ` background: rgba(244,67,54,0.4); `;
      } else if (btn.extraClass === 'touch-btn-place') {
        btnStyle += ` background: rgba(33,150,243,0.4); `;
      }

      el.style.cssText = btnStyle;
      actionRow.appendChild(el);
    }

    this.element.appendChild(actionRow);
    this._dom.actionRow = actionRow;
    this._dom.actionButtons = actionRow.querySelectorAll('button');

    // --- 右上角功能按钮 ---
    const funcRow = document.createElement('div');
    funcRow.className = 'touch-function-row';
    funcRow.style.cssText = `
      position: absolute;
      right: 8px;
      top: 60px;
      display: flex;
      flex-wrap: wrap;
      width: 126px;
      gap: 8px;
      justify-content: center;
      pointer-events: none;
      touch-action: none;
    `;

    const funcButtons = [
      { label: '交互', action: 'interact' },
      { label: '技能', action: 'skillUseExplore' },
      { label: '切换', action: 'skillCycleExplore' },
      { label: '武器', action: 'weaponSwitch' },
      { label: '飞行', action: 'flight' },
      { label: '视角', action: 'toggleCamera' },
      { label: '帮助', action: 'help' },
    ];

    for (const btn of funcButtons) {
      const el = document.createElement('button');
      el.textContent = btn.label;
      el.dataset.action = btn.action;
      el.style.cssText = `
        width: min(36px, 6vw);
        height: min(36px, 6vw);
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        border: none;
        color: #fff;
        font-size: min(12px, 2vw);
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        touch-action: none;
        cursor: default;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      `;
      funcRow.appendChild(el);
    }

    this.element.appendChild(funcRow);
    this._dom.funcRow = funcRow;

    // --- 左上角暂停按钮 ---
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'touch-btn-pause';
    pauseBtn.textContent = '⏸'; // ⏸
    pauseBtn.dataset.action = 'escape';
    pauseBtn.style.cssText = `
      position: absolute;
      left: 10px;
      top: 60px;
      width: min(44px, 7vw);
      height: min(44px, 7vw);
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: none;
      color: #fff;
      font-size: min(20px, 3vw);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      touch-action: none;
      cursor: default;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    `;
    this.element.appendChild(pauseBtn);
    this._dom.pauseBtn = pauseBtn;

    // --- 绑定所有按钮事件 ---
    const allButtons = this.element.querySelectorAll('button[data-action]');
    for (const btn of allButtons) {
      this._bindActionButton(btn);
    }
  }

  /**
   * 绑定单个动作按钮的触摸事件
   */
  _bindActionButton(btn) {
    const action = btn.dataset.action;

    const onStart = (e) => {
      e.preventDefault();
      this._handleActionStart(action, e);
    };

    const onEnd = (e) => {
      e.preventDefault();
      this._handleActionEnd(action, e);
    };

    const onCancel = (e) => {
      this._handleActionEnd(action, e);
    };

    btn.addEventListener('touchstart', onStart, { passive: false });
    btn.addEventListener('touchend', onEnd, { passive: false });
    btn.addEventListener('touchcancel', onCancel, { passive: false });

    // 保存引用以便清理
    if (!this._dom._btnListeners) this._dom._btnListeners = new Map();
    this._dom._btnListeners.set(btn, { onStart, onEnd, onCancel });
  }

  /**
   * 处理按钮按下
   */
  _handleActionStart(action, e) {
    switch (action) {
      case 'break':
        this.input.mouseButtons[0] = true;
        this.input._actions.push('break');
        this.input._actions.push('attack');
        // 启动 held 间隔
        if (this._heldButtons['break']) {
          clearInterval(this._heldButtons['break']);
        }
        this._heldButtons['break'] = setInterval(() => {
          this.input._actions.push('break');
          this.input._actions.push('attack');
        }, 200);
        break;

      case 'place':
        this.input.mouseButtons[2] = true;
        this.input._actions.push('place');
        break;

      case 'jump':
        this.input._actions.push('jump');
        break;

      case 'dodge':
        this.input._actions.push('dodge_KeyW');
        this.input._actions.push('dodge_KeyS');
        this.input._actions.push('dodge_KeyA');
        this.input._actions.push('dodge_KeyD');
        this.input._actions.push('dodge_KeyShiftLeft');
        this.input._actions.push('dodge_KeySpace');
        break;

      case 'skillUseExplore':
        this.input._actions.push('skillUseExplore');
        break;

      case 'skillCycleExplore':
        this.input._actions.push('skillCycleExplore');
        break;

      case 'interact':
        this.input._actions.push('interact');
        break;

      case 'weaponSwitch':
        this.input._actions.push('weaponSwitch');
        break;

      case 'flight':
        this.input._actions.push('flight');
        break;

      case 'block':
        this.input.mouseButtons[3] = true;
        this.input._actions.push('block');
        break;

      case 'escape':
        this.input._actions.push('escape');
        break;

      default:
        this.input._actions.push(action);
        break;
    }
  }

  /**
   * 处理按钮松开/取消
   */
  _handleActionEnd(action, e) {
    switch (action) {
      case 'break':
        this.input.mouseButtons[0] = false;
        if (this._heldButtons['break']) {
          clearInterval(this._heldButtons['break']);
          delete this._heldButtons['break'];
        }
        break;

      case 'place':
        this.input.mouseButtons[2] = false;
        break;

      case 'block':
        this.input.mouseButtons[3] = false;
        break;

      default:
        break;
    }
  }
}
