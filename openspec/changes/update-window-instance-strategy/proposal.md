# Change: Window shell restoration and single-instance multi-window strategy

## Why
The repo already treats project context as window-local, but the application still lacks an explicit top-level instance strategy. As a result, "open another project" can be interpreted either as "open a new window in the same app" or "start another isolated process", while the current storage model (`userData`, global shortcuts, recent projects) is only safe for the former.

Without a declared strategy, implementation work on launch routing, state persistence, project switching, and top-level window chrome will continue to drift.

The current implementation also stops short of the baseline desktop behaviors users expect from a multi-window editor:
- relaunch should restore the last working window set, not only one window context;
- window size/position should survive relaunch;
- the top-level window chrome should expose project identity and a first-class window switcher instead of leaving multi-window awareness to the native title bar.

## What Changes
- Declare the default desktop model as a single application instance with multiple independent editor windows.
- Route secondary launch requests to the existing app instance and handle them by opening/focusing a window instead of relying on parallel isolated processes.
- Clarify state ownership:
  - app-global state stays shared in `userData` (for example recent projects and user-level settings);
  - window/workspace state must be isolated per window and must not be overwritten by another window.
- Persist the set of open editor windows and restore that set on relaunch when the app is reopened without an explicit target repository.
- Persist window geometry (`bounds`, maximized/fullscreen state) per window and restore it on relaunch.
- Replace the default top title bar with an app-owned window title bar on the desktop editor shell.
- Show the current project name in that title bar and provide an app-icon-triggered window switcher / new-window entry point there.
- Keep project/repo-scoped configuration in `.agency/`.
- Explicitly mark isolated multi-process profiles / separate `userData` directories as a future escape hatch, not the default product path.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/main.ts`
  - `apps/editor/electron/services/projectRoot.ts`
  - `apps/editor/electron/services/uiState.ts`
  - `apps/editor/electron/ipc/handlers/windowShell.ts`
  - `apps/editor/electron/ipc/handlers/project.ts`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/app/AppShellChrome.tsx`
  - new renderer window-shell/title-bar components + hooks
  - renderer bootstrap / project lifecycle state wiring
- Risk:
  - Reworking window-shell persistence can break project switching, tab/session restore, focused-window routing, or relaunch behavior.
  - Moving to an app-owned title bar can introduce drag-region, focus, and pointer-event regressions.
- Mitigation:
  - Land the change in layers: launch routing/state split first, then multi-window restore/geometry, then custom title bar/window switcher, with focused regression coverage.
