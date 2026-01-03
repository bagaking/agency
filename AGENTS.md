<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

Use pnpm for workspace Node dependencies and keep `pnpm-lock.yaml` committed.

## Development Norms

### Quality

合理设计代码架构, 注重 DRY 和 SOLID 原则, 出现单个文件超过 800 时主动重构

### Electron IPC/Preload Health

- Treat `preload` + IPC injection as a required runtime dependency.
- Always verify `window.agency` is available before invoking IPC from the renderer.
- If IPC/preload is missing or fails, surface a minimal status bar indicator (e.g. red state + short label) and log the failure for debugging. Avoid hard-blocking user flows unless required.
- When adding new renderer actions, ensure a safe fallback path or a clear error message in logs.

### Renderer IPC Access

- Centralize renderer↔main IPC calls in `apps/editor/renderer/src/services/agencyBridge.js`.
- Avoid direct `window.agency` usage in React components; route through the bridge for consistency and easier testing.
