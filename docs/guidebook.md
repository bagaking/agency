# Agency Editor 新人快速上手 Guidebook（稳定不过期）

这份 guidebook 是“阅读路线图”，不重复容易过期的细节，只指向项目内最新且权威的资料来源，确保随着迭代依旧有效。

## 使用方式
- 第一次按顺序完整阅读。
- 之后按任务跳转对应章节（架构、IPC、终端、语音等）。
- 有疑问时优先相信 OpenSpec，其次看代码。

## 快速阅读顺序（Fast Path）

### 1）项目意图与约束（最稳定的事实）
- `openspec/project.md`
  - 目的、原则、非目标、技术栈、架构规则、关键约束。

### 2）产品级需求（必须满足的事情）
- `openspec/specs/agency-editor/spec.md`
  - Cells / Session / Gates / Actions 等核心能力的需求与场景。

### 3）当前变更提案（即将变化的部分）
- `openspec/changes/` 与 `openspec list`
  - 先看 proposal，再看代码，避免基于旧假设理解系统。

### 4）功能概览与人工验收
- `apps/editor/README.md`
  - 现有功能范围、导航模型、手动验证清单。

### 5）构建与运行链路（启动是怎样发生的）
- `apps/editor/package.json`
  - 核心脚本、打包流程、运行入口。
- `apps/editor/electron/main.js`
  - 主进程启动、窗口、协议、handler 注册、运行日志。
- `apps/editor/electron/preload.js`
  - IPC 表面与安全边界，`window.agency` 合同。

### 6）渲染入口与 UI 组合（界面是怎么渲染的）
- `apps/editor/renderer/src/main.jsx`
  - 渲染根节点与 capture overlay 路由。
- `apps/editor/renderer/src/App.jsx`
  - 顶层状态、视图编排与数据流。
- `apps/editor/renderer/src/services/agencyBridge.js`
  - 渲染侧 IPC 统一入口（必须遵守的模式）。

## 主题深挖（按需阅读）

### 终端与键盘输入
- `docs/terminal-keyboard-notes.md`
  - Shift+Enter、CSI-u、bracketed paste 与兼容性说明。

### 语音输入与 rescore
- `docs/voice-input-notes.md`
  - 冷启动路径、多进程模型、常见坑与规避策略。

### UI 组件复用与规范
- `docs/ui-components-guidelines.md`
  - UI primitives、focus ring、IconButton 与 Tooltip 的复用准则。

### 工程规范与 SOP
- `docs/dev-norms.md`
  - 开发规范与必须遵守的工程约束。
- `docs/sop.md`
  - 从规范文档汇总出的自检 SOP 清单。

### 手工测试清单
- `apps/editor/docs/manual-test.md`
  - UI 与关键功能验证流程。

## Docs 维护规范

- `docs/guidebook.md` 只做索引与阅读路径，不承载细则；新增或重命名文档需同步更新此处索引。
- `docs/sop.md` 是从 docs frontmatter 汇总生成的自检 SOP，不要手改；更新规范文档后运行 `node scripts/generate-sop.mjs`。
- `docs` 下所有非 `guidebook.md/sop.md` 的文档必须包含 frontmatter, frontmatter 中要有 `sop` 列表；sop 要说明什么情况下需要阅读或者维护这篇文档.
- 命名规范：小写 kebab-case，使用类型后缀（如 `*-notes.md`、`*-guidelines.md`、`*-norms.md`），避免“implementation-notes”这种过长命名。
- 重命名文档前先用 `rg` 找到所有引用并更新，避免索引与 SOP 漂移。

## 代码结构地图（优先阅读位置）

### 主进程
- `apps/editor/electron/main.js`
- `apps/editor/electron/ipc/handlers/`
  - 按功能划分的 IPC 入口边界。
- `apps/editor/electron/services/`
  - 不应放在 UI 的业务能力。

### 渲染进程
- `apps/editor/renderer/src/components/`
  - 视图组件与界面布局。
- `apps/editor/renderer/src/hooks/`
  - 业务状态与数据编排。
- `apps/editor/renderer/src/services/agencyBridge.js`
  - IPC 访问与 fallback 处理。

### 每个 worktree 的共享状态
- `.agency/`
  - 生命周期、sessions、actions、gates、comments、HIL 资产等。

## 心智模型（快速定位）
- 一个 Cell = 一个 worktree + 一个 branch（严格 1:1）+ 生命周期状态。一个 Cell 中可包含多个 Sessions。
- Sessions 是 tmux 支撑的终端会话，按 Cell 持久化。Terminus 可执行会话的模型定义，Session 是 Terminus 的实体。
- Actions / Gates / Softlinks / App Shortcuts 等配置的默认解析顺序：Global -> Project -> Agent。
- Renderer 不直接访问 Node：必须通过 preload 与 `agencyBridge`。

## 为什么这份 guidebook 不会过期
- 规范与变化以 `openspec/` 为准，始终是权威来源。
- 细节落在各自领域文档（语音、终端等），随功能更新。
- 运行时与验收变化会在 README 与手工测试清单体现。
- 本文只链接“真相来源”，不复制容易变化的细节。

## 修改代码时的最低规范
- 新能力或架构调整必须走 OpenSpec 变更提案流程。
- Renderer IPC 只能通过 `apps/editor/renderer/src/services/agencyBridge.js`。
- 涉及语音输入修改时，同步更新 `docs/voice-input-notes.md`。
- 交付说明中标注本次参考的 guidebook 原则或章节。
- 更新含 sop frontmatter 的文档后，运行 `node scripts/generate-sop.mjs` 并提交 `docs/sop.md`。

## 运行可观测性
- 运行日志：`logs/runtime/`（保留最新 20 份，历史自动归档）。
