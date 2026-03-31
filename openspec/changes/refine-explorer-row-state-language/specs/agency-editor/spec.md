## ADDED Requirements

### Requirement: Explorer Row State Hierarchy
Explorer rows SHALL honor a deterministic state hierarchy so visibility controls do not unexpectedly rearrange focus or selection. The hierarchy SHALL prioritize explicit user intent (keyboard focus, selection, multi-select context, drag/drop target) before visibility filters (hidden, ignored, working-set filters) and SHALL keep semantic metadata (git status, cell attribution, search hits) legible without altering higher-priority actions.
Ignored rows SHALL remain visually de-emphasized but still legible and actionable; they SHALL NOT read like deleted or broken entries.
Workbench row metadata SHALL collapse to the most important current state instead of presenting multiple equal-weight workbench-state badges that compete with the file name.

#### Scenario: Hidden/ignored filters preserve selection
- **WHEN** a user filters ignored (or hidden) entries out of the tree while a focused row is part of a multi-select context
- **THEN** the system stores the selection/focus metadata so that re-enabling `visibility.hidden` or `visibility.ignored` immediately restores the same row configuration instead of auto-selecting an adjacent entry

#### Scenario: Ignored rows honor higher-priority commands
- **WHEN** `visibility.ignored` is enabled and ignored rows become visible
- **THEN** those rows respect existing focus or selection-based commands, and reveal/open flows behave the same as tracked files even while the row continues to surface its ignored metadata

#### Scenario: Ignored rows stay legible
- **WHEN** ignored rows are visible in the Explorer tree
- **THEN** the file name remains readable enough to scan quickly
- **AND** the ignored treatment reads as de-emphasis rather than deletion

#### Scenario: Workbench activity metadata remains prioritized
- **WHEN** a row is both open in the workbench and has unsaved changes
- **THEN** the row surfaces the higher-priority unsaved state instead of rendering two competing workbench-state badges
