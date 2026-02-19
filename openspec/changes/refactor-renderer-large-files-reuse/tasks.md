## 1. Analysis Baseline
- [x] 1.1 Audit current large renderer files (`>=800` lines; currently 10 files) and capture quality/reuse findings.
- [x] 1.2 Define reuse-first decomposition strategy for each audited file (including terminal runtime hook + session reply panel).

## 2. Reuse-first Foundation
- [x] 2.1 Extract shared external drop-path parser utility and migrate Agent Cells + Explorer to it.
- [x] 2.2 Extract shared file-dashboard preview loading hook and migrate Agent Cells + Explorer changed-files panel.
- [x] 2.3 Add renderer bridge adapters for terminal/workbench/HIL snippet flows and migrate direct component calls.
- [x] 2.4 Add/align shared helper utilities for repeated activity-diff and preview-normalization logic where applicable.
- [x] 2.5 Add renderer bridge adapters for Explorer clipboard/materialize flows and remove direct `window.agency` usage in `ProjectExplorerSidebar`.
- [x] 2.6 Extract a shared file-snippet preview loader for dashboard + HIL anchor hover previews to unify request/cancel/error handling.
- [x] 2.7 Add missing Explorer bridge adapters (root/status/list/watch) and migrate `useProjectExplorer` away from direct `window.agency` usage.
- [x] 2.8 Add missing session bridge adapters (list/create/close/detach/rename/meta) and migrate `useSessions` away from direct `window.agency` usage.
- [x] 2.9 Keep `services/agencyBridge.ts` under renderer quality limits by splitting into domain bridge modules if it grows past 800 lines.
- [x] 2.10 Remove direct `window.agency` usage in smaller but frequently edited renderer modules (`useWorktreeLinks`, `CreateCellModal`, `QuickOpenModal`, Session Map debug logging).

## 3. Large-file Decomposition
- [x] 3.1 Decompose `apps/editor/renderer/src/App.tsx` into domain controllers/hooks while preserving integration props.
- [x] 3.2 Decompose `apps/editor/renderer/src/components/AgentCellsSidebar.tsx` into session list and dashboard modules.
- [x] 3.3 Decompose `apps/editor/renderer/src/components/TerminalPane.tsx` into lifecycle/resize/input/selection modules.
- [x] 3.4 Decompose `apps/editor/renderer/src/components/explorer/ProjectExplorerSidebar.tsx` into actions/dnd/panel modules.
- [x] 3.5 Decompose `apps/editor/renderer/src/components/hil/memo/HilMemoView.tsx` into list/detail/mutation modules.
- [x] 3.6 Decompose `apps/editor/renderer/src/components/hil/HilCommentsPanel.tsx` by splitting comments panel and promote modal.
- [x] 3.7 Decompose `apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx` into loading/sync/command modules.
- [x] 3.8 Decompose `apps/editor/renderer/src/components/QuickActionsView.tsx` into profile/binding/capture modules.
- [x] 3.9 Decompose `apps/editor/renderer/src/components/terminal/useTerminalRuntimeEffect.ts` into focused runtime sub-hooks/utilities (linking, selection-mode arbitration, resize/activity sync).
- [x] 3.10 Decompose `apps/editor/renderer/src/components/SessionReplyPanel.tsx` into composer/history/routing modules and move shared helpers into reusable utilities.

## 4. Validation
- [x] 4.1 Typecheck passes for renderer/electron.
- [x] 4.2 Existing E2E and manual smoke paths for Agent Cells / Explorer / Terminal / Workbench / HIL remain valid.
- [x] 4.3 No user-visible behavior regressions in file open/reveal/import, terminal interaction, memo/promote, and quick actions.
- [x] 4.4 Add/refresh targeted unit tests for extracted shared modules (drop parser, preview loader, terminal/runtime helpers).

## 5. Bagakit Reuse Documentation (Required after refactor completion)
- [x] 5.1 Update `docs/notes-reusable-items-coding.md` for all newly introduced or changed reusable items.
- [x] 5.2 Record deprecations/replacements for removed duplicated logic (with migration note/source path).
- [ ] 5.3 If SOP/frontmatter changes are introduced in docs, regenerate `docs/must-sop.md`.
