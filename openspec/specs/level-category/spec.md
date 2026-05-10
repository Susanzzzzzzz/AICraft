## Level Category — 规格

## 能力描述

关卡选择界面按地图来源分类显示，外部导入地图和随机地图用不同视觉标识区分。

## 功能要求

### LC-1: 分组渲染
- `_buildLevelCards()` 遍历 `LEVELS` 时分两组：
  - 「随机地图」：`prebuiltWorld` 为 falsy 的关卡
  - 「外部导入」：`prebuiltWorld` 为 truthy 的关卡
- 两组之间插入 section header：`<div class="level-section-header">随机地图</div>` 和 `<div class="level-section-header">外部导入</div>`

### LC-2: 视觉区分
- 外部导入卡片：蓝色左边框 (`border-left: 3px solid #4FC3F7`)
- 外部导入卡片底部加标签 badge：`<span class="level-badge level-badge-import">导入</span>`
- 随机地图卡片：维持现有样式
- 卡片底部加标签 badge：`<span class="level-badge level-badge-procedural">随机</span>`
- CSS 新增 `.level-section-header`、`.level-badge`、`.level-badge-import`、`.level-badge-procedural`

### LC-3: 排序
- 两组内部保持原有顺序（按 LEVELS 数组顺序）
- 随机地图组始终在外部导入组上方

### LC-4: 场景验证
- **当** 打开关卡选择界面
- **则** 看到分组标题，外部导入卡片有蓝色标识和「导入」标签
