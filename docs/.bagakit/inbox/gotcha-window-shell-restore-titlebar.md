---
title: Window shell restore and title bar rollout notes
kind: gotcha
status: inbox
tags:
  - gotcha
  - window-shell
  - electron
  - multi-window
sources:
  - apps/editor/electron/main.ts
  - apps/editor/electron/services/uiState.ts
  - apps/editor/electron/services/windowShell.ts
  - apps/editor/renderer/src/components/WindowTitleBar.tsx
  - openspec/changes/update-window-instance-strategy/specs/agency-editor/spec.md
created: 2026-03-24
updated: 2026-03-24
---

## Candidate
- Multi-window restore needs two separate persistence concepts:
  - per-window workspace snapshot (`projectRoot`, selection, tabs, layout, geometry)
  - app-global list of currently open `windowStateId`s used for passive relaunch restore
- Explicit launch intent must override passive restore. If the app is opened with a concrete repo path, restore only that requested window instead of replaying the previous window set.
- A custom title bar is not only a visual preference; once the product is truly multi-window, the shell needs a first-class place to expose current project identity and window switching.
- Only editor windows with a real `__agencyWindowStateId` should appear in the window switcher / Dock menu. Auxiliary windows like overlays must be excluded.
- Restored geometry should be clamped to the active display work area so stale monitor layouts do not reopen windows off-screen.

## Promote To
- `docs/.bagakit/memory/gotcha-window-shell-restore-titlebar.md` (curated), or
- `docs/<type>-<topic>.md` (normative/deep guide)
