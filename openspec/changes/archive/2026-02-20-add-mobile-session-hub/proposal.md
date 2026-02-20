# Change: Add Mobile Session Hub for Continue on Mobile

## Why
当前 Continue on Mobile 只能“直达某个 session”。它适合快速恢复单任务，但不适合移动端长期值守：用户需要在多个 Project / Agent Cell / Session 之间快速切换与管理，而无需回到桌面重复触发命令。

## What Changes
- 在 Continue on Mobile 中新增 **Hub 模式**：命令不再只 attach 单个 session，而是 attach 到一个专用 tmux Hub 会话。
- Hub 会话启动后加载移动端导航 TUI（无外部依赖），支持在多个 Project / Cell / Session 之间查看并切换。
- 继续保留现有 Direct 模式（直达当前 session），并将 UI 明确为 Direct / Hub 两种续接入口。
- 扩展主进程移动续接服务：增加 mode-aware command builder（`direct | hub`）、Hub 引导参数、Hub 诊断信息。
- 在 tmux 会话层补充 Agency 元数据（project/cell/session/status/activity），作为 Hub 导航的数据来源（SSOT）。
- 复用现有 SSH 通道探测与就绪诊断（端口发现、best-effort enable、手动指令提示），避免两套逻辑分叉。
- 优化 xterm 高输出场景下的加载/刷新路径：将 terminal data 写入改为逐帧批处理，降低重绘抖动与卡顿。

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/mobileSessionContinuation.ts`
  - `apps/editor/electron/services/tmux.ts`
  - `apps/editor/electron/services/sessions.ts`
  - `apps/editor/electron/ipc/handlers/sessions.ts`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/components/SessionMenus.tsx`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/components/terminal/useTerminalRuntimeEffect.ts`
  - `apps/editor/renderer/src/components/TerminalPane.tsx`
  - `docs/notes-session-management.md`
  - `docs/notes-reusable-items-coding.md`
