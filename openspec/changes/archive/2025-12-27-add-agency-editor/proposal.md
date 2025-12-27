# Change: Add Agency Editor

## Why
在多 agent 并行开发场景下，需要一个桌面化工具来显式管理 Cell 与上下文，避免并行污染并提升可控性。为了降低初期成本与不必要的技术细节，优先实现 macOS 可用版本，并为未来跨平台预留路径。

## What Changes
- 新增桌面应用「Agency Editor」，v0.2 优先支持 macOS，跨平台作为后续目标
- 集成内置终端，集中管理 Codex 等 CLI 流程
- 基于本地文件透传 Cell 生命周期状态
- 提供最小化的 spec/branch 校验，并在实现说明中标注为临时版本
- 明确 AI Friendly 技术规范（Electron + Tailwind + Rive）

## Impact
- Affected specs: agency-editor (new)
- Affected code: 新增桌面端应用与相关工具链
