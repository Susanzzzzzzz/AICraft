# Steve Model & Skin — 规格

## 能力描述

管理和渲染 Steve 角色模型，支持行走动画和 MC 标准皮肤纹理切换。

## 输入

- 皮肤图像: PNG (64×64, MC 标准格式)
- 动画状态: walking/idle
- 动画时间: elapsed time

## 输出

- Three.js Group (Steve 模型, 可添加到场景)
- 各部位 Mesh (支持独立材质/纹理)

## 功能要求

### S-1: 模型结构
- 6 个 BoxGeometry 组合, 挂在 steve Group 下:
  - head: 0.5×0.5×0.5, 位置 y=1.55
  - body: 0.5×0.75×0.25, 位置 y=0.925
  - arm_L: 0.25×0.75×0.25, pivot at shoulder, x=-0.375
  - arm_R: 0.25×0.75×0.25, pivot at shoulder, x=+0.375
  - leg_L: 0.25×0.75×0.25, pivot at hip, x=-0.125
  - leg_R: 0.25×0.75×0.25, pivot at hip, x=+0.125
- 总高度: ~1.8 blocks (与碰撞箱一致)

### S-2: Pivot 机制
- 四肢需要以关节点为轴旋转 (不是以几何中心)
- 实现方式: 创建 pivot Group, geometry 向下偏移半个高度
  ```
  pivot.position.set(x, shoulderY, z)
  limbMesh.position.set(0, -halfHeight, 0)  // 偏移
  pivot.add(limbMesh)
  steve.add(pivot)
  ```
- 旋转 pivot.rotation.x 即可实现肩/髋关节旋转

### S-3: 行走动画
- 对角步态: 左臂+右腿同相, 右臂+左腿同相
- 动画函数:
  ```
  swing = Math.sin(time * 8) * 0.5
  armL_pivot.rotation.x = swing
  armR_pivot.rotation.x = -swing
  legL_pivot.rotation.x = -swing
  legR_pivot.rotation.x = swing
  ```
- 仅在移动时播放, 静止时归零

### S-4: 皮肤 UV 映射
- 支持 MC 标准 64×64 皮肤 PNG
- UV 区域划分:
  | 部位 | 源区域 (x, y, w, h) |
  |------|---------------------|
  | 头顶 | (8, 0, 8, 8) |
  | 头底 | (16, 0, 8, 8) |
  | 头前 | (8, 8, 8, 8) ← 正面 |
  | 头后 | (24, 8, 8, 8) |
  | 头右 | (0, 8, 8, 8) |
  | 头左 | (16, 8, 8, 8) |
  | 身体前 | (20, 20, 8, 12) |
  | 身体后 | (32, 20, 8, 12) |
  | 身体右 | (16, 20, 4, 12) |
  | 身体左 | (28, 20, 4, 12) |
  | 右臂 | (44, 16, 4, 12) |
  | 左臂 | (36, 52, 4, 12) |
  | 右腿 | (4, 20, 4, 12) |
  | 左腿 | (20, 52, 4, 12) |

### S-5: 皮肤加载
- 内置皮肤: 程序化 Canvas 绘制 Steve/Alex 默认外观
- 本地上传: 拖拽 PNG 到页面 → FileReader → Image → Canvas
- 加载流程:
  1. Image 加载 PNG
  2. 绘制到 offscreen Canvas
  3. 按区域切割 → 6 个小 Canvas
  4. 每个小 Canvas → CanvasTexture
  5. 应用到对应部位 Mesh 的 material.map

### S-6: 皮肤切换
- 提供 UI: 内置皮肤列表 + 上传按钮
- 切换时: 重新执行 S-5 流程, 更新所有 material.map
- 切换即时生效, 无需刷新

### S-7: 手持方块显示
- 第三人称: 在 arm_R 的末端附加一个小方块 Mesh
- 方块类型 = 当前选中的方块类型
- 方块大小: 0.2×0.2×0.2
- 跟随 arm_R 旋转
- 第一人称: HUD overlay 显示 (不在 3D 场景中)

## 约束

- 皮肤必须是 64×64 PNG, 否则显示默认 Steve
- 皮肤仅影响视觉, 不影响任何属性
- 第一人称时 steveModel.visible = false
- 第三人称时 steveModel.visible = true

## 依赖

- Three.js (BoxGeometry, Group, CanvasTexture)
