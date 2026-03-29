---
title: Promotion Delivery Mechanism
required: false
sop:
  - Read this doc when changing Promote, Explorer feed dispatch, or Session Reply delivery flows.
  - Update this doc when delivery lifecycle, storage contract, or metadata schema changes.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Promotion Delivery Mechanism

一句话：当前项目的 `promotion` 已经收口为一个统一 Delivery 协议，Promote / Explorer / Session Reply 只是不同入口，底层生命周期和存储契约一致。

补充约束：`Delivery` 是 workflow artifact，不是新的执行对象层级。它负责把 source artifacts 和 target sessions 连接起来，但不替代 `Cell / Session / Run` 这组 canonical objects。

## 1. 机制边界（什么算 promotion）

在本项目里，`promotion` 指的是“把输入上下文投递到目标 session，并可追踪其执行与消费”的统一流程，而不是某个单独按钮。

三类来源：
- `source=promote`：HIL Promote 弹窗。
- `source=explorer`：Explorer 选中文件后发起 feed。
- `source=session`：Session Reply 快速发送。

统一 API（renderer 只调用这四个）：
- `startDelivery`
- `confirmDelivery`
- `getDeliveryStatus`
- `getDeliveryTimeline`

## 2. 分层与职责

### 2.1 Renderer 编排层

- Promote 编排：`apps/editor/renderer/src/app/useHilPromoteWorkflow.ts`
- Explorer 编排：`apps/editor/renderer/src/app/useActionSheetOrchestration.ts`
- Session Reply 编排：`apps/editor/renderer/src/components/SessionReplyPanel.tsx`

职责：收集输入、选择模式（quick/gated）、决定何时 confirm、驱动 UI 状态。

### 2.2 Bridge + IPC 层

- Bridge：`apps/editor/renderer/src/services/agencyBridge.ts`
- IPC handler：`apps/editor/electron/ipc/handlers/delivery.ts`
- Shared terminal dispatch bridge: `dispatchTerminalInput` -> `terminal:dispatchInput`

职责：把 renderer delivery 调用映射到主进程 delivery 服务，并复用同一条标准 session-input dispatch 通道。

### 2.3 Electron host facade

- `apps/editor/electron/services/delivery.ts`
- `apps/editor/electron/services/terminal.ts#dispatchSessionInput`

职责：调用 domain 层；通过统一 `dispatchSessionInput` 原语把文本注入 terminal session，并把确认策略映射为显式提交行为。

### 2.4 Domain + Persistence（SSOT）

- 流程与状态机：`pkg/agency-data/src/promote-system/index.ts`
- Draft 存储：`pkg/agency-data/src/repositories/hilRepository.ts`
- 审计存储：`pkg/agency-data/src/repositories/deliveryAuditRepository.ts`

职责：统一生命周期、元数据规范、落盘与查询行为。

## 3. 统一生命周期（状态与动作）

### 3.1 `startDelivery`

固定动作：
1. 规范化 `source` / `mode` / request。
2. `mode=gated` 时创建并初始化 Action Sheet。
3. 创建 delivery draft（HIL）。
4. 追加审计事件 `queued`。
5. 派发命令到目标 session。
6. draft 状态推进到 `running`，并追加审计事件 `running`。

### 3.2 `confirmDelivery`

固定动作：
1. 对可消费引用执行 `processed=true` 标记（`system=hil` 且可定位到 item id）。
2. draft 状态推进到 `executionStatus=complete`。
3. 回填兼容字段（如 `promoted=true`、`executionAcknowledgedAt`）。
4. 追加审计事件 `complete`。

### 3.3 查询 API

- `getDeliveryStatus`：返回 draft + 关联 Action Sheet 状态（用于 UI 实时展示）。
- `getDeliveryTimeline`：按 source/mode/limit 读取 JSONL 审计流。

## 4. 三个入口的接入差异

### 4.1 Promote（HIL Modal）

- 选取待处理 `comment/memo/reply` 项。
- 调 `startDelivery(source=promote)`。
- quick：派发后立即 `confirmDelivery`。
- gated：先跑 Action Sheet，满足 gate 后再 confirm。

### 4.2 Explorer Feed

- 将文件选择组装为 `selectedItems`。
- 调 `startDelivery(source=explorer)`。
- quick：立即 confirm。
- gated：保留 Action Sheet 流程。

### 4.3 Session Reply Quick Send

- 先创建一条 `reply` 项（保留原对话语义）。
- 调 `startDelivery(source=session, mode=quick)`。
- 立即 confirm。
- 回写 reply 与 delivery 的关联 meta（如 `deliveryDraftId`、`deliverySession`）。

关键约束：Session Reply 现在默认自动确认一次：
- `appendEnter: true`
- `doubleEnter: false`
- host 侧把该确认映射为显式提交按键，而不是仅写入原始回车字符。

## 5. 存储契约（统一落盘）

### 5.1 Draft（HIL）

delivery draft 统一写入 HIL：
- 索引：`.agency/hil/index-<worktree>.yaml`
- draft artifact：`.agency/hil/<worktree>/drafts/<id>.yaml`

### 5.2 Audit Timeline（JSONL）

统一写入：
- `.agency/delivery/events-<worktree>.jsonl`

事件按行追加，天然支持时间线回放与 source 过滤。

## 6. 元数据契约（追踪归属的关键字段）

draft `meta` 的核心字段：
- `deliverySource` / `sourceBatch`
- `deliveryMode`
- `executionStatus`
- `executionSessionId`
- `deliveryCellId`
- `actionSheetId`
- `deliveryReferences`
- `deliveryTimeline[]`

业务可扩展字段（经 `request.metadata` 透传）：
- `sourceSession`（发起会话归属）
- `targetSession`（目标会话归属）
- `selection`（来源上下文）
- `promptBundle` / `promptText`（提示词上下文）

## 7. UI 判定口径（Gate + Timeline）

Promote 侧常见判定：
- quick：confirm 后进入 `complete`。
- gated：Action Sheet gate pass/completed，或 draft 满足完成条件后可确认。

兼容口径（旧 UI 仍依赖）：
- `meta.promoted === true`
- `meta.executionStatus === 'complete'`

Timeline 跳转策略：
- 有 `draftId`：打开 Memo Draft。
- 否则有 `actionSheetId`：打开 Action Sheet 面板。

## 8. 兼容策略

- 旧记录可用 `sourceBatch` 回退识别 source。
- 不要求一次性迁移旧 draft。
- 读取时优先新字段，不足时回退兼容字段。

## 9. 维护时最小验证清单

1. Promote quick：生成 draft + audit，并在确认后 complete。
2. Explorer quick：生成 `source=explorer` 的统一 draft + audit。
3. Session Reply quick：生成 `source=session` 记录，且包含 origin/target session 元数据。
4. gated 流：Action Sheet 与 draft 状态可通过 `getDeliveryStatus` 协同追踪。
