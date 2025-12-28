## Context
Git worktrees only include tracked files, so local project state (like `.codex`) is missing in
new Cells. We need a project-scoped configuration for untracked directories and a UI to link
them into each worktree on demand or automatically.

## Goals / Non-Goals
- Goals:
  - Store project-level worktree link configuration in a YAML file at the repo root.
  - Provide a UI to view link status and link missing directories per Cell.
  - Support auto-linking on Cell creation when enabled.
  - Surface ignored or untracked directory candidates to help users configure links.
- Non-Goals:
  - Enforce OS-level sandboxing or permissions.
  - Support non-symlink copy/rsync workflows in v0.2.

## Decisions
- Config location: `${repoRoot}/.agency/worktree-links.yaml`.
- Config schema:
  - `version`
  - `autoLinkOnCreate` (boolean)
  - `links[]` items with `id`, `label`, `source`, `target`
  - `source` is relative to repo root unless absolute
  - `target` is relative to worktree root unless absolute
- Discovery: use `git ls-files -o --exclude-standard` plus `git ls-files -o -i --exclude-standard`
  to derive ignored + untracked directory candidates, collapsed to top-level directories that exist
  on disk.
- Status: for each link + selected Cell, compute `linked`, `missing`, `source-missing`,
  or `conflict` (target exists but is not the expected symlink).

## Risks / Trade-offs
- Symlink support is OS-dependent; macOS is primary target.
- Untracked directory discovery is best-effort and may not capture nested edge cases.

## Migration Plan
- New config file is created on first save.
- Existing behavior unchanged when no links are configured.

## Open Questions
- None for v0.2.
