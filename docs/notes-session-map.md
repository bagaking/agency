---
title: Session Map (SLG Overview)
required: false
sop:
  - Read this doc when working on the session map overlay or multi-session navigation.
  - Update this doc when map layout, config, or hover preview behavior changes.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Session Map（SLG 总览）

本说明记录 Session Map 的“SLG 访问器”设计：它是一个跨界面、始终可用的总览地图，用来把 **Cells → Sessions** 映射成“城邦 + 角色”的心智模型，帮助用户在多个会话之间快速跳转、协同规划。

## 目标与边界
- **目标**：跨界面地图、固定布局、点击跳转、hover 预览、可扩展统计。
- **非目标**：拖拽摆放、缩放、迷雾、路径规划（v1 不做）。

## 视觉与语义
- **Cell = 城邦 / 阵营**：以“阵营色 + 城邦卡片”表示；默认色基于 `Cell.state` + 创建顺序。
- **Session = 角色**：以圆形角色 token + 状态点表示（active/detached/closed/stale）。
- **离线状态**：Session 为 `closed / stale / archived` 或 Cell 为 `archived / closed` 时标记为离线。

## 交互规则
- **点击 Session token**：仅切换 Cell + Session，不切换当前主界面视图。
- **Hover**：带短延迟以避免抖动；显示动态详情 + 终端实时预览；点击预览也会跳转到该 Session。
- **首次进入**：自动打开地图（每个项目仅一次），之后由用户开关控制。
- **Esc**：关闭 Session Map。
- **键盘**：方向键在 token 间移动焦点，Enter/点击跳转。
- **点击空白**：关闭 Session Map。
- **点击跳转反馈**：点击 token 或缩略图后关闭 Map，便于立即进入目标会话。

## 数据来源
- Cells 来自 Cell 列表。
- Sessions 来自每个 Cell 的 session registry。
- 预览通过 tmux `capture-pane` 周期性抓取输出快照（只读、无输入），保持轻量且不会启动额外 PTY。

## 配置（项目级）
配置文件路径：`<repoRoot>/.agency/session-map.yaml`

字段说明：
```yaml
version: 1
autoOpenSeen: false
typeColors:
  active: "#34d399"
  draft: "#60a5fa"
  archived: "#94a3b8"
cellColors:
  my-cell-id: "#f472b6"
```

- `autoOpenSeen`: 控制首次进入自动打开。
- `typeColors`: 以 Cell 状态（如 `draft/active/archived`）覆盖阵营色。
- `cellColors`: 以 Cell id 覆盖单个阵营色（优先级最高）。

## 实现提示
- 入口：Status Bar 中央的 Session Map Toggle。
- Map Overlay 为全局浮层，定位在 Status Bar 上方。
- 预览窗口仅监听输出流，不注入输入，避免干扰主终端。
