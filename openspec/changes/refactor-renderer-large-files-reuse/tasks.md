## 1. Analysis Baseline
- [x] 1.1 Audit current large renderer files (`>=800` lines) and capture quality/reuse findings.
- [x] 1.2 Define reuse-first decomposition strategy for each audited file.

## 2. Reuse-first Foundation
- [ ] 2.1 Extract shared external drop-path parser utility and migrate Agent Cells + Explorer to it.
- [ ] 2.2 Extract shared file-dashboard preview loading hook and migrate Agent Cells + Explorer changed-files panel.
- [ ] 2.3 Add renderer bridge adapters for terminal/workbench/HIL snippet flows and migrate direct component calls.
- [ ] 2.4 Add/align shared helper utilities for repeated activity-diff and preview-normalization logic where applicable.

## 3. Large-file Decomposition
- [ ] 3.1 Decompose `apps/editor/renderer/src/App.tsx` into domain controllers/hooks while preserving integration props.
- [ ] 3.2 Decompose `apps/editor/renderer/src/components/AgentCellsSidebar.tsx` into session list and dashboard modules.
- [ ] 3.3 Decompose `apps/editor/renderer/src/components/TerminalPane.tsx` into lifecycle/resize/input/selection modules.
- [ ] 3.4 Decompose `apps/editor/renderer/src/components/explorer/ProjectExplorerSidebar.tsx` into actions/dnd/panel modules.
- [ ] 3.5 Decompose `apps/editor/renderer/src/components/hil/memo/HilMemoView.tsx` into list/detail/mutation modules.
- [ ] 3.6 Decompose `apps/editor/renderer/src/components/hil/HilCommentsPanel.tsx` by splitting comments panel and promote modal.
- [ ] 3.7 Decompose `apps/editor/renderer/src/components/workbench/WorkbenchPane.tsx` into loading/sync/command modules.
- [ ] 3.8 Decompose `apps/editor/renderer/src/components/QuickActionsView.tsx` into profile/binding/capture modules.

## 4. Validation
- [ ] 4.1 Typecheck passes for renderer/electron.
- [ ] 4.2 Existing E2E and manual smoke paths for Agent Cells / Explorer / Terminal / Workbench / HIL remain valid.
- [ ] 4.3 No user-visible behavior regressions in file open/reveal/import, terminal interaction, memo/promote, and quick actions.

## 5. Bagakit Reuse Documentation (Required after refactor completion)
- [ ] 5.1 Update `docs/notes-reusable-items-coding.md` for all newly introduced or changed reusable items.
- [ ] 5.2 Record deprecations/replacements for removed duplicated logic (with migration note/source path).
- [ ] 5.3 If SOP/frontmatter changes are introduced in docs, regenerate `docs/must-sop.md`.
