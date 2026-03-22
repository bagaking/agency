# Change: Single-instance multi-window strategy

## Why
The repo already treats project context as window-local, but the application still lacks an explicit top-level instance strategy. As a result, "open another project" can be interpreted either as "open a new window in the same app" or "start another isolated process", while the current storage model (`userData`, global shortcuts, recent projects) is only safe for the former.

Without a declared strategy, implementation work on launch routing, state persistence, and project switching will continue to drift.

## What Changes
- Declare the default desktop model as a single application instance with multiple independent editor windows.
- Route secondary launch requests to the existing app instance and handle them by opening/focusing a window instead of relying on parallel isolated processes.
- Clarify state ownership:
  - app-global state stays shared in `userData` (for example recent projects and user-level settings);
  - window/workspace state must be isolated per window and must not be overwritten by another window.
- Keep project/repo-scoped configuration in `.agency/`.
- Explicitly mark isolated multi-process profiles / separate `userData` directories as a future escape hatch, not the default product path.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/main.ts`
  - `apps/editor/electron/services/projectRoot.ts`
  - `apps/editor/electron/services/uiState.ts`
  - `apps/editor/electron/ipc/handlers/project.ts`
  - renderer bootstrap / project lifecycle state wiring
- Risk:
  - Reworking UI-state ownership can break project switching, tab restore, or focused-window routing.
- Mitigation:
  - Land the change in layers: instance lock and launch routing first, then state-scope split, then focused regression coverage.
