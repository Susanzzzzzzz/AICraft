## Map Weather — 规格

## 能力描述

为外部导入地图按需补充天气配置，避免因漏配天气导致氛围缺失。

## 功能要求

### MW-1: levelData.js 补充天气
- 检查所有外部关卡（`prebuiltWorld` 为 truthy），为缺少 `atmosphere.weather` 的补充：
  - 雪山之巅：已有 `weather: 'snow'`，保留
  - 方块生存：已有晴朗，保留
  - 游乐天地 (FunLand)：补充晴朗（默认即可）

### MW-2: 从 MC biome 推断天气（转换脚本增强）
- 在 `convert-mc-world.js` 中，采样区块的 biome 数据
- 输出建议天气到 world-data.json 元数据：`"suggestedWeather": "rain"` / `"snow"` / `null`
- 映射规则：
  | MC Biome | 天气建议 |
  |----------|---------|
  | plains、forest、jungle、swamp、river、ocean | `"rain"` |
  | desert、savanna、mesa、badlands | `null`（晴朗） |
  | taiga、snowy_tundra、snowy_taiga、ice_spikes、frozen_river、frozen_ocean | `"snow"` |
  | 其他 / 未知 | `null` |

### MW-3: 运行时应用建议天气
- `_loadPrebuiltLevel()` 读取 `worldData.suggestedWeather`
- 如果存在且当前关卡 `atmosphere` 未明确设置 weather，则应用建议天气
- 允许 levelData.js 手动配置覆盖建议

### MW-4: 场景验证
- **当** 转换一个沙漠 biome 的 MC 地图
- **则** `world-data.json` 的 `suggestedWeather` 为 `null`，游戏中晴朗
- **当** 转换一个雪原 biome 的 MC 地图
- **则** `world-data.json` 的 `suggestedWeather` 为 `"snow"`，游戏中下雪
