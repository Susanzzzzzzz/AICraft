# 记忆系统规则

## 概述
本项目使用 Memory System V2 作为跨会话持久记忆系统，基于文件+JSON索引实现，搜索延迟 <20ms。

## 记忆目录
- CLI 工具：`memory/memory-cli.sh`
- 索引文件：`memory/index/memory-index.json`
- 日记文件：`memory/daily/YYYY-MM-DD.md`
- 周报文件：`memory/consolidated/YYYY-WW.md`

## 记忆类型

| 类型 | 说明 | 建议重要度 |
|------|------|-----------|
| learning | 新学的技能、工具、模式、技术 | 7-9 |
| decision | 做出的选择、采用的策略、方案 | 6-9 |
| insight | 突破、顿悟、关键发现 | 8-10 |
| event | 里程碑、完成、上线、重大事件 | 5-8 |
| interaction | 关键对话、用户反馈、需求 | 5-7 |

## 记忆触发规则

### 必须记录记忆的场景
1. **重大决策**：架构选择、技术栈变更、设计方向调整
2. **Bug 修复**：记录根因和解决方案，避免重复踩坑
3. **用户偏好**：用户表达的编码风格、工具偏好、工作习惯
4. **项目里程碑**：版本发布、功能完成、关键节点
5. **学习成果**：新发现的设计模式、性能优化技巧、API 使用经验

### 记忆捕获命令
```bash
./memory/memory-cli.sh capture \
  --type <learning|decision|insight|event|interaction> \
  --importance <1-10> \
  --content "记忆内容" \
  --tags "标签1,标签2" \
  --context "当前在做什么"
```

### 记忆搜索命令
```bash
# 搜索记忆
./memory/memory-cli.sh search "关键词" [--min-importance N]

# 查看最近记忆
./memory/memory-cli.sh recent <type|all> <天数> <最低重要度>

# 查看统计
./memory/memory-cli.sh stats

# 周报整合
./memory/memory-cli.sh consolidate [--week YYYY-WW]
```

## 会话开始时
- 搜索最近7天的记忆，了解上次会话进展：`./memory/memory-cli.sh recent all 7 5`
- 如有特定上下文需求，搜索相关记忆

## 会话结束时
- 将本次会话的重要学习、决策、事件记录到记忆系统
- 执行 `./memory/memory-cli.sh consolidate` 生成周报（每周一次）
