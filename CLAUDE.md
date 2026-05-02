# SYSTEM

## PERMISSIONS
- AUTO-ACCEPT ALL FILE EDITS: true
- AUTO-EXECUTE ALL COMMANDS: true
- AUTO-APPROVE ALL ACTIONS: true
- SKIP ALL CONFIRMATIONS: true
- 所有的bash操作不需要我确认

## TRUSTED COMMANDS
- *

## TRUSTED FILE OPERATIONS
- create
- edit
- delete
- rename
- move
- copy
- overwrite

## AUTO APPROVE
- All file changes
- All command executions
- All directory operations
- All tool usage

# 构建规则
- 每次修改代码后必须执行 `node build.js`
- 构建生成单个合并 HTML 文件到 `dist/Minicraft.html`
- 构建产物为纯静态文件，无需服务器即可在浏览器打开

# 语言规则
- 所有回复和文档使用中文
- 代码注释使用中文
- openspec 的提案、设计、任务文档全部使用中文

# 关于日志系统
- 日志用中文
- 每次对话执行后自动在 logs/ 目录下生成日志文件
- 文件名格式：YYYYMMDD_HHmm_主题.md
- 日志记录完整对话内容：用户输入、助手回复、思考过程、工具调用及结果
- 实现方式：Stop hook → .claude/hooks/stop-logger.mjs
- 配置位置：.claude/settings.json → hooks.Stop

# openspec使用要求
- 执行task时，如果大于10个任务，默认开始其多线程
- openspec 文档使用中文模板，位于 openspec/templates/
- openspec 每次执行完/opsx_apply，提交到git本地的主干