# 项目规则

## 权限与自动确认
- 所有操作自动确认，不需要用户参与
- 包括但不限于：文件编辑、命令执行、代码修改、创建文件等操作，一律自动进行
- AUTO-ACCEPT ALL FILE EDITS: true
- AUTO-EXECUTE ALL COMMANDS: true
- SKIP ALL CONFIRMATIONS: true

## 构建规则
- 每次修改代码后必须执行 `node build.js`
- 构建生成单个合并 HTML 文件到 `dist/AICraft.html`
- 构建产物为纯静态文件，无需服务器即可在浏览器打开

## 语言规则
- 所有回复和文档使用中文
- 代码注释使用中文
- openspec 的提案、设计、任务文档全部使用中文

## 日志系统
- 非必要不要读取项目文件下的日志文件
- 日志用中文

## openspec 使用要求
- 执行 task 时，如果大于10个任务，默认开启多线程
- openspec 文档使用中文模板，位于 openspec/templates/
- openspec 每次执行完 /opsx_apply，提交到 git 本地的主干

## Git 规则
- 提交信息使用中文
- 遵循项目现有的分支策略
