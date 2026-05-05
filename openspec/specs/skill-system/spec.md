# Skill System — 规格

## 能力描述

简化技能系统交互方式，解决技能与基础操作（挖矿、攻击）的功能重叠问题，屏蔽不必要的快捷键。

## 输入

- 键盘: X (技能使用)、C (技能切换)
- 鼠标: 左键 (挖矿/攻击)
- 技能数据: `skillLibrary.js` 中的 `MCSkill` 实例

## 输出

- 更清晰的操作反馈
- 简化的快捷键映射

## 功能要求

### Sk-1: 技能 vs 基础操作分离

当前技能系统问题分析：

```
技能类型   技能                    基础操作          重叠度
────────  ────────────────────    ───────────────  ──────
mine      精准挖矿 (mc_mine_001)   左键挖掘          高 (完全相同)
mine      范围挖掘 (mc_mine_002)   左键挖掘          中 (范围变大了)
fight     范围猛击 (mc_fight_001)  左键攻击          中 (自动寻敌)
fight     致命一击 (mc_fight_002)  左键攻击          中 (伤害更高)
build     快速建造 (mc_build_001)  右键放置          高 (变 3×3)
explore   探索视野 (mc_explore_001) 无基础对应        低 (扫描高亮)
explore   沼泽感知 (mc_explore_002) 无基础对应        低 (扫描高亮)
```

- `mine` 和 `build` 类型的技能 SHALL 被标记为"冗余"，快捷键屏蔽
- `fight` 类型技能 SHALL 保留但改为被动效果（根据武器自动触发）
- `explore` 类型技能 SHALL 保留快捷键

#### Scenario: 屏蔽挖矿技能
- **GIVEN** 玩家解锁了"精准挖矿"技能
- **WHEN** 玩家按下 X 键
- **THEN** 不触发任何技能
- **AND** 如果当前选中的技能为 mine 类型，显示"该技能已整合到基础操作"

### Sk-2: 快捷键优化

- X 键 SHALL 仅触发 `explore` 类型的技能 (资源扫描)
- C 键 SHALL 在多个 explore 技能间循环
- 如果没有任何 unlock 的 explore 技能，X 和 C SHALL 无操作

#### Scenario: 仅有 mine 技能时的快捷键
- **GIVEN** 玩家仅有 `mc_mine_001` 技能解锁
- **WHEN** 玩家按 X
- **THEN** 无反应（或 HUD 提示"无可用探索技能"）
- **WHEN** 玩家按 C
- **THEN** 无反应

#### Scenario: 有 explore 技能时的快捷键
- **GIVEN** 玩家解锁了 `mc_explore_001` 和 `mc_explore_002`
- **WHEN** 玩家按 X
- **THEN** 执行当前选中的 explore 技能（资源高亮）
- **WHEN** 玩家按 C
- **THEN** 循环切换两个 explore 技能

### Sk-3: 技能 UI 简化

- HUD 技能槽 SHALL 仅显示 explore 类型的技能
- 技能 CD 显示 SHALL 仅用于 explore 技能
- 移除"技能 = 攻击/挖矿"的视觉提示（十字键下方不再显示当前技能名）

#### Scenario: HUD 技能槽
- **GIVEN** 玩家有 3 个 unlock 技能: mine_001, fight_001, explore_001
- **THEN** HUD 仅显示 explore_001 的技能图标
- **AND** mine_001 和 fight_001 不显示在技能槽中

### Sk-4: (备选方案) 完全屏蔽技能系统

如果用户最终确认技能系统在当前阶段不需要保留：

- 移除 `MCSkill.js`、`skillLibrary.js` 的导入和引用
- 移除 `_useCurrentSkill()`、`_cycleSkill()` 方法
- 移除 X/C 键绑定
- 保留 `aiController` 但仅用于被动 AI 行为
- 总代码减重约 300 行

## 约束

- 不可影响现有的 MCAI 控制器和史莱姆 AI 行为
- 不可影响现有的物品掉落和收集逻辑
- explore 类型技能的高亮效果保留 (`renderer.highlightTemporaryBlocks`)

## 依赖

- `main.js` (useCurrentSkill, cycleSkill, gameLoop)
- `input.js` (KeyX, KeyC)
- `MCSkill.js` (技能类型和逻辑)
- `skillLibrary.js` (技能定义)
- `hud.js` (技能槽渲染)
