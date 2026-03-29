# Project Context

## Purpose
Agency Editor 是面向 agentic 并行开发的上下文管理桌面应用，核心目标是让 “Cell / Worktree / Spec / 生命周期” 成为一等公民，降低并行开发的混乱与污染风险，保证可追溯、可恢复、可验证。

## Design Principles
- 显式上下文优先：不允许隐式 Cell 或隐式任务。
- 低魔法：默认不自动启动 CLI，仅提供快捷动作。
- 可恢复优先：会话需可恢复；UI 状态需持久化。
- 可观测优先：运行日志和关键错误必须可追踪。
- 交互一致：导航、确认、危险操作统一模式。
- 成本按意图支付：隐藏的重型 renderer surface 与第三方运行时默认延迟到用户明确进入该能力时再挂载或加载。

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
- 重型 renderer 能力（例如 Monaco、Session Map overlay、动画运行时、次级大面板）优先通过共享的延迟挂载/延迟加载机制接入，而不是在功能文件中内联一次性 lazy 条件。

### Architecture Patterns
- Canonical product objects are `App -> Window -> Project -> Cell -> Session -> Run`.
- `Agent Cells`, `Session Map`, `Hierarchy`, `Memo`, and `Commander` are surfaces over those objects instead of competing object roots.
- `Create Cell` is the workspace/worktree action; `Create Agent` is bounded child execution owned by a run; `Fork` is a specialized `Create Agent` strategy.
- `Commander` remains a bounded operator station: `Ops` is the persistent evidence rail, `Briefing` is the reveal panel, and neither should drift into a window-global assistant or HIL-style drawer.
- The unified local control bus is the canonical external automation surface; it dispatches to capability owners such as Window Shell, File Intent, Session Runtime, and Main Agent Harness instead of replacing them.
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

## 经验沉淀
- HIL 的输入与整理要分层：Inbox 负责采集，Promote 负责聚合转化，Draft 负责执行闭环。
- Promote 必须是全局流程，不做单条 comment 的 promote，避免碎片化与不可追踪。
- 截图/素材采集避免依赖剪贴板，统一落盘到 `.agency/hil` 并记录元数据，保证可复现。
- 新增 HIL 类型时，优先复用 “Type -> Source -> Item” 的树形组织，保持一致可扩展。
- HIL 抽屉为全局并列面板，跟随文件上下文联动，但不遮挡主工作区。

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
