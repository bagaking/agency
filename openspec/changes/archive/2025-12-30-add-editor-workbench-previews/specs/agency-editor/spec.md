## MODIFIED Requirements
### Requirement: Explorer File Preview Pane
The explorer SHALL open selected files inside a workbench tab area instead of a single static preview.
Binary or oversized files MUST show a preview warning and offer a reveal/open action.

#### Scenario: Open file in workbench
- **WHEN** a user selects a file in Explorer
- **THEN** the file opens in a workbench tab with an editor or media preview

## ADDED Requirements
### Requirement: Workbench Tabs
The editor SHALL provide a workbench with multiple tabs, supporting preview vs pinned tabs, reordering, and closing.
Workbench tabs SHALL persist per Cell and restore on relaunch.

#### Scenario: Preview vs pinned tabs
- **WHEN** a user single-clicks a file and then double-clicks another file
- **THEN** the first opens as a preview tab and the second opens as a pinned tab

### Requirement: Code Editor View
The workbench SHALL render text files with line numbers, syntax highlighting, and in-file search.
The editor SHALL show line/column status and indicate dirty files that have unsaved changes.
The editor SHALL prompt to reload when a file changes on disk while open.

#### Scenario: Edit and save a file
- **WHEN** a user edits a file and saves it
- **THEN** the dirty indicator clears and the file contents are written to disk

### Requirement: Diff Decorations
The workbench SHALL display git diff decorations for added, modified, and deleted lines in the active file.
The editor SHALL allow toggling diff decorations per tab.

#### Scenario: View diff decorations
- **WHEN** a file has uncommitted changes and is opened
- **THEN** the editor shows line-level diff indicators in the gutter

### Requirement: Blame Insights
The workbench SHALL surface git blame metadata for the current line via hover or inline badge.
The editor SHALL allow toggling blame visibility per tab.

#### Scenario: Show blame metadata
- **WHEN** a user hovers a line with blame enabled
- **THEN** the editor shows author, commit id, and commit time

### Requirement: Media Preview
The workbench SHALL preview common media files (images, video, audio, PDF) with zoom/fit controls.

#### Scenario: Preview an image
- **WHEN** a user opens a PNG file
- **THEN** the editor shows the image with zoom and fit controls

### Requirement: Workbench Navigation Aids
The workbench SHALL display breadcrumbs for the active file and provide a quick-open affordance.

#### Scenario: Quick-open a file
- **WHEN** a user invokes quick-open and selects a file
- **THEN** the editor opens the file in a new workbench tab
