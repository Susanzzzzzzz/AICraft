## Jump Coyote Time — 规格

## 能力描述

为跳跃加入 Coyote Time（离地缓冲），玩家在离开地面后的短时间内仍可触发跳跃，减少因帧率波动或碰撞精度导致的跳跃输入丢失。

## 功能要求

### JC-1: Coyote Time 实现
- 在 `player.js` 中添加常量 `COYOTE_TIME = 0.1`（100ms）
- 添加 `this.coyoteTimer = 0` 在构造函数或 `reset()` 中初始化
- 每帧 `update()` 中更新：
  ```js
  if (this.onGround) {
    this.coyoteTimer = COYOTE_TIME;
  } else {
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
  }
  ```
- `onGround` 在 `resolveCollisionY()` 中每帧重置为 `false`，如果检测到地面方块则置为 `true`

### JC-2: 跳跃条件修改
- 原跳跃判定（`player.js:119-124`）：
  ```js
  if (input.consumeAction('jump') && this.onGround && canJump)
  ```
- 改为：
  ```js
  if (input.peekAction('jump') && (this.onGround || this.coyoteTimer > 0) && canJump)
  ```
  或等价实现，确保跳跃输入不被过早消费

### JC-3: 与飞行模式兼容
- 飞行模式下 `isFlying = true`，`canJump` 为 `false`
- Coyote Time 不影响飞行模式行为

### JC-4: 场景验证
- **当** 玩家从方块边缘走出，在 100ms 内按下跳跃
- **则** 跳跃正常触发
- **当** 玩家在空中超过 100ms 后按跳跃
- **则** 跳跃不触发（正常行为）
