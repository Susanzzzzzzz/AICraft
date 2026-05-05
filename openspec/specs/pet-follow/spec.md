## ADDED Requirements

### Requirement: 宠物创建

系统 SHALL 为铁血战士、暮色法师、矿洞行者三个角色分别创建宠物：乌龟、鹦鹉、兔子。宠物使用 Three.js 基本几何体组合构建。

#### Scenario: 乌龟外观
- **WHEN** 创建乌龟宠物
- **THEN** 乌龟由半球壳（SphereGeometry 缩放 y）、4 条短腿（BoxGeometry）、一个小头（BoxGeometry）组成

#### Scenario: 鹦鹉外观
- **WHEN** 创建鹦鹉宠物
- **THEN** 鹦鹉由椭球身体（SphereGeometry）、2 个翅膀（BoxGeometry 扁片）、嘴（ConeGeometry）和尾羽组成

#### Scenario: 兔子外观
- **WHEN** 创建兔子宠物
- **THEN** 兔子由球体身体、球体头部、2 个长耳（BoxGeometry 竖立）和尾巴（小球）组成

### Requirement: 宠物跟随

宠物 SHALL 跟随玩家的世界位置，不包含物理碰撞和重力计算。

#### Scenario: 宠物跟随玩家
- **WHEN** 玩家移动
- **THEN** 宠物保持相对于玩家的固定偏移量，始终在玩家右后方约 0.8 单位处

#### Scenario: 宠物无视碰撞
- **WHEN** 宠物位置与方块重叠
- **THEN** 宠物位置不因碰撞调整，直接穿过方块

#### Scenario: 宠物无视重力
- **WHEN** 玩家跳跃或飞行
- **THEN** 宠物在 Y 轴与玩家保持固定偏移，不会下落

### Requirement: 宠物空闲动画

宠物 SHALL 带有简单的空闲动画，不涉及物理或碰撞。

#### Scenario: 兔子弹跳动画
- **WHEN** 游戏帧更新
- **THEN** 兔子的 Y 轴位置以 `sin(time * 6) * amplitude` 做上下弹跳，耳朵随动轻微摆动

#### Scenario: 鹦鹉翅膀动画
- **WHEN** 游戏帧更新
- **THEN** 鹦鹉的翅膀以 `sin(time * 4)` 做上下小幅扇动

#### Scenario: 乌龟头部伸缩
- **WHEN** 游戏帧更新
- **THEN** 乌龟头部沿 Z 轴以 `sin(time * 1.5)` 缓慢前后伸缩

### Requirement: 角色切换时宠物的管理

切换角色时 SHALL 正确销毁旧宠物并创建新宠物。

#### Scenario: 切换有宠物的角色
- **WHEN** 玩家从铁血战士切换到暮色法师
- **THEN** 乌龟宠物从场景移除，鹦鹉宠物被创建并开始跟随

#### Scenario: 切换到无宠物的角色
- **WHEN** 玩家从铁血战士切换到 Steve
- **THEN** 乌龟宠物从场景移除，无新宠物创建
