# Change: Refactor Electron IPC Handlers to TypeScript

## Why
After Electron TS runtime foundation landed, IPC handlers remain JS-only and are now the highest-leverage migration surface. They define the renderer-main boundary contracts and are touched frequently when adding capabilities.

Migrating this layer to TS improves maintainability and reduces contract drift risk without changing product behavior.

## What Changes
- Migrate all Electron IPC handler modules under `apps/editor/electron/ipc/handlers/` from `.js` to `.ts`.
- Keep runtime channel names and behavior unchanged.
- Refine handler registration structure to reduce repetitive boilerplate while preserving initialization order.
- Maintain compatibility with existing JS services during incremental migration.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/ipc/handlers/*.ts`
  - `apps/editor/electron/main/ipcSetup.ts`
- Risk:
  - Behavior regressions if channel handlers are accidentally reordered or omitted.
- Mitigation:
  - Keep channel names and logic unchanged.
  - Validate with Electron build + typecheck + renderer build + OpenSpec validation.
