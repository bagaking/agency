## ADDED Requirements
### Requirement: Worktree Link Configuration
The editor SHALL store a project-level worktree link configuration for untracked directories.

#### Scenario: Save link configuration
- **WHEN** a user saves worktree link settings
- **THEN** the editor writes a YAML config file at the project root

### Requirement: Worktree Link Status and Actions
The editor SHALL surface worktree link status per selected Cell and allow one-click linking.

#### Scenario: Link missing directory
- **WHEN** a configured link is missing in the selected Cell
- **THEN** the editor allows linking it into the worktree with a single action

### Requirement: Local Directory Discovery
The editor SHALL list ignored or untracked directory candidates to assist configuration.

#### Scenario: Show local candidates
- **WHEN** a user opens the worktree links view
- **THEN** the editor lists ignored or untracked directories detected in the project

### Requirement: Auto-Link on Cell Creation
The editor SHALL auto-link configured directories when new Cells are created if enabled.

#### Scenario: Auto-link enabled
- **WHEN** a user creates a new Cell and auto-link is enabled
- **THEN** the editor links configured directories into the new worktree
