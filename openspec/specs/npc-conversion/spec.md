## NPC Conversion — 规格

## 能力描述

MC Java 地图转换时，从 `.mca` 区块 NBT 中提取实体数据，映射到 AICraft 实体类型，一并输出到世界数据中。

## 功能要求

### NC-1: 实体解析
- 在 `convert-mc-world.js` 中，每个区块解析后读取 NBT `Level.Entities` 数组
- 对每个实体，提取：`id`（MC 命名空间 ID）、`Pos`（[x, y, z] 双精度数组）
- 用 `yOffset` 修正 Y 坐标
- 忽略临时实体：`minecraft:item`、`minecraft:arrow`、`minecraft:xp_orb`、`minecraft:experience_bottle`

### NC-2: 实体映射表

| MC ID | AICraft 类型 | 备注 |
|-------|-------------|------|
| `minecraft:villager` | `Villager` | 村民 |
| `minecraft:pig` | `Pig` | 猪 |
| `minecraft:cow` | `Cow` | 牛 |
| `minecraft:sheep` | `Sheep` | 羊 |
| `minecraft:chicken` | `Chicken` | 鸡 |
| `minecraft:zombie` | `Zombie` | 僵尸 |
| `minecraft:skeleton` | `Skeleton` | 骷髅 |
| `minecraft:spider` | `Spider` | 蜘蛛 |
| `minecraft:creeper` | `Creeper` | 苦力怕 |
| `minecraft:enderman` | `Enderman` | 末影人 |
| `minecraft:wolf` | `Wolf` | 狼 |
| 其他 | 忽略 | 未映射的实体类型跳过 |

### NC-3: 数据输出
- `world-data.json` 新增字段：`"entities": [{ "type": "villager", "x": 1.5, "y": 20, "z": 2.5 }]`
- 每个实体包含：`type`（小写英文）、`x`、`y`、`z`（已用 yOffset 修正）
- 坐标统一保留一位小数

### NC-4: 运行时加载
- `_loadPrebuiltLevel()` 在加载完方块数据后，解析 `worldData.entities`
- 对每个实体，调用对应构造器：`new Villager(world, [x, y, z])`、`new Pig(world, [x, y, z])` 等
- 添加到 `this.villagers` / `this.animals` 数组
- 不再调用 `_spawnAnimals()` 和 `_spawnVillagers()`（避免重复生成）

### NC-5: 地面检测修正
- 加载实体后，对每个实体做一次地面检测（向下扫描找非空气方块）
- 如果实体 Y 低于地表，抬升到地表 + 0.5
- 防止实体卡在地里

### NC-6: 场景验证
- **当** 转换一个带有村民和动物的 MC 地图
- **则** `world-data.json` 包含 `entities` 数组，加载后能在对应位置看到村民/动物
