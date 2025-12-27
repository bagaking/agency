## ADDED Requirements

### Requirement: Session Registry and Recovery
The editor SHALL maintain a per-Cell session registry and restore sessions on relaunch.

#### Scenario: Restore sessions on relaunch
- **WHEN** the editor restarts
- **THEN** it restores the session list for each Cell from the registry
- **AND** it attempts to reattach to recoverable sessions

#### Scenario: Stale session detection
- **WHEN** a registered session cannot be recovered
- **THEN** the editor marks it as stale and prompts the user to start a new session

### Requirement: tmux Dependency
The editor SHALL require tmux to provide session keepalive and recovery.

#### Scenario: tmux missing
- **WHEN** tmux is not available on the host
- **THEN** the editor blocks session creation and shows an installation prompt

### Requirement: Per-Cell Multi-Session Terminals
The editor SHALL allow multiple terminal sessions per Cell.

#### Scenario: Create a new session
- **WHEN** a user creates a new session in a Cell
- **THEN** a new terminal session is added to that Cell without replacing existing sessions

#### Scenario: Switch sessions
- **WHEN** a user selects another session
- **THEN** the editor shows the selected session output and input

### Requirement: Configurable Quick Actions
The editor SHALL allow users to configure quick actions with `startCommand` and `resumeCommand`.

#### Scenario: Run a quick action
- **WHEN** a user invokes a quick action
- **THEN** the editor runs its `startCommand` in the selected session

#### Scenario: Resume a quick action
- **WHEN** a user resumes a quick action and `resumeCommand` is configured
- **THEN** the editor runs the `resumeCommand` in the selected session

### Requirement: Dedicated Quick Actions View
The editor SHALL provide a dedicated navigation entry for quick action configuration.

#### Scenario: Open quick actions view
- **WHEN** a user selects the quick actions item in the activity bar
- **THEN** the editor shows the configuration view for quick actions

### Requirement: Workflow-Ready Quick Actions
The editor SHALL keep quick action definitions forward-compatible with future workflow features.

#### Scenario: Preserve workflow metadata
- **WHEN** a quick action definition includes workflow metadata or additional fields
- **THEN** the editor preserves the data when saving and editing

### Requirement: UI State Persistence
The editor SHALL persist UI state for the last selected Cell and active session.

#### Scenario: Restore UI context
- **WHEN** the editor relaunches
- **THEN** it restores the last selected Cell and active session
