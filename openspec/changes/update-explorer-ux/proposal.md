# Change: Improve Explorer UX and performance

## Why
Explorer is central to Agency workflows. It must remain fast on large repos, expose richer status context, and offer IDE-grade navigation/controls.

## What Changes
- Add performance guardrails (virtualized rendering, incremental refresh).
- Add richer visibility controls and status filters.
- Improve keyboard navigation and multi-select actions.
- Add auto-refresh via file system watching.

## Impact
- Affected specs: agency-editor
- Affected code: explorer services, renderer explorer components, IPC handlers
