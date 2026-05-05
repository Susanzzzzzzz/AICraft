# ⛏️ AICraft — 方块世界

<p align="center">
  <strong>🌍 浏览器中的 3D 体素沙盒 | AI 全自动编写</strong>
</p>

<p align="center">
  <img src="pic/demo/1.png" width="49%" alt="截图1">
  <img src="pic/demo/2.jpg" width="49%" alt="截图2">
</p>

<p align="center">
  <b>Three.js</b> · <b>Vanilla JS</b> · <b>Web Audio API</b> · <b>Claude Code + OpenSpec</b>
</p>

---

**AICraft** 是一款开源的体素沙盒游戏，**覆盖桌面端网页、移动端网页、Android APK 三端**，直接在浏览器中运行。

> 🎯 **这不是一个普通的游戏项目** — 从第一行代码到完整的战斗/合成/关卡系统，全部由 **Claude Code + OpenSpec** AI 系统自动生成。作者完全不懂 JavaScript。

📱 **全平台支持**：桌面网页 · 移动网页 · **Android APK**，完整触屏操控 + 横屏适配
⚔️ **完整玩法**：8 种武器 · 8 种怪物 · 20+ 合成配方 · 6 个关卡
🎵 **沉浸体验**：程序化 BGM · 15 种音效 · 昼夜循环 · 天气系统
🔧 **开放源码**：Fork 项目、提交 Issue，AI 自动实现你的想法
📖 [**操作手册**](docs/操作手册.md) · [**技术实现手册**](docs/技术实现手册.md)
📋 **需求规格文档**：15 份完整 Spec，[任何人都可以按照这些文档自行搭建游戏](#-需求规格文档)

## 🎮 在线游玩

直接打开 `dist/AICraft.html` 即可游玩。无需安装任何依赖，无需服务器。

```
手机端推荐横屏模式以获得最佳体验！
```

## 📚 文档

- [**操作手册**](docs/操作手册.md) — 完整的桌面端/移动端操控说明、按键映射、触屏布局、合成配方、武器属性、关卡指引
- [**技术实现手册**](docs/技术实现手册.md) — 项目架构、核心系统详解（渲染/物理/碰撞/音频/AI）、构建流程、AI 开发工作流

## ✨ 核心功能

### 📱 触屏与移动端
- 完整触屏操控方案：虚拟摇杆移动、拖拽视角、功能按钮（支持 Android APK）
- 自动横屏锁定，自动全屏请求
- 响应式 UI，从小手机到大平板自适应
- 触屏背包交互（点击拾取 + 点击放置）

### ⚔️ 战斗系统
- 8 种武器：木剑、石剑、铁剑、钻石剑、下界合金剑、冰霜之刃、龙骨剑、弓
- 8 种敌对生物：僵尸、骷髅、蜘蛛、洞穴蜘蛛、苦力怕、末影人、狼、史莱姆
- 格挡（减伤 50%）、闪避（双击方向键）
- 远程弓箭系统（蓄力射击）
- 浮动伤害数字，死亡掉落物品

### 🎵 音乐与音效
- Web Audio API 程序化生成背景音乐（多层 32 秒循环）
- 15 种音效：破坏、放置、攻击、受伤、拾取、升级、爆炸等
- 背景音乐和音效独立音量控制

### 🔧 合成系统
- 2×2 合成网格，拖拽操作
- 20+ 合成配方：从工具到武器到方块的全链路
- 从木质到钻石的完整升级路径

### 🗺️ 关卡系统
- 6 个可选关卡：宁静草原、矿山丘陵、黄沙沙漠、迷雾沼泽、冰封苔原、深邃洞穴
- 每个关卡有独立任务和进度追踪
- 切换关卡保留背包和技能

### 🌍 更多功能
- 10 倍大地图（1280 区块），区块加载和 LOD
- 昼夜循环（10 分钟完整周期）
- 飞行模式（Tab 键切换）
- 4 种视角模式（第一人称 / 第三人称背面 / 第三人称正面 / 上帝视角）
- 5 个可选角色（Steve、Predator、Twilight Mage、Cave Walker 等）
- 宠物跟随系统
- 技能系统（探索技能）
- 世界存档（localStorage 持久化）

## 🤖 关于本项目

### 完全由 AI 编写！

从第一行代码到所有游戏功能，本项目完全由 **Claude Code**（Anthropic 的 AI 编程助手）结合 **OpenSpec**（AI 驱动开发工作流框架）自动生成。项目作者不会 JavaScript。

工作流程：
1. 提出需求和想法
2. AI 自动生成设计文档和任务列表
3. AI 自动编写代码实现
4. 构建并验证
5. 迭代优化

项目历经 **28 轮迭代**，从最基础的核心玩法发展到完整的游戏体验。

### 欢迎所有人参与

本项目证明：**不需要会写代码，也能做出一款完整的游戏。**

- 🐛 **发现 Bug？** 提交 Issue，AI 自动修复
- 💡 **有新想法？** 描述你的需求，AI 自动实现
- 🔧 **想自己修改？** Fork 仓库，随意发挥

### 未来规划

- 持续优化游戏体验（尤其是移动端）
- 更多有趣的关卡和任务
- 更多生物和玩法
- 更棒的视觉效果

## 🚀 快速开始

```bash
# 安装依赖（仅构建需要）
npm install

# 构建
node build.js

# 打开构建产物
open dist/AICraft.html
```

## 📋 需求规格文档 — 自己动手搭建游戏

项目提供了完整的 **OpenSpec 需求规格文档**，涵盖所有子系统的详细设计。你完全可以根据这些文档，使用 AI 编程工具（Claude Code）自行搭建整个游戏：

| 文档 | 说明 |
|------|------|
| [Mobile Touch](openspec/specs/mobile-touch/spec.md) | 移动端触摸控制、灵敏度配置、按钮布局 |
| [Voxel World](openspec/specs/voxel-world/spec.md) | 体素世界生成和数据格式 |
| [Inventory & Crafting](openspec/specs/inventory-crafting/spec.md) | 背包和合成系统 |
| [Camera & View](openspec/specs/camera-view-controls/spec.md) | 相机控制和视角切换 |
| [更多...](openspec/specs/) | 总共 **15 份规格文档**，覆盖全部玩法子系统 |

这些 Spec 文档是从零开始构建 AICraft 的"设计蓝图"。你只需要：
1. 安装 Claude Code + OpenSpec
2. 按 Spec 依次提交给 AI
3. AI 自动生成代码，迭代构建完整游戏

> 💡 **不会写代码？没关系，Spec 文档 + AI 让你也能做出一款完整的 3D 游戏。**

## 🏗️ 技术栈

| 技术 | 用途 |
|------|------|
| Three.js (0.160) | 3D 渲染引擎 |
| Vanilla JavaScript | ES Modules |
| Web Audio API | 程序化音效和音乐 |
| localStorage | 世界存档持久化 |
| Simplex Noise | 地形生成 |
| BSP 算法 | 地牢生成 |

## 📂 项目结构

```
├── index.html                 # 入口页面
├── build.js                   # 构建脚本
├── src/                       # 源代码
│   ├── main.js                # 游戏主循环和核心逻辑
│   ├── world.js               # 世界数据和生成
│   ├── renderer.js            # Three.js 渲染管理
│   ├── player.js              # 玩家物理和碰撞
│   ├── camera.js              # 相机控制
│   ├── input.js               # 键盘/鼠标输入
│   ├── touch-controller.js    # 移动端触屏控制
│   ├── hud.js                 # HUD 界面
│   ├── crafting.js            # 合成系统
│   ├── inventory.js           # 背包管理
│   ├── style.css              # 样式
│   └── ...                    # 其他模块
├── dist/AICraft.html        # 构建输出（单文件）
├── docs/
│   ├── 操作手册.md            # 游戏操作手册
│   └── 技术实现手册.md         # 架构与技术详解
├── pic/                       # README 截图
└── tests/                     # 自动化测试
```

## 📄 许可证

本项目仅供学习和娱乐用途。

---

**用 AI 改变游戏开发 — 不会写代码？没关系，AI 会。**
