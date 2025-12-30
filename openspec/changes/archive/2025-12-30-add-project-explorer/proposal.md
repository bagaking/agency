# Change: Add Project Explorer with Cell-aware File Status

## Why
The editor lacks a first-class project explorer, which makes navigation and file operations harder than VSCode. Agency also needs to surface which files are modified per Cell so parallel work stays explicit and safe.

## What Changes
- Add a new Activity Bar entry named "Explorer" that shows a full project file tree.
- Provide VSCode-class file operations (create/rename/delete/move/copy, drag/drop, multi-select, reveal in Finder, copy path).
- Decorate files and folders with VCS status, line-change counts, and per-Cell modification indicators.
- Add filtering/search and quick refresh controls to keep the tree responsive on large repos.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: renderer explorer UI, filesystem indexer, git status aggregation, Cell/worktree mapping, IPC/services for file ops and git info.
