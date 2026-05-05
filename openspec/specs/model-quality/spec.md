# Model Quality — 规格

## 能力描述

提升整体三维建模质量，包括方块显示精细度、人物模型细节、环境视觉效果，目标达到"地下城与勇士"级别（参考 craft 项目）的视觉表现力。

## 输入

- 现有 Block/Item/Entity 定义
- Three.js 场景、光照系统

## 输出

- 精细化方块模型
- 新增视觉效果 (法线、发光、半透明)
- Improved 角色模型

## 功能要求

### M-1: 方块显示效果提升

当前所有方块使用单一 `BoxGeometry` + `MeshLambertMaterial`，缺少细节。

- SHALL 为关键方块增加自定义几何体:
  - 草方块: 顶部和侧面颜色不同 (使用多个材质组或独立网格)
  - 矿石: 在石头表面叠加发光斑点 (`Points` 或小方块粒子)
  - 树叶: 十字交叉面片 (billboard) 替代实心方块，增加透明度
  - 水: 半透明流动动画 (UV 偏移)
- SHALL 在每个方块边缘添加 0.01 单位的深色线条 (wireframe 叠加或改变相邻面颜色)
- SHALL 增加方块破坏进度视觉效果 (裂纹 overlay)

#### Scenario: 矿石方块发光
- **GIVEN** 钻石矿石在视野中
- **THEN** 矿石闪烁淡蓝色光点
- **AND** 光点位置随机分布在整个方块表面

#### Scenario: 树叶透视
- **GIVEN** 玩家在树叶方块旁
- **THEN** 树叶显示为十字交叉的透明面片
- **AND** 玩家可以看到树叶后的物体

### M-2: 人物模型精细度提升

当前 Steve 模型由 6 块 BoxGeometry 组成，无颈部、无手指、无面部细节。

- SHALL 增加以下部位:
  - 颈部过渡 (小 BoxGeometry 连接头和身体)
  - 肩部斜面 (45° 旋转的薄片)
  - 手指/手套 (手部小方块)
  - 面部: 眼睛/嘴使用 Canvas 纹理贴图替代独立几何体
- SHALL 增加 clothing 分层 (外层衣服、内层皮肤)
- SHALL 支持表情变化 (高兴/受伤/死亡)

#### Scenario: 人物面部纹理
- **GIVEN** 第三人称视角
- **WHEN** 玩家看向自己角色
- **THEN** 角色面部有清晰的眼睛、眉毛、嘴巴纹理
- **AND** 纹理绘制在 BoxGeometry 正面的 UV 映射上

### M-3: 环境视觉效果

- SHALL 增加太阳光晕效果 (Sprite 或 Lens Flare)
- SHALL 增加阴影 (`renderer.shadowMap.enabled = true`)
  - 仅方块投射阴影，不投射到方块 (性能优化)
  - 或使用简单的平面阴影 (`CircleGeometry` 投射到地面)
- SHALL 在方块被破坏时产生粒子效果 (3-5 个小方块飞出)

#### Scenario: 方块破坏粒子
- **GIVEN** 玩家正在挖掘石头
- **WHEN** 方块被破坏的瞬间
- **THEN** 3-5 个小灰色方块从破坏位置向随机方向飞出
- **AND** 粒子在 0.5 秒内消失

## 约束

- 不使用外部纹理文件，所有纹理使用 Canvas 程序化生成
- 保持性能稳定在 30fps 以上 (当前硬件)
- 所有效果可降级 (低配机自动关闭粒子/阴影)

## 依赖

- `renderer.js` (InstancedMesh 构建、光照)
- `world.js` (方块定义)
- `steve.js` (人物模型)
- `weapons.js` (武器模型)
- Three.js (Shadow, Points, Sprite)
