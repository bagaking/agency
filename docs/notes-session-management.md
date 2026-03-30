---
title: Session Management (Map + Attach Lifecycle)
required: false
sop:
  - Read this doc when working on session management (attach, idle, preview cache) or the session map overlay.
  - Update this doc when attach/idle/preview behavior or map layout/config changes.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Session 管理（Session Map + Attach 生命周期）

本说明记录 Session 管理机制，包含 Session Map 的“SLG 访问器”与 session attach 生命周期（idle、GC、预览缓存/快照）等。Session Map 只是其中一个模块。

Session 管理目标：
- 保持多会话的**可见性、可访问性与一致的生命周期语义**（idle/visited/attach），不因视图切换而丢失状态。
- 将 Session Map 作为跨界面的“导航与协同规划入口”，并与 Agent Cells 的会话选择保持同步。
- 所有终端 attach/preview/capture 都收口到 Session 层管理器，保证一致性与可控资源回收。
- 提供“Continue on Mobile”远程续接路径：对选中 session 生成 `ssh + tmux attach` 指令，并附带 SSH 通道就绪诊断。

## Session Runtime Orchestration Gateway
Session Runtime Orchestration Gateway 是面向 main 进程的主机侧能力层，用来承接“读取 source session 状态 -> 在 source 执行动作 -> 创建/启动 child session -> 等待 ready”的确定性工作流。

设计原则：
- renderer 不直接脚本化 tmux；renderer 只请求高层 intent；
- host 侧能力要同时适配 UI、CLI、未来 tool caller，以及后续可能出现的 Main-as-Agent Harness；
- 对外 contract 保持 JSON-friendly，请求/响应/失败码/调用者 metadata 都稳定；
- tool-specific 逻辑放在 driver 中，不放在 UI，也不散落在 ad-hoc shell 片段里。

当前首个 driver：
- `codex` smart fork：
  - 通过 terminal runtime detection 判断 source session 是否仍在 Codex TUI 中，而不是只看持久化 profile；
  - 等待 source 输出稳定到 idle 窗口；
  - 在 source 里发送 `/fork`；
  - 等待 fork acknowledgement，并提取 `thread_id` 等变量；
  - 创建 `nodeKind=fork` child session；
  - 用 profile `fork.launchTemplate` 渲染 child 启动命令；
  - 等待 child session 进入 ready 状态后再向 UI 报告成功。

这层的意义：
- 让 `Fork` 不再只是“拓扑节点创建”，而是一个可观测、可失败、可重试、可被未来 harness 复用的 host orchestration。

## Main Agent Harness（Create Agent Control Plane）
Main Agent Harness 是更高一层的 host-owned control plane。

语义边界：
- Harness 的主语义是 `Create Agent`，不是 `Fork`；
- Harness 负责 `runId`、timeline、capability-call record、inspect/cancel/resume；
- Harness 不直接写 tmux / 文件 / 浏览器细节；
- 真正的副作用仍然通过 host-managed capabilities 完成，当前首批接入：
  - Session Runtime Gateway
  - File Intent Gateway

当前首版 runner 结构：
- Harness controller：管理 run lifecycle、状态落盘、progress event。
- Capability registry：定义哪些 host-managed capabilities 对 Harness 可见，以及 policy seam。
- Agent-backed runner adapter：默认执行面，负责消费受控 skill-pack descriptor，并把决策交给 provider。
- Provider registry：当前默认 `codex_cli`，后续可扩 `claude_cli` 等，但 provider 永远不是副作用 owner。
- Global provider settings：Agency 自己维护 provider 参数/credential，当前第一条产品化路径是全局 `codex_cli` 配置（`base_url`、`model`、`OPENAI_API_KEY` 必填，reasoning/context/compact 为可选覆盖），不再要求用户依赖 ambient shell provider env。
- Test-only reference runner：仅保留给 tests/debug，不再承载产品默认语义。
- Runner skill packs：给复杂 specialization 一个受控 playbook，目前先有：
  - `session.create-child`
  - `session.tool-native-fork`

为什么要有 skill pack：
- 有些行为比单个 capability call 更复杂，例如“识别当前 TUI -> 发 `/fork` -> 等 ack -> 建 child -> resume child tool session”；
- 这些行为不应直接长在 Harness core 里；
- 也不该让 future runner agent 自己拼 raw tmux/file 细节。

所以当前约定是：
- Harness 只调度；
- skill pack 只编排批准过的 capability；
- capability 自己仍然是副作用 owner。

这意味着 Agent Cells 里的 `Fork` 现在应被理解为：
- UI 入口仍叫 `Fork`；
- 但 host 内部会启动一个 Harness `Create Agent` run；
- `Fork` 只是该 run 选择了 `session.tool-native-fork` 这个 specialization。

当前 UI 对应的可见化入口：
- Docked Session Map 右侧不再只是窄的 `Unit Details`，而是更宽的 `Command Ops` 区；
- `Fork` / Harness run 启动时，Session Map 会自动打开一次，把用户带到这块指挥区；
- `Command Ops` 保持为稳定证据层，展示当前 focus session、Harness timeline、取消/复制动作，以及未来可扩展的个性化 quick ops；
- `Attention` 是覆盖 `Window / Cell / Session / Run` 的共享状态层；`Ops` 只负责在 Session Map 中承载当前窗口的 priority queue 与跳转，不拥有 attention 本体，也不另造新的产品对象根。
- Session Map 中的 token / cell 强调必须复用 Attention 的统一语义（`running / failed / pending confirmation / unread / return required`），不能再做一套只在地图里成立的告警词汇。
- `Commander` 占据 Session Map 最右侧的独立列，作为 backend/operator 的固定锚点，而不是窄图标位。
- 点击 `Commander` 后，最右列应直接原位展开成 `Briefing` 面板；不得再以浮层、popup、drawer 形式覆盖 `Ops` 或 `Cells`。
- `Briefing` 是有边界的 backend 简报：默认展示一张当前 context briefing 卡，并只保留一张最新回应卡；切换 focus session / relevant run 时必须重绑并清掉旧回应，避免累积聊天历史污染当前证据范围。
- `Briefing` 负责解释、建议和触发受限操作，但不复用 Session Reply 的语义，也不应演化成通用聊天记录面板。
- Session 错误也复用这块区域，避免依赖容易误触消失的临时 notice。
- Dock 模式应把更多横向空间优先让给 `Cells`，但 `Commander` 打开时必须获得足够宽度承载完整 briefing；不能继续用窄列 + 覆盖浮层的折中方案。
- `Command Ops` 内容区必须支持纵向滚动；当 timeline 或错误详情超过 dock 高度时，用户仍应能完整查看与复制。
- Dock HUD 的标题、卡片内边距和状态条应保持紧凑，优先信息密度而不是装饰性留白。
- `Command Ops` 外层的 context strip 应优先展示当前聚焦 session 的头像与 session 名称，避免重复塞入像 `MAIN · DRAFT` 这类低价值上下文文字。
- `Command Ops` 应额外承载一个紧凑的 `Priority Queue`：它回答“这个 window 里现在最值得处理的是哪里”，并且队列项必须可以直接 jump 到对应对象。
- `Command Ops` 的主动作必须单点清晰：运行中显示 `Cancel`，失败/取消后显示 `Retry`，不要在同一面板里重复放多个语义等价的停止/重试入口。
- `Briefing` 中的 `Cancel / Retry / Dismiss` 等动作必须继续走现有 Harness 或 host-managed capability；对话不能退化成 renderer 侧自由操作入口。
- `Briefing` 面板关闭后，`Ops` 与 `Cells` 应保持原位和原上下文，不因为聊天交互而被遮挡、穿插或重新排版。
- 所有 `by commander` 任务在运行中都应在 Commander 头像上显示明确的 progress 指示，至少包括一个常驻的活动进度条，而不是只靠文字状态。

## Session Reply Relay（跨会话回复资产）
Session Reply Relay 是面向 Session 的“回复资产化”机制，强调 **跨多 agent 通信 / 不耦合具体 CLI 输入体验 / 同时形成资产**。

核心规则：
- Reply 面板位于 Agent-Cells 的右侧 HIL 抽屉，进入 Agent-Cells 时默认打开并选中；每个 session 的 reply 线程相互隔离。
- Reply 记录为 HIL `reply` 类型 memo；在 Memo 界面只读（不可输入），但支持 Promote（与 comment 同流程）。
- Reply 元数据包含：`selection.site`（含高亮）、`selection.query`（用户输入）、`selection.timeTag`（无选区时为 `Nature`）、以及 `session` 归属信息。
- Reply 动作：Record / Send to Current / Send to Other；发送后在 Reply 面板生成“发送结果卡片”（头像 + 跳转）。
- Record-only 卡片显示 memo icon；发送到其他 session 时显示 link icon 并支持跳转。
- 发送 payload 采用标签包裹：`<reply time="..."><site>...</site><query>...</query></reply>`；若无 `site`，直接发送纯文本。
- selection 高亮采用反引号包裹（例如 `xxxxxx` 中的 `yyy`），并保留 selection 前后原文。

## Session 管理机制
- **Attach Manager（统一入口）**：所有 attach 行为必须由 Session 层管理器统一调度（终端、hover 预览、快照/截图），避免重复逻辑与 idle 被误触发。
- **智能 Fork / Create Agent specialization**：`Fork` 动作由 Main Agent Harness 作为 `Create Agent` specialization 调度，默认执行面是 `agent_backed -> codex_cli -> session.tool-native-fork -> session.runtime`。provider 只能返回结构化 capability 决策，真正副作用仍通过 Session Runtime Gateway 执行。当前 specialization 有两类合法结果：
  - true `smart_fork`：host 做 source 检查、source dispatch、child launch、ready wait 的完整闭环；
  - `create_child` + `dispatch_input`：当 true fork 语义不可证明时，改为显式创建 child agent，而不是伪装成 fork 成功。
  - 若既没有 true `smart_fork` 路径，也没有 concrete child launch / resume 命令，则 `Fork` 必须直接失败；`create_child_only` 不是合法成功结果。
- **Continue on Mobile（远程续接）**：
  - Agent Cells 的 session 右键菜单提供两种入口：
    - `Continue on Mobile (Direct)`：直达当前 session。
    - `Continue on Mobile (Hub)`：进入 Mobile Hub，再在 Hub 内切换项目/Cell/session。
    - `Continue on Mobile (Proxy)`：生成 token 代理命令，用移动端终端直接连入目标 session。
  - Direct 模式会解析 session 绑定的 `tmuxSession`，生成 `ssh -p <port> <user>@<host> -t 'tmux attach-session -t <tmuxSession>'` 指令。
  - Hub 模式会生成并附带一组 Hub 产物（`catalog + launcher`），命令会 attach 到一个按 repo root 稳定命名的 tmux Hub session（`agency-mobile-hub-<hash>`）。
  - Proxy 模式会启动（或复用）本机 token-auth 代理端口，生成 `bash -lc '... | nc <host> <port>'` 指令；连接后首行提交 session token，随后桥接到 `tmux attach-session`。
  - Proxy token 按 `worktree + sessionId` 绑定并复用；token 生命周期与 session 生命周期一致：session 结束（close/recreate 或 tmux 失活）后 token 失效。
  - Hub 的目录视图由 tmux metadata 驱动（Project -> Cell -> Session）；stale/closed 会话默认不作为可 attach 目标显示。
  - host 选择优先级：Tailscale IPv4 > 私网 LAN IPv4 > hostname。
  - SSH 端口会先做本地探测（含 sshd config 端口候选）；若未发现监听端口，会尝试平台相关的 best-effort 启动命令并重新探测。
  - 若仍未就绪，UI 进入 warning 态并给出一次性手动启用命令（例如 macOS 的 `sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist`）。
  - 当命令可生成时会自动复制到剪贴板，并提示 endpoint/模式信息；Hub 模式会额外显示 catalog 摘要（projects/cells/sessions）。
  - Proxy 模式依赖移动端终端具备 `nc`（netcat）；建议仅在 Tailscale/LAN 等可信网络下使用。
- **Attach 类型与优先级**：
  - **interactive**：用户正在交互的终端视图（如 Agent Cells 中当前选中的 session）。
  - **preview**：hover/截图用的短暂 attach（可短暂持有，完成后释放）。
  - 交互 attach 优先级高于 preview attach；当 interactive 存在时不触发 detach。
  - interactive 状态由 Agent Cells 当前选中 session 驱动，Session Map/preview 不改变 interactive 判定。
- **Idle 语义与噪声窗口**：
  - idle 仅以 tmux `pane_activity`（输出变化）计算；输入/attach 不应重置 idle。
  - 输出变化量需达到 `activityDiffThreshold`（默认 12 字符）才刷新 idle；小幅变化会被忽略。
  - attach 噪声忽略 1 分钟（pane_activity），终端重连后的输出有短暂忽略窗口（约 5s）避免回放误判。
  - detached session 会定时刷新 `pane_activity`（当前 10s 一次），确保后台输出能更新 idle。
  - 列表刷新仅在捕获输出与上次缓存存在 diff 且超过阈值时更新 `lastActivityAt`，仅刷新不会清零 idle。
  - 可选显示 `visited` 以表达“用户最近访问”与 idle 的差异。
- **Idle-based Attach GC**：
  - 默认开启，阈值 30 分钟（可配置）。
  - **仅当无 interactive 客户端** 且 idle 超过阈值时 dettach。
  - 一旦发生交互（hover/点击/终端聚焦）立即 reattach。
- **预览缓存与快照落盘**：
  - 每个 session 缓存 2–3 帧预览（可配置），优先从 `.agency/` 读取，命中后立即渲染并异步刷新最新帧。
  - 渲染层会预读缓存到内存（cacheOnly），hover 首帧直接用内存帧渲染，不触盘、不等待 IPC；仅在 hover 停留超过阈值（默认 200ms）后才触发 IPC 刷新/attach。
  - 预览刷新以 `pane_activity` 为事件信号：若 activity 未变化则跳过刷新与重绘，避免 hover 预览跳动。
  - Agent Cells 终端在 attach 之前优先显示缓存预览，并叠加 “Connecting” 提示；attach 成功后刷新并启用输入。
  - 快照/截图必须先确保 attach（attach → capture → 可选 release），写入 `.agency/` 以便重启后首屏加速。
  - 对带 `startCommand` 的 Terminus 会话，首次预览允许触发一次 startCommand，以便生成首屏内容（仅在无缓存且输出为空时）。
- hover 预览会维持短暂“预热 attach”（默认 15 秒）以便点击切换时无需重新 attach。
- Session Map 预览**优先使用 tmux 捕获（IPC 预览）**以保持“已渲染”的一致输出；当 IPC 不可用时才回退到本地 xterm snapshot。IPC 预览结果会写入预览缓存，以保证未 attach 的 session 也能快速首屏展示。
- 预览渲染使用**双缓冲终端**：后台终端先完成渲染，再切换到前台，避免全量重绘导致的闪动。

## Session Map（SLG 访问器）

Session Map 的类 RTS 游戏操作界面设计：它是一个跨界面、始终可用的总览(类似 SLG)地图，用来把 **Cells → Sessions** 映射成“城邦 + 角色”的心智模型，帮助用户在多个会话之间快速跳转、协同规划。

### 目标与边界
- **目标**：跨界面地图、固定布局、点击跳转、hover 预览、可扩展统计。
- **非目标**：拖拽摆放、缩放、迷雾、路径规划（v1 不做）。

## 视觉与语义
 - **Cell = 城邦 / 阵营**：以“阵营色 + 城邦卡片 + 角色头像”表示；默认色基于 `Cell.state` + 创建顺序。
- **Session = 角色**：以圆形角色 token + 状态点表示（active/detached/closed/stale）。Session 可携带专属头像，优先展示 `session.avatar`，缺省则回退到 Cell 头像或基于 session id 计算。
- **离线状态**：Session 为 `closed / stale / archived` 或 Cell 为 `archived / closed` 时标记为离线。
- **Hover 预览**：以“缩略图为主 + 一行毛玻璃信息条”为主视觉；缩略图按当前 session 字号与 tmux pane cols/rows 渲染，**高度随 rows 自适应**，上限固定为宽高比约 1.618；内容贴底显示，不强行裁切。hover 时淡至 85% 不透明度且可滚动查看。
- **预览首帧策略**：首帧未 ready 前仅显示底部信息条（最小高度），首帧 ready 后向上展开缩略图，避免“先高后低”的位置跳动。
- **加载态表现**：预览未 ready 时以推荐高度显示并覆盖 Loading，完成后内容淡入；若高度需变化，仅顶边在 0.2s 内平滑过渡。
  - Loading 使用共享 SVG 动画组件（`PreviewLoading`），填满预览区域。
- **Hover 定位与尺寸控制**：首次 hover 决定 placement（top/bottom/left/right），在同一次 hover 生命周期内不因尺寸变化反复翻转；预览高度受可用空间上限裁剪，top 时锁定“底边=anchorTop-gap”，bottom 时锁定“顶边=anchorBottom+gap”，避免高度变化导致位置跳动。
- **角色头像**：Cell 创建时分配 `avatar`（存于 lifecycle 文件），使用 `@bagakit/open-agent-avatars/20260202` 作为唯一来源（无网络 fallback）；若缺失则按 Cell 名称/ID 回退计算。Session 创建时优先选择活跃会话中“未占用或占用最少”的头像，并按轮转策略分配；支持在编辑器头部菜单、Session Tab 与 Session Map 中自定义头像。
- **头像选择器**：7x7 网格视图（可滚动但隐藏滚动条），第一行展示最近选择的头像（左→右排序），与第二行之间有分隔线。
- **HUD 分区（Dock 模式）**：左侧 Radar、中央 Command Center、右侧 Focus（头像/状态）；Dock 使用固定高度（约原高度 2/3）。Command Center 以 SLG 网格卡片分组展示 Cell（每个卡片内为在线 sessions），离线/不活跃会话折叠到 “…” 菜单。Radar 点位与右侧卡片联动：hover 高亮对应城邦卡片，点击定位滚动到对应卡片。
- **Cells 布局（Dock 模式）**：Command Center 中的 Cell 卡片应按内容宽度参与横向 wrap，而不是让单个 Cell 拉满整行；当 Cell 数量增多时，布局应优先扩展为多列多行卡片而不是不断增长单个长条。
- **Active token 层级**：当前选中的 session token 必须成为同组中最显眼的视觉锚点；非选中 token 保持低噪声底座，避免靠一圈浅色边框和轻微放大来“假装高亮”。

## 交互规则
- **点击 Session token**：仅切换 Cell + Session，不切换当前主界面视图。
- **Token 焦点语义**：Dock/Grid 中的 session token 在键盘 focus 时必须触发与 hover 同级的上下文预览反馈；不能让键盘用户只能“激活”而看不到同等预读信息。
- **Hover**：带短延迟以避免抖动；显示动态详情 + 终端实时预览。预览画面可滚动，点击预览跳转到该 Session。Radar 区域 hover 仅强调联动，不触发跳转。
- **预览信息条**：底部信息条不触发跳转；点击名称可直接改名，右侧 “…” 菜单可更换头像。
- **首次进入**：自动打开地图（每个项目仅一次），之后由用户开关控制。
- **Esc**：优先关闭当前打开的 Session Map 子 surface（例如 `Briefing`）；若没有打开中的子 surface，再关闭整个 Session Map。
- **键盘**：方向键在 token 间移动焦点，Enter/点击跳转。
- **右侧 Ops/Commander 键盘性**：任何标注为 menu / action surface 的区域都必须至少支持初始焦点、可见 focus、`Escape` 退出，以及与视觉顺序一致的键盘移动。
- **Dock 模式**：Session Map 作为底部面板出现，会把 Status Bar 顶上去；点击空白不自动关闭；当前为固定高度（约原高度的 2/3）。
- **点击跳转反馈**：点击 token 仅切换当前 Cell + Session，不关闭 Map；点击缩略图预览后关闭 Map 并切换到 Agent Cells 视图，便于立即进入目标会话。
- **创建会话**：在 Session Map 与 Agent Cells 的「+」菜单中可直接创建新 Session；同一 Terminus Profile 以单行聚合展示，并以子按钮触发 Start / Resume / Subcommand。
- **生命周期与 idle 计算**：Session 的 idle 以 tmux `pane_activity` 为准（代表 pane 最近活动时间，跨 UI 切换和重连也保持）；renderer 收到输出时会增量刷新，重连后的回放有短暂忽略窗口（约 5s），避免误判为活跃。tmux 侧在 attach 附近 1 分钟内仅当 activity 时间戳等于 attach 时间时视为噪声，不更新 idle。session 列表刷新时仅当捕获输出与缓存内容有 diff 才更新 `lastActivityAt`。可选显示 `visited` 表示用户最后一次主动切换到该 Session 的时间。Idle 环形指示随时间从活跃绿色渐变到不活跃灰色（默认 15 分钟拉满），关闭/离线时头像与边框同时变灰。
  - renderer 侧也使用 `activityDiffThreshold` 控制 idle 刷新；仅当输出变化量超过阈值时才触发活跃时间更新。
- **Attach 生命周期与 GC**：预览/截图会触发短暂 attach（必要时 attach→capture→release），attach 不应改变 idle。Idle 达到阈值（默认 30 分钟）且无交互客户端时，自动 detach 以节省资源；一旦发生交互（hover 预览/点击/终端聚焦）立即重新 attach。

## 数据来源
- Cells 来自 Cell 列表。
- Sessions 来自每个 Cell 的 session registry。
- 预览优先使用渲染层的 xterm buffer（有 wrap 标记）生成缩略图，确保与主终端视图的折行一致；若渲染层无该 session，才退化为 tmux `capture-pane` 快照（只读、无输入），并启用 join wrapped。为避免未附加 client 时抓不到 pane，tmux 预览会优先解析 pane_id 再抓取；若抓取结果为空则尝试 alternate screen（TUI/CLI 常用）。capture-pane 输出会统一归一到 CRLF，以避免 xterm 在非 convertEol 下出现“空白预览”。
- 原因说明：`capture-pane` 返回的是 tmux 的“已渲染网格”，文本已被硬折行；即便 `-J` 也无法完全恢复原始流，尤其是 CJK 宽字符或 TUI 输出场景。
- 预览缓存：每个 Session 保留 2–3 帧预览缓存，优先从 `.agency/` 读取，命中后立即渲染并异步刷新最新帧。

## 配置（项目级）
配置文件路径：`<repoRoot>/.agency/session-map.yaml`

字段说明：
```yaml
version: 1
autoOpenSeen: false
previewCacheFrames: 3
activityDiffThreshold: 12
attachGcEnabled: true
attachGcIdleMinutes: 30
attachGcGraceSeconds: 60
typeColors:
  active: "#34d399"
  draft: "#60a5fa"
  archived: "#94a3b8"
cellColors:
  my-cell-id: "#f472b6"
```

- `autoOpenSeen`: 控制首次进入自动打开。
- `previewCacheFrames`: 每个 Session 预览缓存帧数（默认 3）。
- `activityDiffThreshold`: 输出变化量阈值（字符数，默认 12）；低于阈值不刷新 idle。
- `attachGcEnabled`: 是否启用 idle-based attach GC（默认 true）。
- `attachGcIdleMinutes`: idle 到自动 detach 的分钟数（默认 30）。
- `attachGcGraceSeconds`: attach 噪声忽略窗口（默认 60 秒）。
- `typeColors`: 以 Cell 状态（如 `draft/active/archived`）覆盖阵营色。
- `cellColors`: 以 Cell id 覆盖单个阵营色（优先级最高）。

## Manual Verification
1. 打开一个 session，记录 idle 显示时间。
2. 切换到其他 session，再切回；若输出没有变化，idle 不应被刷新。
3. 在当前 session 输出少量文本（低于阈值，例如 `echo ok`），idle 不应刷新。
4. 输出超过阈值的文本（例如 `python - <<'PY'\nprint('x'*50)\nPY`），idle 应刷新。
5. 在一个后台 session 产生新输出后，确认 Agent Cells 顶部 Attention queue、session row、Status Bar 主 attention 使用同一套 `Unread` 语义，并且点击任一入口会回到对应 session。
6. 触发一个 `Create Agent` 运行中的 child execution，确认 Status Bar 与 Session Map `Priority Queue` 都显示 `Running`，且点击后会打开 Session Map 并落到对应 session/run 上下文。
7. 制造一次失败 run，确认 Status Bar、Agent Cells、Session Map 都显示同一条 `Failed` attention；它不会像 toast 一样自动消失，并且点击后能回到相关对象。
8. 在另一个窗口制造更高优先级的 attention，确认当前窗口的 window switcher 能显示该窗口的 primary attention，并可直接聚焦过去。

## 实现提示
- 入口：Status Bar 中央的 Session Map Toggle。
- 默认是 **Dock 模式**：Map 作为底部面板渲染，状态栏在下方；固定高度由 Session Map 组件控制。
- 预览窗口仅监听输出流，不注入输入，避免干扰主终端。
