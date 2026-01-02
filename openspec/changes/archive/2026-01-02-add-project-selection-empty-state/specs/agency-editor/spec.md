## ADDED Requirements
### Requirement: Project Root Selection
The editor SHALL allow users to select a project directory when none is configured.
The editor SHALL persist the selected project directory locally and restore it on launch.

#### Scenario: Launch without project
- **WHEN** the editor starts with no configured project directory
- **THEN** the Explorer view is the default
- **AND** an empty-state UI prompts the user to choose a project directory

#### Scenario: Restore last project
- **WHEN** a user selects a project directory
- **THEN** the editor stores it locally
- **AND** the next launch opens that project by default

### Requirement: Agent Cells Empty State
When no project directory is configured, the Agent Cells view SHALL show a placeholder node.
Only the default terminal SHALL be available until a project directory is selected.

#### Scenario: No project configured
- **WHEN** the user opens Agent Cells without a configured project directory
- **THEN** the placeholder node is shown
- **AND** only the default terminal action is enabled

### Requirement: Packaged UI Loads Local Renderer
Packaged builds SHALL load renderer assets from local resources without requiring a dev server.

#### Scenario: Launch packaged app
- **WHEN** a user launches the packaged app
- **THEN** the main window renders the UI without external servers
