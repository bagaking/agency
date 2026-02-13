## 1. Implementation
- [x] 1.1 Move Agent Cells Explorer panel to bottom-anchored placement in the Agent Cells sidebar flow.
- [x] 1.2 Define and implement Cell/worktree semantics (no session-level attribution):
  - [x] 1.2.1 `Changes` view renders git-modified files from Explorer status source (excluding ignored).
  - [x] 1.2.2 `All` view lists tracked + untracked files for the selected Cell worktree (with truncation hint).
- [x] 1.3 Keep Flat/Tree view modes with deterministic sorting and stable empty states.
- [x] 1.4 Keep `open`/`reveal` actions routed through unified file intents.
- [x] 1.5 Extend panel drag/drop interactions:
  - [x] 1.5.1 keep drag-out `text/plain` absolute-path payloads.
  - [x] 1.5.2 add drop-in external file import into selected Cell worktree via unified `import_copy` semantics.
- [x] 1.6 Add/adjust unit tests for Agent Cells file list derivation, scope behavior, and drag/drop payload handling.
- [ ] 1.7 Add/adjust integration/manual tests for panel placement, Changes/All toggle, open/reveal, and drop import.
- [x] 1.8 Add Explorer sidebar companion changed-files panel above Agent footer (no scope toggle; changed files only) for visual continuity.
- [x] 1.9 Extract reusable file-dashboard list rendering for Agent Cells + Explorer companion panel.
- [x] 1.10 Add in-place preview action for dashboard rows without forcing view switch.
- [x] 1.11 Update docs describing Agent Cells + Explorer file-dashboard behavior.
- [x] 1.12 Add collapse-to-bottom + drag-resize behavior for embedded Explorer (default half-height).
- [x] 1.13 Add `Changes` vs `All` filter for `Cell` scope (`All` lists files, indicates truncation; `Changes` excludes ignored).
- [x] 1.14 Ensure Agent list and embedded Explorer list scroll independently when overflowing.
- [x] 1.15 Tighten file list UI (remove heavy borders, make rows more compact).
- [x] 1.16 Extend Explorer search IPC to support retrieving all files for embedded Explorer (`includeAll`).

## 2. Validation
- [ ] 2.1 `Changes` shows modified files for selected Cell and updates after git changes.
- [ ] 2.2 `All` lists files and indicates truncation when limit is hit.
- [ ] 2.3 Flat/Tree toggles preserve correct entries and hierarchy.
- [ ] 2.4 File row open/reveal works and lands in Explorer/workbench correctly.
- [ ] 2.5 Drag-out payload from Agent Cells panel is consumable by Explorer import flow.
- [ ] 2.6 Drop-in external files into panel imports into selected Cell worktree with conflict-safe naming.
- [ ] 2.7 Explorer sidebar companion panel shows changed files for selected Cell and preserves continuity with Agent Cells panel affordances.
