## ADDED Requirements

### Requirement: 固定角色列表

系统 SHALL 内置 5 个固定角色：Steve（原版）、铁血战士（带乌龟宠物）、暮色法师（带鹦鹉宠物）、矿洞行者（带兔子宠物）、锁定占位角色。

#### Scenario: 初始角色列表完整
- **WHEN** 游戏启动
- **THEN** 所有 5 个角色均已注册到系统中，且可通过角色 API 获取

#### Scenario: 锁定角色状态
- **WHEN** 查询第五个角色的状态
- **THEN** 该角色标记为 `locked: true`，且附带文本提示 "未来即将推出此角色，需要完成作业后才能玩游戏"

### Requirement: 角色数据结构

每个角色 SHALL 包含：唯一 ID、显示名称、皮肤数据（64×64 canvas）、体型参数（BodyProportions）、宠物类型（可选）、锁定状态、锁定时提示文字。

#### Scenario: 角色数据结构正确
- **WHEN** 调用 `getRole('knight')`
- **THEN** 返回包含 `id`, `name`, `skinData`, `bodyProps`, `petType`, `locked`, `hint` 字段的对象

### Requirement: 角色切换功能

系统 SHALL 允许在暂停界面切换当前使用的角色。切换后游戏内的 `SteveModel` 皮肤和体型立即更新，预览同步更新。

#### Scenario: 通过角色 ID 切换角色
- **WHEN** 调用 `game.selectRole('mage')`
- **THEN** 游戏中的 SteveModel 更新为法师的皮肤纹理和体型参数
- **THEN** 暂停界面的角色预览同步更新为法师的外观
- **THEN** 宠物切换为鹦鹉（如适用）

#### Scenario: 切换到锁定角色
- **WHEN** 调用 `game.selectRole('locked')`
- **THEN** 角色不切换，当前角色保持不变
- **THEN** 系统提示角色被锁定的文字信息

#### Scenario: 游戏运行时角色不切换
- **WHEN** 在游戏进行中（非暂停状态）尝试切换角色
- **THEN** 切换操作被忽略

### Requirement: 禁止自定义皮肤上传

系统 SHALL 移除拖拽上传自定义 PNG 皮肤的功能，用户不可自行配置角色外观。

#### Scenario: 拖拽无响应
- **WHEN** 用户拖拽 PNG 文件到游戏窗口
- **THEN** 不触发皮肤加载，控制台不输出皮肤相关警告

### Requirement: 角色皮肤程序化生成

三个新角色的 64×64 皮肤 SHALL 基于参考照片通过 Canvas 2D API 程序化绘制，不用外部图片资源。

#### Scenario: 铁血战士皮肤
- **WHEN** 获取 `knight` 角色的皮肤 canvas
- **THEN** 头部为银色头盔+红色顶部装饰，身体为绿色胸甲，手臂为铁色护腕，腿部为深棕色

#### Scenario: 暮色法师皮肤
- **WHEN** 获取 `mage` 角色的皮肤 canvas
- **THEN** 头部为紫色尖帽（带星形装饰），身体为紫色法袍+金色镶边，手臂为金边袖，腿部为深紫色

#### Scenario: 矿洞行者皮肤
- **WHEN** 获取 `miner` 角色的皮肤 canvas
- **THEN** 头部为棕色帽子+头灯装饰，身体为棕色皮衣，手臂为铁色手套，腿部为灰色裤子
