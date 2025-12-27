## Context
需要一个跨平台桌面工具来显式管理 Cell/agent，并将 CLI 工作流与 UI 统一在一个可控的上下文中。

## Goals / Non-Goals
- Goals:
  - v0.2 优先支持 macOS，聚焦可用性与上下文隔离
  - 内置终端以托管 Codex 等 CLI 进程
  - Cell 生命周期通过本地文件在 CLI 与 Editor 间透传
- Non-Goals:
  - 在 v0.2 做完整/严格的 spec 与分支验证（仅最小化校验）
  - 在 v0.2 交付 Windows/Linux 构建产物

## Decisions
- 技术栈：Electron（为未来跨平台保留路径，但 v0.2 先做 macOS）
- UI 样式：Tailwind CSS，采用 VSCode 风格的 IDE 布局（Activity Bar, Sidebar, Editor Pane, Status Bar）
- 动画：Rive（用于状态指示、加载态与空状态，提升应用质感）
- 内置终端：xterm.js + node-pty
- 终端策略：默认只启动 shell，不自动运行 CLI；提供快捷指令（codex/gemini/claude）触发 CLI；切换 Cell 自动打开 shell；应用关闭后会话终止，重启后自动恢复到上次选中的 Cell 并开启新 shell
- 生命周期文件：放在每个 worktree 的 `.agency/` 目录下，文件名包含该 worktree 的唯一名字；格式采用 YAML（优先）或 Markdown（可选）
- 校验策略：仅做最小化校验并标注为临时版本（例如：存在 spec 文件、分支与 worktree 绑定关系）

## Lifecycle Gates & Confirmation
- 生命周期切换必须二次确认；确认弹窗展示目标状态所需的 Gate 结果
- Gate 通过前不允许切换状态（Active/Archived）
- Gate 规则（v0.2 最小实现）：
  - Spec 已创建：存在 `openspec/changes/*/proposal.md` 与 `openspec/changes/*/specs/**/spec.md`
  - Checklist 已完成：`openspec/changes/*/tasks.md` 中无未勾选项
  - 无未解决冲突：worktree 中无 `git ls-files -u` 记录
- UI 必须明确展示 Gate 清单与失败原因，并提供下一步提示

## Skill Guidance
- worktree 管理与隔离：`git-worktree`、`using-git-worktrees`
- 内置终端与 xterm.js 集成：`xterm-js`
- UI 设计与组件系统：`tailwind-design-system`
- Electron 主/渲染进程通信：`electron-ipc`
- VSCode 风格 WebView 模式（可选参考）：`vscode-webview-expert`
- UI 自动化与视觉回归：`playwright-skill`

## Observability & UI Validation (MVP)
- 采用 Playwright 驱动 Electron 进行 UI 端到端测试
- 使用 `data-testid` 提供稳定选择器
- 使用截图基线进行视觉回归对比
- 终端进程通过轻量 CLI Stub 或测试模式输出固定脚本，降低测试噪声

## Risks / Trade-offs
- Electron 体积较大，但换取开发速度与生态成熟度
- 内置终端需跨平台 PTY 支持，需评估 node-pty 的兼容性
- YAML/Markdown 双格式增加解析复杂度，需控制范围

## Migration Plan
- 先实现 macOS 可用版本，稳定后再补齐 Windows/Linux 构建与兼容性
