## Context
现有 Continue on Mobile 已支持 SSH+tmux 直达单个 session。该流程对“继续当前任务”很高效，但在移动端场景下（值守、巡检、跨任务切换）会出现两个问题：
1) 需要在多个 session 间切换时，必须回桌面再次触发命令；
2) 移动端缺少统一入口来理解“当前有哪些可接管 session”。

## Goals / Non-Goals
- Goals:
  - 引入可复用的 **Mobile Hub**，作为移动端统一入口，支持跨 Project/Cell/Session 的导航与 attach。
  - 保留 Direct 模式，确保一键直达体验不回退。
  - 复用现有 SSH readiness 诊断逻辑，保持 DRY/SSOT。
  - 通过 tmux metadata 建立稳定的数据契约，避免 Hub 依赖 UI 本地状态。
- Non-Goals:
  - 不引入 Tailscale SSH / Mosh / 第三方隧道编排。
  - 不做远程桌面或图形化手机端 UI。
  - 不在本次 change 覆盖跨机器同步（仅本机 tmux server 范围）。

## Decisions

### 1) Continue on Mobile 升级为 mode-aware 能力
- Decision: `sessions:continueOnMobile` 增加 `mode` 参数（`direct | hub`），默认 `direct`。
- Why: 保持 IPC 面最小扩展，同时统一 Direct/Hub 的探测和诊断返回结构。

返回结构（概念）：
- 公共字段：`command`, `ssh`, `generatedAt`, `mode`
- `direct` 特有：`sessionId`, `tmuxSession`
- `hub` 特有：`hub.sessionName`, `hub.launcherPath`, `hub.catalogSummary`

### 2) Hub 使用“专用 tmux 会话 + 启动器脚本”
- Decision: 每个 repo root 创建一个稳定 Hub session：`agency-mobile-hub-<shortHash(repoRoot)>`。
- Why: tmux session 命名空间是全局的；按 repo 隔离可避免多项目冲突，同时允许并存。

- Decision: Hub 启动命令采用“存在则 attach，不存在则创建并执行 launcher”。
- Why: 避免重复创建；保证移动端重复连接时体验稳定。

### 3) Hub 数据源以 tmux metadata 为权威（SSOT）
- Decision: 在 Agency session 创建/恢复/刷新时写入 tmux user options：
  - `@agency_project_root`
  - `@agency_project_name`
  - `@agency_worktree_path`
  - `@agency_cell_id`
  - `@agency_cell_name`
  - `@agency_session_id`
  - `@agency_session_name`
  - `@agency_session_status`
  - `@agency_last_activity_at`
- Why: Hub 在移动端独立运行，不能依赖 renderer 内存态；tmux metadata 是最稳的运行时真相来源。

### 4) Hub TUI 采用“零依赖终端菜单”
- Decision: 首版 Hub TUI 不引入 fzf/bubbletea 等外部依赖，使用 shell 脚本+ANSI 菜单循环（刷新、选择、attach）。
- Why: 降低环境假设，保证在默认 SSH/tmux 环境可运行。

TUI 交互目标：
- 按 Project -> Cell -> Session 展示在线会话
- 支持输入序号 attach 到目标 session
- 支持 refresh（重建列表）
- 支持返回 Hub 主界面/退出

### 5) Direct 模式保持不变
- Decision: Direct 模式仍生成 `ssh ... -t 'tmux attach-session -t <tmuxSession>'`。
- Why: 保护已有用户习惯，避免把“快速恢复”路径绑死到 Hub。

### 6) xterm 输出刷新改为逐帧批处理
- Decision: 将 terminal runtime 中的 `onTerminalData` 即时写入改为 RAF 批处理写入（frame-level buffer flush）。
- Why: 高频输出时按 chunk 逐次 `terminal.write` 容易造成渲染主线程抖动；逐帧合并可显著降低刷新开销并改善“加载慢/刷新慢”体验。

## Risks / Trade-offs
- Metadata 覆盖面：旧 session 可能尚未写入 metadata。
  - Mitigation: Hub catalog 对缺失 metadata 做降级显示，并在 session 刷新路径补写。
- Hub TUI 复杂度：shell TUI 可维护性一般。
  - Mitigation: 将 catalog 构建与 TUI 渲染解耦（catalog JSON + launcher script），后续可替换 TUI 实现而不改协议。
- 多项目语义：当前 app 以单项目为主，Hub 跨项目能力依赖 tmux 中已有 metadata。
  - Mitigation: spec 要求“支持多项目展示”，实现允许缺省时降级为当前项目。

## Migration Plan
1. 扩展 spec：增加 Hub 模式与双入口要求。
2. 重构移动续接服务为 mode-aware，并抽取 SSH readiness 公共模块。
3. 在 sessions/tmux 生命周期注入 metadata 写入与补写。
4. 实现 Hub catalog + launcher 产物与命令拼装。
5. 渲染层新增 Direct/Hub 双入口与提示文案。
6. 更新 docs（session management / reusable items）并补充测试。

## Open Questions
- Hub 是否需要“记住最后选中的 session 并默认高亮”？
  - 提案默认：先不做，保持无状态刷新。
- Hub 是否需要“直接执行 quick actions / gate checks”？
  - 提案默认：先聚焦 session 导航与 attach，不扩展执行能力。
