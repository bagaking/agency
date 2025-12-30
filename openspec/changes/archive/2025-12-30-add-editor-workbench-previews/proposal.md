# Change: Add workbench previews with tabs, blame, and media support

## Why
The current file preview is minimal and single-pane, which makes it hard to navigate multiple files or trust code context. A richer workbench with tabs, diff/blame insights, and media preview is needed to match editor expectations and reduce context switching.

## What Changes
- Introduce a workbench area with multi-tab file views, preview vs pinned behavior, and state persistence per Cell.
- Upgrade text previews to a full code viewer with line numbers, syntax highlighting, search, and optional edit/save flows.
- Add git-aware diff decorations and blame insights for the active file.
- Add media previews for common image/video/audio/PDF files with zoom and fit controls.
- Improve user interaction: breadcrumbs, file status indicators, quick-open, and consistent empty/errored states.

## Impact
- Affected specs: openspec/specs/agency-editor/spec.md
- Affected code: Explorer, main content pane, file IO services, git services, UI state persistence.
