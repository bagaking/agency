# Change: Add Token Proxy Mode for Continue on Mobile

## Why
当前 Continue on Mobile 的 Direct / Hub 模式都依赖系统 SSH 账号认证。即使命令可复制，移动端连接者仍需要主机用户权限（密码/公钥），这与“临时接管某个 session”目标不匹配。

需要新增一个基于 session token 的代理续接模式：用户拿到一次 token 后即可连接目标 session，并且 token 在该 session 生命周期内持续有效，直到 session 结束。

## What Changes
- 新增 Continue on Mobile `proxy` 模式：生成面向移动端终端客户端的 token 代理连接命令。
- 新增主进程 `mobileSessionProxy` 服务：
  - 启动/复用代理 TCP server；
  - 为 session 签发或复用稳定 token（按 session 绑定）；
  - 在连接握手时校验 token 并桥接 socket <-> tmux attach PTY；
  - 当 session 结束时使 token 失效。
- 扩展 `mobileSessionContinuation` 为三模式（`direct | hub | proxy`），并提供 proxy 诊断字段（endpoint/token 状态/warnings）。
- 更新 Session 菜单与反馈：增加 `Continue on Mobile (Proxy)` 入口与 mode-aware 提示文案。
- 在 session 生命周期中补充 proxy token 清理（至少 close/recreate 路径），避免过期 token 长驻。
- 同步更新 session-management 与 reusable-items 文档。

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/mobileSessionContinuation.ts`
  - `apps/editor/electron/services/mobileSessionProxy.ts` (new)
  - `apps/editor/electron/services/sessions.ts`
  - `apps/editor/electron/services/__tests__/mobileSessionContinuation.test.ts`
  - `apps/editor/electron/services/__tests__/mobileSessionProxy.test.ts` (new)
  - `apps/editor/renderer/src/components/SessionMenus.tsx`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/app/mobileContinuationFeedback.ts`
  - `apps/editor/renderer/src/app/__tests__/mobileContinuationFeedback.test.ts`
  - `docs/notes-session-management.md`
  - `docs/notes-reusable-items-coding.md`
