---
title: Terminal Interaction Requirements
required: false
sop:
  - Read this doc when changing terminal mouse/selection/scroll behavior.
  - Update this doc when interaction requirements or competitive research changes.
  - Regenerate docs/must-sop.md after updating this doc.
---

# Terminal 交互需求（鼠标/选区/快捷键）

## 原始诉求
1. 鼠标交互正常（TUI 点击、滚动可用）。
2. Shift/Ctrl/Command 等功能按键组合正常。
3. 可选中区域并触发 Reply/Memo/Send 等选区动作。

## 第一性原理
- **终端鼠标协议是互斥的**：当应用（tmux/TUI）开启 mouse reporting，鼠标事件会被发送给应用，终端本地就无法同时拿到同一事件做选区。
- **输入必须可判定意图**：同一拖拽动作要么是给应用（TUI 操作），要么是给终端（文本选区），必须有明确的“用户意图标记”。
- **滚动是最基础能力**：任何方案都不能牺牲滚动/交互；选区应建立在“明确意图”之上，而不是默认关闭交互。

## 长期注意与延迟满足
- **长期注意**：优先兼容上游（tmux/xterm/xterm.js）的主流行为，降低维护成本与生态不一致风险。
- **延迟满足**：接受“选区需要显式修饰键”这一操作成本，换取长期一致与可维护的交互模型；避免短期 hack（如默认关闭 mouse）导致持续体验劣化。

## 竞品调研（摘要）
- **VSCode Terminal**：基于 xterm.js，使用终端侧的鼠标事件裁决机制；默认交互给 TUI，修饰键触发本地选区/滚动。
- **iTerm2**：提供“按 Option/Alt 时忽略鼠标上报”的开关，允许在 mouse reporting 下进行本地选择。
- **xterm**：传统行为为按 Shift 进行选择，以绕过 mouse reporting。
- **tmux**：mouse on/off 是会话级开关，本身不支持“同时交给应用又给本地选区”。

## 方案对比
- **方案 A：tmux mouse 关闭（现状）**
  - 优点：本地选区稳定
  - 缺点：TUI 鼠标/滚动失效；不满足基础滚动需求
- **方案 B：tmux mouse 开启 + 修饰键强制选区（推荐）**
  - 优点：TUI 鼠标与滚动默认可用；选区可用；与 VSCode/xterm 一致
  - 缺点：选区需要显式修饰键
- **方案 C：tmux copy-mode 选区为主**
  - 优点：无需关闭 mouse
  - 缺点：选区在 tmux 内部，无法直接复用到 Reply/Memo/Send UI；实现复杂

## 最终设计（Breaking Change）
- **默认：tmux mouse ON**，确保 TUI 鼠标与滚动优先可用。
- **Shift / Command / Option/Alt + 拖拽**：临时关闭 tmux mouse，允许 xterm 本地选区并触发选区动作。
- **Option/Alt + 滚轮**：强制本地 scrollback（不发送给 TUI）。
- **选区锁定**：本地选区存在期间保持 tmux mouse OFF；仅在选区清空后恢复 tmux mouse ON，避免 Cmd 选词后选区瞬间丢失。
- **Cmd 激活保护窗口**：在 modifier 释放后短暂延迟恢复（约 180ms），覆盖浏览器/xterm 的延迟选区事件。

## 扩展潜力
- 用户可配置“选区修饰键”与“本地滚轮修饰键”。
- 将 tmux copy-mode 选区作为辅助通道并做 UI 资产化（可选，不作为主路径）。
- 增加交互指示（状态栏/tooltip）提示当前鼠标模式。

## 验证要点
1. TUI（例如 htop/less/tmux copy-mode）可滚动、点击。
2. Shift 或 Option/Alt + 拖拽能选区并触发 Reply/Memo/Send。
3. Option/Alt + 滚轮走本地 scrollback。
4. 选区清空后 TUI 鼠标恢复；连续多次新建选区不会回跳到旧选区。
