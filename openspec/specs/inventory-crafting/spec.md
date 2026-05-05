# Inventory & Crafting UI — 规格

## 能力描述

重构背包系统交互方式，支持从背包格拖动物品到合成框的正确放置，替代当前的点击-移动-点击操作链。

## 输入

- 鼠标: mousedown / mousemove / mouseup / drag events
- 键盘: E 键开/关背包
- 背包数据: Inventory.hotbar[8], Inventory.storage[36]

## 输出

- 物品图标跟随鼠标移动 (drag ghost)
- 合成结果更新
- 物品在两个格子间的转移

## 功能要求

### I-1: 拖放基础架构

- SHALL 实现完整的拖放交互:
  1. mousedown: 记录源格子 (storage/hotbar/crafting/armor)
  2. mousemove: 创建跟随鼠标的 ghost 元素 (`position: fixed`)
  3. mouseup: 检测目标格，执行转移逻辑

#### Scenario: 从存储格拖到合成格
- **GIVEN** 背包打开，存储格中有木头
- **WHEN** 玩家按住木头图标，拖到左上合成格，释放
- **THEN** 木头出现在合成格中
- **AND** 存储格中的木头数量 -1
- **AND** 合成结果立即更新

#### Scenario: 从合成格拖回存储格
- **GIVEN** 合成格中有物品
- **WHEN** 玩家将合成格物品拖到存储格
- **THEN** 物品移回存储格
- **AND** 合成格清空

### I-2: 合成框交互重设

当前合成交互 (`_setupInventoryUI()`:408-443) 使用点击逻辑：点击合成格 → 从选中的快捷栏格取物品。需要替换为拖放。

- 4 个合成格 SHALL 接受从任何背包格拖入的物品
- 每个合成格 SHALL 显示放入的物品图标和数量
- 点击合成结果格 SHALL 合成并取走物品
- 当合成格中的物品被部分使用后，数量 SHALL 正确递减

#### Scenario: 合成后数量更新
- **GIVEN** 合成格 0 有 3 个木头的物品
- **WHEN** 合成配方消耗 1 个木头
- **THEN** 合成格 0 显示 2 个木头
- **AND** 如果数量归零，格子的外观变为空

### I-3: 关闭背包时的合成格处理

- 关闭背包时 (`_toggleInventory()`) SHALL 将合成格中的物品返回背包
- 如果背包已满，SHALL 丢弃物品并提示

#### Scenario: 背包满时关闭
- **GIVEN** 合成格中有 4 个木头，背包已满
- **WHEN** 玩家按下 E 关闭背包
- **THEN** 系统尝试归还物品
- **AND** 在 HUD 区域显示 "背包已满，物品已丢弃" 提示

### I-4: 右键快捷操作

- 在背包格上右键 SHALL:
  - 如果物品是方块: 放入快捷栏的选中格
  - 如果物品是装备: 直接穿上
  - 如果物品是食物: 直接食用

## 约束

- 拖放仅鼠标操作，不涉及触屏（触屏使用现有的点击交互）
- 合成格最多 4 个 (2×2)
- 不可拖到非目标区域（背包外释放 = 取消，物品回到原位）

## 依赖

- `main.js` (_setupInventoryUI, _onInvSlotClick, _updateCraftResult)
- `crafting.js` (getCraftResult, consumeCraftInput)
- `inventory.js` (addItem, removeItem)
- HTML/CSS: `inventory-overlay` 中的格子 DOM 结构
