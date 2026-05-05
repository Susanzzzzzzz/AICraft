# Camera & View Controls — 规格

## 能力描述

重构视角控制方案，统一快捷键行为，移除未实现的冗余功能。

## 输入

- 键盘: F 键、Shift 键、F5 键

## 输出

- 视角模式切换 (第一人称/第三人称背/第三人称前/上帝视角)
- 缩放效果 (可选)

## 功能要求

### C-1: F 键切换视角

当前 F 键触发正交投影开关 (`renderer.toggleOrtho()`)，与用户期望的"切换视角"不符。

- F 键 SHALL 触发 `cameraCtrl.cycleMode()`，循环 4 种视角模式:
  - 第一人称 (CAMERA_FIRST)
  - 第三人称背面 (CAMERA_THIRD_BACK)
  - 第三人称正面 (CAMERA_THIRD_FRONT)
  - 上帝视角 (CAMERA_GOD)
- F5 键 SHALL 改为"无操作"或保留为 toggleCamera 的次选键
- `renderer.toggleOrtho()` 移除或仅在上帝视角下使用

#### Scenario: F 键循环视角
- **GIVEN** 当前为第一人称视角 (`mode = CAMERA_FIRST`)
- **WHEN** 玩家按下 F 键
- **THEN** 视角切换为第三人称背面 (`mode = CAMERA_THIRD_BACK`)
- **AND** 玩家模型变为可见

#### Scenario: 从上帝视角循环回第一人称
- **GIVEN** 当前为上帝视角 (`mode = CAMERA_GOD`)
- **WHEN** 玩家按下 F 键
- **THEN** 视角切换为第一人称 (`mode = CAMERA_FIRST`)

### C-2: 移除 Shift 缩放功能

当前 Shift 仅设置 `_zoomActive` 标记，没有任何实际代码消费该标记。

- Shift 键 SHALL 不再触发任何与缩放相关的行为
- 移除 `_zoomActive`、`_actions.push('zoomEnd')` 相关代码
- 如果未来需要缩放功能，SHALL 通过调整 `camera.fov` 实现

#### Scenario: Shift 无操作
- **GIVEN** 游戏运行中
- **WHEN** 玩家按下 Shift 键
- **THEN** 不触发任何视角变化
- **AND** 不影响玩家移动（疾跑等保留）

### C-3: 上帝视角缩放替代方案

如果保留缩放需求，SHALL 使用以下方式：

- 方案 A: 上帝视角下鼠标滚轮调整高度 (已有 `adjustGodHeight`)
- 方案 B: 任意视角下按住 Alt + 滚轮平滑调整 FOV (35°↔90°)
- 选择方案 B 时需要实现 FOV 补间动画

## 约束

- 移除 `ortho` 相关动作后，`renderer.js` 中的 `orthoCamera` 和 `toggleOrtho()` 可保留但不绑定快捷键
- 不可影响现有的鼠标 Pointer Lock 和视角旋转逻辑

## 依赖

- `camera.js` (CameraController, cycleMode)
- `input.js` (KeyF, ShiftLeft/ShiftRight 事件绑定)
- `renderer.js` (toggleOrtho)
