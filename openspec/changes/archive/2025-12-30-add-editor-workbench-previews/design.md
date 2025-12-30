## Context
Explorer currently opens a single preview pane. Users want an IDE-like workbench: multiple tabs, line numbers, syntax highlighting, blame, diff indicators, and media previews with strong interaction affordances.

## Goals / Non-Goals
- Goals:
  - Provide a workbench with tabs, preview vs pinned behavior, and per-Cell persistence.
  - Support code viewer/editor features: line numbers, syntax highlighting, search, and optional edits with save/dirty state.
  - Surface git-aware diff and blame insights with clear UI toggles.
  - Preview common media (images, video, audio, PDF) with zoom/fit controls.
  - Emphasize UX quality: fast switching, clear empty/error states, and consistent keyboard shortcuts.
- Non-Goals:
  - Full language server integration (diagnostics, intellisense).
  - Collaborative editing or merge tools.

## UX Interaction Model
- Single click in Explorer opens a preview tab (italic title). Double click pins the tab.
- Tabs can be reordered, closed, or pinned; unsaved files show a dot.
- Breadcrumbs show file path; status bar shows line/column, encoding, and file size.
- Diff and blame can be toggled per tab with clear indicators.
- Media preview provides zoom/fit, playback controls, and a Reveal action.
- Errors and oversized/binary files show actionable warnings with fallback actions.

## Technical Approach
- Workbench container hosts a tab model and view renderer (CodeView, MediaView, BinaryView).
- CodeView uses Monaco with a file-backed model; apply diff decorations and blame hover overlays.
- File service handles read/write, change detection, and file size guards.
- Git service exposes diff ranges and blame data, cached per file and invalidated on change.
- UI state persistence stores open tabs, active tab, and preview/pinned state per Cell.

## Risks / Trade-offs
- Performance impact for blame/diff on large files: mitigate via caching and lazy refresh.
- Editing introduces conflict risk; mitigate with file change detection and explicit reload prompts.
