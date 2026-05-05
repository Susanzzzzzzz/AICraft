# Voxel World — 规格

## 能力描述

生成和管理 3D 体素世界，包含地形自动生成、方块数据存取和渲染。

## 输入

- 随机种子 (seed): number
- 世界尺寸: 32×16×32 (W×H×D)

## 输出

- 完整的体素世界数据
- 可供 Three.js 渲染的 InstancedMesh 集合

## 功能要求

### W-1: 世界数据存储
- 使用三维数组存储方块类型 ID (0=Air, 1-6=方块)
- 提供 `getBlock(x, y, z)` 和 `setBlock(x, y, z, type)` 接口
- 坐标范围: x: [0, 31], y: [0, 15], z: [0, 31]
- 越界访问返回 0 (Air)

### W-2: 地形生成
- 使用 Simplex 2D Noise 生成高度图
- `height(x, z) = 6 + simplex2D(x * 0.05, z * 0.05) * 4`
- 分层填充:
  - y == height → Grass (1)
  - height-3 < y < height → Dirt (2)
  - 0 < y <= height-3 → Stone (3)
  - y == 0 → Stone (3) (基岩层, 不用特殊方块)
- 生成后自动填充 InstancedMesh

### W-3: 方块渲染
- 每种非 Air 方块类型对应一个 InstancedMesh
- 方块颜色:
  - Grass: 顶面 #4CAF50, 侧面 #8D6E63 (简化为纯绿)
  - Dirt: #8D6E63
  - Stone: #9E9E9E
  - Wood: #795548
  - Brick: #C62828
  - Water: #1E88E5, opacity 0.5
- 仅渲染暴露面至少一面的方块 (至少一个相邻格子为 Air)
- 方块变更后重建对应类型的 InstancedMesh

### W-4: 射线检测 (DDA)
- 输入: 射线起点 (camera position) + 方向 (camera forward)
- 输出: `{ hit: boolean, position: [x,y,z], normal: [nx,ny,nz] }`
- 最大射程: 8 格
- 步进算法: 3D DDA (Amanatides & Woo)
- 用于: 挖方块 (删除 hit 方块) 和 放方块 (hit + normal = 新位置)

## 约束

- 方块不可放置在玩家当前位置 (防止卡住)
- Water 不可挖掘, 不可放置
- y=0 层不可挖掘 (基岩)
- InstancedMesh 更新需在下一帧生效

## 依赖

- Three.js (InstancedMesh, BoxGeometry, MeshLambertMaterial)
- noise.js (Simplex 2D)
