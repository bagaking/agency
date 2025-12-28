# Change: Add worktree link management for local directories

## Why
Worktrees do not include ignored or untracked directories, which breaks CLI tools that expect local state
(for example, `.codex` per project). The editor needs a project-level way to view, link, and
auto-apply these directories across Cells.

## What Changes
- Add a project-level worktree links config (YAML) for ignored or untracked directories.
- Surface link status and one-click linking in the editor UI.
- Support automatic linking when new Cells are created.

## Impact
- Affected specs: agency-editor
- Affected code: electron services (worktree links), IPC, renderer views, cell creation flow
