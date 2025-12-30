## ADDED Requirements
### Requirement: Project Explorer Navigation
The editor SHALL provide an Explorer entry in the activity bar that shows a project file tree rooted at the repository root.

#### Scenario: Open project explorer
- **WHEN** a user selects Explorer in the activity bar
- **THEN** the editor shows the project file tree and root metadata

### Requirement: Explorer File Operations
The explorer SHALL support create, rename, delete, move, and copy operations for files and folders.
The explorer SHALL support multi-select, drag-and-drop reordering, and copying paths.
The explorer SHALL allow revealing the selected path in the system file manager.

#### Scenario: Rename file
- **WHEN** a user renames a file from the explorer context menu
- **THEN** the editor updates the filesystem and refreshes the tree

#### Scenario: Move file via drag
- **WHEN** a user drags a file onto another folder
- **THEN** the editor moves the file and updates the explorer view

### Requirement: Explorer Tree Loading and Refresh
The explorer SHALL lazily load directory children to keep large repositories responsive.
The explorer SHALL provide a manual refresh control for the tree.

#### Scenario: Expand large folder
- **WHEN** a user expands a large folder
- **THEN** the explorer loads children on demand and shows a loading indicator

### Requirement: VCS Status Decorations
The explorer SHALL decorate files and folders with git status (modified, added, deleted, renamed, untracked, ignored).
The explorer SHALL show per-file line change counts (added/removed) based on git diff data.
The explorer SHALL aggregate status and line counts for folders based on their descendants.

#### Scenario: Modified file decorations
- **WHEN** a file has uncommitted changes
- **THEN** the explorer shows its status and line-change counts

#### Scenario: Folder aggregation
- **WHEN** a folder contains modified files
- **THEN** the explorer aggregates and displays status/counts for the folder

### Requirement: Cell-aware Change Attribution
The explorer SHALL indicate which Agent Cells modified each file.
The explorer SHALL display per-Cell change counts for files modified in multiple Cells.

#### Scenario: File modified in multiple Cells
- **WHEN** a file is changed in two Cells
- **THEN** the explorer shows both Cell identifiers and their change counts

### Requirement: Explorer Filtering and Search
The explorer SHALL allow filtering the tree by filename and by change status.

#### Scenario: Filter by filename
- **WHEN** a user enters a filename filter
- **THEN** the explorer shows matching files and their ancestor paths
