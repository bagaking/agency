# Change: Update sidebar layout and Explorer scope

## Why
The current Activity Bar includes a Terminal entry that is confusing, and the main layout does not clearly separate navigation panels from content panes. Explorer also needs to be scoped per Agent Cell and show file previews in the main pane to match IDE expectations.

## What Changes
- Remove the Activity Bar Terminal entry and consolidate navigation to Explorer, Agent Cells, and Hierarchy.
- Add a docked sidebar container that supports resize, collapse, and state persistence.
- Scope Explorer to the active Agent Cell worktree with a selector and open file previews in the main pane.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: ActivityBar, AppLayout, new sidebar container, Explorer IPC/services, Explorer UI/pane, UI state persistence.
