# Change: Add Editor Session Keepalive

## Why
当前 Editor 在关闭后会丢失终端会话与上下文，导致 CLI 任务中断与心智成本上升。需要可恢复的会话与配置化的快捷指令，让用户在重启后快速回到同一工作状态。

## What Changes
- 为每个 Cell 引入可恢复的多会话终端（每个会话可独立打开/恢复）
- 提供快捷指令配置（启动/继续），支持 codex/gemini/claude 等工具的 resume 机制
- 记录并恢复 Editor UI 状态（上次选中 Cell、打开的会话列表、当前会话）
- 明确保活策略与限制：工具是否可恢复由其自身 CLI 能力决定

## Impact
- Affected specs: agency-editor
- Affected code: Electron 主/渲染进程、终端会话服务、配置与持久化层
