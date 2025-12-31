## ADDED Requirements
### Requirement: Explorer Visibility Controls
The explorer SHALL provide controls to toggle hidden files, ignored files, and status-based filters.
The explorer SHALL allow filtering by Agent Cell scope when multiple Cells exist.

#### Scenario: Toggle hidden files
- **WHEN** a user disables hidden files
- **THEN** dot-prefixed entries are removed from the tree

#### Scenario: Filter by status
- **WHEN** a user enables the "modified only" filter
- **THEN** the tree shows only modified entries and their ancestors

#### Scenario: Filter by Cell
- **WHEN** a user selects a Cell filter
- **THEN** status decorations and counts are scoped to that Cell

### Requirement: Explorer Keyboard Navigation
The explorer SHALL support keyboard navigation (up/down, left/right to expand/collapse, Enter to open, F2 to rename).

#### Scenario: Expand with keyboard
- **WHEN** a folder row is focused and the user presses Right Arrow
- **THEN** the folder expands and its children become visible

### Requirement: Explorer Multi-Select Actions
The explorer SHALL support multi-select actions (delete, move, copy, reveal) with a single confirmation prompt.

#### Scenario: Delete multiple files
- **WHEN** a user selects multiple entries and chooses Delete
- **THEN** all selected entries are removed after a single confirmation

### Requirement: Explorer Virtualized Rendering
The explorer SHALL virtualize rendering of tree rows when the visible list exceeds a threshold.

#### Scenario: Large tree
- **WHEN** a directory contains thousands of entries
- **THEN** scrolling remains responsive and memory usage stays bounded

### Requirement: Explorer Auto Refresh
The explorer SHALL support file-system watch updates with debounced refresh for affected directories.
The explorer SHALL allow manual refresh to force a full reload.

#### Scenario: File changed on disk
- **WHEN** a file changes outside the editor
- **THEN** the Explorer updates the affected folder without a full reload

### Requirement: Explorer Open/Diff Indicators
The explorer SHALL indicate which files are open in the workbench and which are dirty.

#### Scenario: Open file indicator
- **WHEN** a file is open in the workbench
- **THEN** the Explorer row displays an open indicator
