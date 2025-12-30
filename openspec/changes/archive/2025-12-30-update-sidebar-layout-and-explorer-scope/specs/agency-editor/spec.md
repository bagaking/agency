## MODIFIED Requirements
### Requirement: Project Explorer Navigation
The editor SHALL provide an Explorer entry in the activity bar that shows a project file tree rooted at the active Agent Cell worktree.
If no Agent Cell is available, the Explorer SHALL fall back to the repository root.

#### Scenario: Open project explorer
- **WHEN** a user selects Explorer in the activity bar
- **THEN** the editor shows the project file tree and root metadata

#### Scenario: Switch cell scope
- **WHEN** a user selects a different Agent Cell scope in Explorer
- **THEN** the file tree updates to the new worktree root

## ADDED Requirements
### Requirement: Explorer File Preview Pane
The explorer SHALL open a file preview in the main pane when a file is selected.
Binary or oversized files MUST show a preview warning instead of raw content.

#### Scenario: Preview a text file
- **WHEN** a user selects a file in Explorer
- **THEN** the editor shows the file contents in the main pane

### Requirement: Docked Sidebar Layout
The editor SHALL render Explorer, Agent Cells, and Hierarchy inside a shared docked sidebar container.
The docked sidebar SHALL support resize and collapse actions.
The docked sidebar width and collapse state SHALL persist across restarts.

#### Scenario: Resize and persist sidebar
- **WHEN** a user resizes the sidebar and restarts the editor
- **THEN** the sidebar restores the last width and collapsed state
