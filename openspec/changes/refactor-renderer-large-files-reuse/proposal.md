# Change: Refactor large renderer files with reuse-first module extraction

## Why
The current renderer source has 10 files above the 800-line project quality threshold, with multiple files above 1,500 lines.
This increases regression risk, review cost, and onboarding time.

A focused audit of the current large-file list shows recurring quality and reuse issues:
- monolithic orchestration in `App.tsx` (state/effect/callback density is too high for safe iteration);
- duplicated external drop-path parsing in Agent Cells and Explorer sidebars;
- repeated file-preview loading patterns across file dashboards;
- repeated file-snippet preview loading patterns across dashboards and HIL comment anchors;
- direct `window.agency` usage in large React components (TerminalPane, Explorer, Workbench, HIL comments), which bypasses renderer service wrappers and conflicts with project norms.

## What Changes
- Perform a staged refactor for the current large renderer files:
  - `apps/editor/renderer/src/App.tsx`
  - `apps/editor/renderer/src/components/AgentCellsSidebar.tsx`
  - `apps/editor/renderer/src/components/TerminalPane.tsx`
  - `apps/editor/renderer/src/components/terminal/useTerminalRuntimeEffect.ts`
  - `apps/editor/renderer/src/components/explorer/ProjectExplorerSidebar.tsx`
  - `apps/editor/renderer/src/components/hil/memo/HilMemoView.tsx`
  - `apps/editor/renderer/src/components/hil/HilCommentsPanel.tsx`
  - `apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx`
  - `apps/editor/renderer/src/components/QuickActionsView.tsx`
  - `apps/editor/renderer/src/components/SessionReplyPanel.tsx`
- Extract reusable modules first (shared utility/hook/component) before file-local splitting.
- Route renderer-main interactions through bridge services instead of direct `window.agency` in React components.
- Consolidate duplicated drag-drop parsing and file-preview loading behavior into shared reusable modules.
- Keep feature behavior unchanged (refactor-only scope).
- After refactor completion, update Bagakit reusable catalog docs for all new/changed reusable items.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - renderer orchestration/components/hooks/services under `apps/editor/renderer/src/**`
  - supporting utilities for file interaction / terminal / workbench / HIL / explorer
  - docs catalog updates under `docs/notes-reusable-items-coding.md` (and related docs if needed)
- Risks:
  - UI behavior regressions during decomposition
  - subtle IPC behavior drift when replacing direct runtime calls
  - over-fragmented abstractions that reduce readability
- Mitigations:
  - split by bounded domain slices with integration tests between each slice
  - keep adapters thin and preserve existing payload contracts
  - enforce “reuse-first but minimal abstraction” with explicit ownership per extracted module
