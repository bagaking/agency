# Project Context

## Purpose
Agency Editor 是面向 agentic 并行开发的上下文管理桌面应用，核心目标是让 “Cell / Worktree / Spec / 生命周期” 成为一等公民，降低并行开发的混乱与污染风险，保证可追溯、可恢复、可验证。

## Design Principles
- 显式上下文优先：不允许隐式 Cell 或隐式任务。
- 低魔法：默认不自动启动 CLI，仅提供快捷动作。
- 可恢复优先：会话需可恢复；UI 状态需持久化。
- 可观测优先：运行日志和关键错误必须可追踪。
- 交互一致：导航、确认、危险操作统一模式。

## Non-Goals (v0.2)
- 不做跨平台发布（macOS 优先，保留扩展路径）。
- 不做签名/公证的生产分发流程。
- 不引入复杂协作或远程同步机制。

## Tech Stack
- Electron (主进程) + React (渲染进程) + Vite
- Tailwind CSS + Rive（动画占位/交互动效）
- xterm.js + node-pty + tmux（终端与会话）
- Monaco Editor（文本编辑）
- Playwright（E2E UI）
- pnpm（依赖与脚本）

## Project Conventions

### Code Style
- 清晰分层：`electron/`（main）、`renderer/`（UI）、`services/`（业务能力）、`ipc/`（通讯边界）。
- IPC 只允许白名单接口（preload 显式暴露），禁止 renderer 直接访问 Node API。
- 复杂逻辑优先封装成 service 模块，避免 UI 组件承担业务流程。
- 运行时日志必须包含上下文信息（Cell/Session/路径）。

### Architecture Patterns
- Cell 与 branch/worktree 严格 1:1。
- `.agency` 目录是本地状态与配置的权威来源（YAML/Markdown 为主）。
- Gates / Actions / Softlinks 均遵守 Global -> Project -> Agent 解析顺序。
- 终端会话以 tmux 为依赖，Session Registry 持久化存储。

### Testing Strategy
- 关键 UI 流程用 Playwright 覆盖（Explorer/Workbench/Session/Actions/Gates）。
- 手动验收清单必须可执行（README 或 spec 中列出）。
- 修复交互缺陷时补充回归点（尤其是 terminal/resize/恢复）。

### Git Workflow
- 分支命名：`<type>/<cell-name>`，类型包括 `feat/refactor/fix/lint/chore/doc`。
- 多 worktree 并行开发，不允许在一个 Cell 内切分任务。
- `.agency` 文件允许合并，作为生命周期与配置记录。

## Domain Context
- Spec 是给 AI 与团队消费的契约，非 prompt。
- Lifecycle 阶段：draft -> active -> archived，并由 Gate 阻止不满足条件的流转。
- Actions 是 CLI/Agent 的启动与恢复入口，后续可演进为 workflow。
- Explorer 需反映 VCS 状态、Cell 改动归因和文件操作能力。

## Important Constraints
- v0.2 仅要求 macOS 可用。
- 默认 shell 为 `/bin/zsh`，Gate/Action 命令以 `zsh -lc` 执行。
- 必须使用 pnpm，提交 `pnpm-lock.yaml`。
- 不强制 OS 级沙箱，依赖约定与可观测约束。

## Observability
- 启动时在 `logs/runtime` 生成日志，保留最近 20 份并归档历史。
- 终端启动/resize 错误必须入日志。
- 日志应包含时间、级别、组件和上下文（Cell/Session）。

## Release & Packaging
- 打包产物输出到 `apps/editor/dist/release`。
- 提供一键脚本与 Makefile 目标。
- macOS 安装流程需文档化（未签名提示处理方式）。

## External Dependencies
- git（worktree 与 VCS 状态）
- tmux（会话保持）
- zsh（命令执行）
- node-pty（终端 PTY）
- electron-builder（打包）
