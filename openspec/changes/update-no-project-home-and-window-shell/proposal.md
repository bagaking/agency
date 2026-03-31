# Change: Update No-Project Home And Window Shell

## Why
Agency currently routes the no-project window state through a synthetic `local-terminal` Cell. That breaks the canonical object model and leaks window-level behavior into Cell/session-owned pipelines.

The result is user-visible breakage and product confusion:
- opening a new empty window can trigger `sessions:list` failures because no project root exists yet;
- Agent Cells exposes Cell/session affordances that cannot succeed in a no-project window;
- the no-project experience is split across inconsistent surfaces and placeholder visuals instead of one coherent home state.

## What Changes
- Remove the fake Cell/session path from no-project windows and guard session loading against virtual/no-project owners.
- Introduce a window-owned home shell capability for no-project windows, scoped to the current window and rooted at the user home directory.
- Replace the fragmented empty-project UI with one coherent `Project Home` experience:
  - recent projects become the primary center-stage content;
  - the sidebar exposes `Open Project` and `Start Home Shell` as explicit window-level actions;
  - Agent Cells and Explorer no-project states reuse the same home grammar instead of inventing separate fake-object views.
- Keep secondary no-project surfaces (Workbench, Memo, Action Sheets) aligned with the new home-state craft language.
- Update specs, docs, reusable-item catalogs, and manual verification guidance to preserve the canonical object and UX boundaries.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/electron/services/*`
  - `apps/editor/electron/ipc/handlers/*`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/hooks/useSessions.ts`
  - `apps/editor/renderer/src/components/{TerminalArea,ProjectEmptyState,ProjectSettingsView,AgentCellsSidebar}.tsx`
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/renderer/src/components/layout/*`
  - tests and docs covering empty-project startup and window shell behavior
- Risks:
  - regressing existing empty-project bootstrap expectations;
  - introducing a second ad-hoc terminal system if the home shell is not kept separate but reusable;
  - over-designing the home state into a marketing surface that weakens operational clarity.
- Mitigation:
  - keep no-project behavior explicitly window-owned;
  - reuse existing recent-project and title-bar/window-shell seams;
  - prefer one restrained, functional home composition over decorative card sprawl.
