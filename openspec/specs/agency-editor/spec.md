# agency-editor Specification

## Purpose
Define the requirements for the Agency Editor desktop app that manages Cells, terminals, and lifecycle state for agentic development.
## Requirements
### Requirement: macOS-First Agency Editor
Agency SHALL provide a desktop editor application that runs on macOS in v0.2.
The architecture MUST keep a path open for future Windows/Linux support.

#### Scenario: macOS build artifacts
- **WHEN** v0.2 release artifacts are produced
- **THEN** an installer/package exists for macOS

### Requirement: Create Agent (Cell)
The editor SHALL create a new Cell by creating or reusing a git worktree and binding it 1:1 with a branch.

#### Scenario: Create new Cell
- **WHEN** a user creates a new agent with a new branch
- **THEN** a new worktree is created and bound to that branch

#### Scenario: Reuse existing worktree
- **WHEN** a user selects an existing worktree for a new agent
- **THEN** the editor reuses the worktree and keeps the branch binding intact

### Requirement: Embedded Terminal and CLI Management
The editor SHALL provide an embedded terminal and manage CLI processes (e.g., Codex) per Cell.

#### Scenario: Start CLI for a Cell
- **WHEN** a user starts a CLI task for a Cell
- **THEN** the CLI runs inside the embedded terminal and its output is visible

#### Scenario: Shell-first with quick commands
- **WHEN** a user opens a Cell terminal
- **THEN** the terminal starts in shell mode without auto-running a CLI
- **AND** the user can trigger CLI tools via quick commands (e.g., `codex`, `gemini`, `claude`)

#### Scenario: Auto-open shell on Cell selection
- **WHEN** a user switches to a different Cell
- **THEN** the editor auto-opens the shell for that Cell

#### Scenario: Auto-restore shell on relaunch
- **WHEN** the editor relaunches
- **THEN** it restores the last selected Cell and auto-opens a new shell session

### Requirement: Lifecycle State File
The editor SHALL persist Cell lifecycle state in a per-worktree file under `.agency/` whose filename includes the worktree's unique name.
The file MUST be YAML or Markdown and MUST be treated as a mergeable record.
The editor SHALL read and update this file to reflect lifecycle changes.

#### Scenario: External update
- **WHEN** the lifecycle file changes due to an external workflow
- **THEN** the editor reflects the updated lifecycle state

### Requirement: Lifecycle Gates and Confirmation
The editor SHALL require a confirmation step for lifecycle transitions.
The confirmation MUST show gate results for the target state and MUST block the transition when any required gate fails.
Required gates MUST include at least: spec created, checklist completed, and no unresolved merge conflicts.

#### Scenario: Transition allowed
- **WHEN** a user transitions a Cell to Active or Archived and all required gates pass
- **THEN** the editor allows the transition after explicit confirmation

#### Scenario: Transition blocked
- **WHEN** a user transitions a Cell to Active or Archived and any required gate fails
- **THEN** the editor blocks the transition and surfaces the failing gate(s)

### Requirement: Minimal Validation (MVP)
The editor SHALL perform minimal validation of spec/branch context and MUST label this validation as a temporary version.
Validation failures MUST surface as warnings and MUST NOT block the workflow.

#### Scenario: Spec missing
- **WHEN** a Cell is missing its spec file
- **THEN** the editor shows a warning and allows the user to proceed

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

### Requirement: tmux Status Indicator
The editor SHALL surface tmux availability in the status bar.

#### Scenario: tmux available
- **WHEN** tmux is available
- **THEN** the status bar shows the tmux version

#### Scenario: tmux missing
- **WHEN** tmux is missing
- **THEN** the status bar shows a missing indicator

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
Quick actions SHALL support a global scope and a project scope, where project definitions override global ones when identifiers match.
Quick action commands SHALL accept multi-line scripts.

#### Scenario: Run a quick action
- **WHEN** a user invokes a quick action
- **THEN** the editor runs its `startCommand` in the selected session

#### Scenario: Resume a quick action
- **WHEN** a user resumes a quick action and `resumeCommand` is configured
- **THEN** the editor runs the `resumeCommand` in the selected session

#### Scenario: Override quick actions per project
- **WHEN** a project scope action shares the same identifier as a global action
- **THEN** the project definition is used for execution

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

### Requirement: Actions Configuration Scopes in Explorer
The editor SHALL expose Global, Project, and Agent action configuration entries in the Explorer.
Project and Agent entries SHALL require a selected Cell.

#### Scenario: Open global actions
- **WHEN** a user selects Global Actions in the Explorer
- **THEN** the editor shows the global actions configuration view

#### Scenario: Project actions without a Cell
- **WHEN** a user selects Project Actions without an active Cell
- **THEN** the editor disables editing and prompts the user to select a Cell

### Requirement: Action Scope Resolution
The editor SHALL resolve actions by applying Global, then Project, then Agent overrides by matching action ids.

#### Scenario: Project overrides global
- **WHEN** a project action shares the same action id as a global action
- **THEN** the project definition is used for execution

#### Scenario: Agent overrides project
- **WHEN** an agent action shares the same action id as a project action
- **THEN** the agent definition is used for execution

### Requirement: Action Inheritance Visibility
The editor SHALL visually distinguish inherited actions from scope-local actions and indicate when overrides exist downstream.

#### Scenario: Inherited action visible
- **WHEN** a project action is not defined locally
- **THEN** the editor marks it as inherited from Global and keeps it read-only until overridden

#### Scenario: Downstream override indicator
- **WHEN** a global action is overridden in project or agent scope
- **THEN** the global view marks it as overridden

### Requirement: Start Actions Spawn Sessions
The editor SHALL create a new terminal session when a start action is executed.

#### Scenario: Start action creates session
- **WHEN** a user runs a start action
- **THEN** the editor creates a new session, selects it, and executes the start command in that session

### Requirement: Session Tabs
The editor SHALL render sessions as horizontal tabs and highlight the active session.

#### Scenario: Switch session via tab
- **WHEN** a user clicks a session tab
- **THEN** the editor activates that session

### Requirement: Closed Sessions Overflow
The editor SHALL display closed sessions in an overflow menu rather than the main tab row.

#### Scenario: View closed sessions
- **WHEN** a user opens the sessions overflow menu
- **THEN** the editor lists closed sessions and allows selecting them

### Requirement: Worktree Link Configuration
The editor SHALL store a project-level worktree link configuration for ignored or untracked directories.

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

