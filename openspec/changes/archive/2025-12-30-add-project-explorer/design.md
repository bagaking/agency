## Context
Agency needs a first-class project explorer that feels as capable as VSCode while also surfacing Cell-specific changes. The explorer must be fast on large repos and reflect git status across multiple worktrees.

## Goals / Non-Goals
- Goals:
  - Provide VSCode-class file navigation and file operations.
  - Expose git status, line counts, and per-Cell change attribution in the tree.
  - Keep the tree responsive via lazy loading and caching.
- Non-Goals:
  - Build a full code editor; opening files may rely on existing viewers or system defaults.
  - Replace terminal workflows; explorer is navigation and file operations only.

## Decisions
- Decision: Run filesystem and git aggregation in the main process via IPC.
  - Rationale: file operations and git access are safer and more consistent when centralized.
- Decision: Keep the Explorer module isolated (dedicated IPC handlers, services, and renderer components).
  - Rationale: minimizes coupling with Agent Cells and Hierarchy views, keeping future refactors localized.
- Decision: Use lazy directory loading with a refresh command.
  - Rationale: avoids blocking the UI on large repositories.
- Decision: Compute Cell attribution by scanning each Cell worktree for `git status --porcelain` and `git diff --numstat`.
  - Rationale: consistent, tool-agnostic diff data that maps cleanly to file paths.

## Risks / Trade-offs
- Performance: scanning multiple worktrees can be heavy.
  - Mitigation: debounce refreshes, cache per-Cell results, and only recompute on demand or file watcher events.
- Path mapping: files renamed or deleted across worktrees can cause ambiguous attribution.
  - Mitigation: show status based on the latest scan and include an overflow indicator when conflicts exist.

## Migration Plan
- Add the Explorer entry and basic tree UI.
- Wire file operations and refresh.
- Add VCS and per-Cell decorations.

## Open Questions
- Should we add an optional "show only modified files" mode to speed up large projects?
