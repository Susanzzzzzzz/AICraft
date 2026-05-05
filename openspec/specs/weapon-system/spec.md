# Weapon System — 规格

## 能力描述

重设武器系统，解决武器与角色模型重叠问题，优化武器建模和手持动作，区分第一人称/第三人称武器显示。

## 输入

- 武器 ID (102-126)
- 视角模式 (第一人称/第三人称)
- 玩家动作状态 (idle/walking/attacking)

## 输出

- 第一人称武器视图模型 (cam-era 子级)
- 第三人称武器网格 (挂载在 Steve 右手 pivot)
- 武器挥动动画

## 功能要求

### W-1: 分离第一/第三人称武器参数

当前问题：`buildWeaponMesh()` 返回的 group 使用固定偏移 `position.set(0, -0.75, 0.15)`，同时用于第一人称和第三人称，导致视角错位。

- 第一人称武器 SHALL 有独立的偏移/旋转参数
- 第三人称武器 SHALL 有独立的偏移/旋转参数
- 武器定义 (`WEAPONS` 数组) SHALL 增加 `fpOffset` 和 `tpOffset` 字段

#### Scenario: 第一人称武器位置正确
- **GIVEN** 玩家处于第一人称视角
- **WHEN** 手持铁剑
- **THEN** 武器显示在屏幕右下 1/4 区域
- **AND** 武器不遮挡准心
- **AND** 武器不与任何人物模型部分重叠

#### Scenario: 第三人称武器位置正确
- **GIVEN** 玩家处于第三人称视角
- **WHEN** 手持铁剑
- **THEN** 武器正确挂在右手 pivot 末端
- **AND** 剑尖指向玩家前方
- **AND** 剑刃不穿模到身体内部

### W-2: 武器建模优化

当前武器使用 4-6 个 BoxGeometry 简单组合（weapons.js:71-204）。需要精细度提升。

- 每把武器 SHALL 在现有 BoxGeometry 基础上增加：
  - 剑: 刃部斜面（梯形截面）、护手细节、握把纹理
  - 工具: 头部形状精细化（镐尖角度、斧刃弧度）
  - 特殊武器: 粒子光效附加 (`Points` 或 `Sprite`)
- 材质 SHALL 升级为带有光泽感的材质 (`MeshStandardMaterial` + envMap 或 roughness/metalness)

#### Scenario: 钻石剑显示效果
- **GIVEN** 玩家手持钻石剑
- **THEN** 钻石剑剑刃呈淡蓝色光泽
- **AND** 剑身有发光脉动效果 (`opacity` 交替)

### W-3: 武器手持动作

- 空闲状态: 武器 SHALL 有轻微的呼吸摆动 (`sin(time * 1.5) * 0.02` 旋转)
- 行走状态: 武器 SHALL 随手臂摆动自然晃动
- 攻击状态: 武器 SHALL 执行前刺/下劈动画 (200ms 完成)

#### Scenario: 武器攻击动画
- **GIVEN** 玩家手持武器
- **WHEN** 玩家左键攻击
- **THEN** 武器在 100ms 内向前刺出 0.3 单位距离
- **AND** 在 100ms 内回到原位
- **AND** 动画期间触发伤害判定

### W-4: 武器切换动画

- 切换武器时 SHALL 有淡入/淡出或下移/上移动画 (300ms)
- 切换期间不可攻击

## 约束

- 武器攻击动作使用 `steveModel.triggerAnimation()` 现有的回调机制
- 第三人称武器跟随 arm_R pivot 旋转 (`steve.js` 中的 swinging 逻辑)
- 不引入外部 3D 模型文件，仅使用 Three.js 原生几何体

## 依赖

- `weapons.js` (WEAPONS 数据、buildWeaponMesh)
- `camera.js` (_fpWeaponGroup)
- `steve.js` (weaponModel, switchWeapon)
- `main.js` (_cycleWeapon, gameLoop update)
