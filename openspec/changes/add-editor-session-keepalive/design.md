## Context
Editor 关闭后会终止 node-pty 会话，导致 CLI 任务丢失。需要可恢复的多会话机制，并支持每个快捷指令配置对应的“启动/继续”命令。

## Goals / Non-Goals
- Goals:
  - 提供每个 Cell 的多会话终端与恢复能力
  - 支持快捷指令配置（启动/继续），适配不同 CLI 的 resume 机制
  - 应用重启后自动恢复 UI 状态与会话列表
- Non-Goals:
  - 在 v0.2 强制所有 CLI 支持恢复
  - 解决跨平台 PTY 差异（仍以 macOS 为主）

## Decisions
- 会话后端：强依赖 tmux 作为可恢复后端（无 tmux 则阻断会话创建并提示安装）
- 会话命名：`agency-<cell-id>-<session-id>`，确保稳定可重连
- 持久化：
  - 会话注册表：每个 worktree 的 `.agency/sessions-<worktreeName>.yaml`
  - 快捷指令配置：用户级配置文件（Editor userData 目录）
  - UI 状态：最近选中的 Cell 与会话写入 userData
- 快捷指令：每个工具支持 `startCommand` 与 `resumeCommand`（可为空）
- UI：在 Cell 内提供会话列表、创建新会话、恢复/关闭会话的入口
- 导航：Activity Bar 增加独立的 Quick Actions 入口用于管理快捷指令
- 扩展：Quick Actions 作为未来 Workflow 管理入口，配置与信息架构需前向兼容
- 作用域：Quick Actions 支持 Global / Project 两种范围，Project 通过 `.agency/quick-actions.yaml` 覆盖 Global 中相同 `id` 的定义
- 命令：Quick Actions 支持多行脚本，执行时按行发送到终端会话
- 状态栏：展示 tmux 可用性与版本信息

## Recovery Behavior
- Editor 重启后：读取 session registry，尝试逐个附加；不可用则标记为“stale”
- 快捷指令恢复：
  - 有 `resumeCommand` 则直接执行
  - 无 `resumeCommand` 则仅打开 shell 并提示手动恢复

## Skill Guidance
- 终端与会话管理：`xterm-js`
- Electron 主/渲染进程通信：`electron-ipc`

## Risks / Trade-offs
- 依赖 tmux 会增加安装门槛，但提供最稳定的会话恢复
- 会话状态落在 worktree 中可能产生合并噪声，需要控制字段粒度
