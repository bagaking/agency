## MODIFIED Requirements

### Requirement: Docked Sidebar Layout
The editor SHALL render Explorer, Agent Cells, and Hierarchy inside a shared docked sidebar container.
The docked sidebar SHALL support resize and collapse actions.
The docked sidebar width and collapse state SHALL persist across restarts.
The shell SHALL own docked-sidebar collapse and expand through one shared activity-bar-adjacent control rather than per-surface edge or corner affordances.

#### Scenario: Resize and persist sidebar
- **WHEN** a user resizes the sidebar and restarts the editor
- **THEN** the sidebar restores the last width and collapsed state

#### Scenario: Toggle the docked sidebar from the shell
- **WHEN** a docked sidebar surface such as Explorer or Memo is active
- **THEN** the user can collapse or expand the left sidebar from one shared shell-level control
- **AND** the dock container does not expose a second competing collapse affordance

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active cell and allow filtering by kind and status.
Memo file references SHALL provide unified `open` and `reveal` entry points.
Memo SHALL support lightweight drag routing into Explorer import flows in phase 1.
The Memo surface SHALL present artifact navigation, capture shortcuts, and draft review as one coherent workspace.
Explorer and Memo side-surface headers SHALL keep current context and state legible without redundant explanatory subtitle copy.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor opens the Memo workspace for the active cell
- **AND** the navigation, capture, and draft affordances read as one Memo workspace instead of disconnected sub-tools

#### Scenario: Side-surface headers stay concise
- **WHEN** a user opens Explorer or Memo
- **THEN** the header foregrounds the active root or record summary
- **AND** avoids redundant instructional subtitle text when current context and state can already be read directly from the controls and summary chips
