# Change: Refactor Reuse Foundations and TS Migration Preparation

## Why
The editor currently duplicates core logic across main/renderer layers (session naming parser, scoped settings lifecycle, path safety helpers). This duplication increases regression risk and makes upcoming TypeScript migration harder.

## What Changes
- Introduce shared reusable modules for:
  - scoped settings state management in renderer
  - session naming rule parsing/formatting logic shared by main and renderer
  - path normalize/safe-resolve helpers used by Electron services and preload
- Refactor existing hooks/services to consume these modules without behavior changes.
- Route gates hook IPC through `agencyBridge` wrappers (remove direct `window.agency` dependency in this path).
- Record reusable module catalog updates in coding docs.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/**`
  - `apps/editor/electron/preload.js`
  - `apps/editor/renderer/src/hooks/**`
  - `apps/editor/renderer/src/utils/sessionNaming.js`
  - `apps/editor/renderer/src/services/agencyBridge.js`
  - `apps/editor/shared/sessionNamingCore.cjs`
  - `docs/notes-reusable-items-coding.md`
