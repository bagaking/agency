## ADDED Requirements

### Requirement: No-Project Window Uses Window-Owned Home State
When a window has no selected project, the editor SHALL treat the visible state as a window-owned home state rather than projecting synthetic Project, Cell, or Session objects.

#### Scenario: Empty window does not invent a Cell
- **WHEN** a user opens a new Agency window with no project root selected
- **THEN** the renderer does not route that window through a synthetic Cell/session identity
- **AND** host session services are not asked to resolve project-backed session state for that window

### Requirement: Window-Owned Home Shell
The editor SHALL provide an optional home shell for no-project windows as a window-owned capability.
The home shell SHALL be scoped to the current window and SHALL use the user's home directory as its default working directory.
The home shell SHALL NOT create or mutate repo-owned Cell/session storage.

#### Scenario: Start a home shell before selecting a project
- **WHEN** a user chooses `Start Home Shell` in a no-project window
- **THEN** the editor opens a shell rooted at the user home directory
- **AND** the shell is owned by that window rather than by a Project, Cell, or Session

#### Scenario: Home shell stays out of Cell storage
- **WHEN** a user uses the home shell in a no-project window
- **THEN** the editor does not create `.agency/cells/**` session registry entries or Cell-owned runtime records for that shell

### Requirement: Project Home Surface
When no project is open, the editor SHALL present one coherent Project Home experience.
The Project Home surface SHALL foreground:
- the primary project-selection action;
- recent projects as the main recovery/navigation content;
- the optional home-shell entry as a secondary window-owned action.

#### Scenario: Recent projects are the main no-project content
- **WHEN** a user opens a no-project window
- **THEN** recent projects are presented as the primary central content rather than buried behind placeholder chrome
- **AND** selecting one opens that project in the current window

## MODIFIED Requirements

### Requirement: Agent Cells Empty State
When no project directory is configured, the Agent Cells surface SHALL show a window-owned home/placeholder state instead of a synthetic Cell row with Cell/session-owned affordances.
Only window-owned actions that do not require a project-backed Cell SHALL be enabled until a project directory is selected.

#### Scenario: No project configured
- **WHEN** the user opens Agent Cells without a configured project directory
- **THEN** the surface shows the shared no-project home grammar
- **AND** Cell/session creation affordances stay disabled until a project is selected

### Requirement: Recent Projects Sidebar
When no project is open, the left sidebar SHALL display recent projects together with explicit no-project recovery actions for the current window.
Selecting a recent project SHALL open it and set the active project root.

#### Scenario: Open recent project from no-project sidebar
- **WHEN** a user selects a recent project from the no-project sidebar
- **THEN** the editor switches to that project and loads its Cells
- **AND** the current window leaves the no-project home state
