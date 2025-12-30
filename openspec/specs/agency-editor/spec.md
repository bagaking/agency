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
The editor SHALL resolve gate definitions for the target state using Global -> Project -> Agent overrides.
The editor SHALL execute gate commands line-by-line and treat any non-zero exit status as a gate failure.
The editor SHALL seed default gates that cover spec created, checklist completed, and no unresolved merge conflicts.

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
The editor SHALL provide a dedicated navigation entry for quick action configuration within Hierarchy.

#### Scenario: Open quick actions view
- **WHEN** a user selects Actions in Hierarchy
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

### Requirement: Runtime Log Capture
The editor SHALL create a runtime log file for each app start under `logs/runtime` at the repository root.
The log filename MUST include a timestamp identifier.
The editor SHALL keep the most recent 20 runtime log runs in `logs/runtime` and move older runs to `logs/runtime/history`.
The editor SHALL chunk a runtime log file when it exceeds the size limit to ensure writes continue.

#### Scenario: Startup log created
- **WHEN** the editor starts
- **THEN** a new runtime log file is created under `logs/runtime` with a timestamp in the name

#### Scenario: Rotate old runs
- **WHEN** more than 20 runtime log runs exist
- **THEN** older runs are moved to `logs/runtime/history`

#### Scenario: Chunked log file
- **WHEN** a runtime log file exceeds the size limit
- **THEN** the editor continues logging into a new chunk file for the same run

### Requirement: Terminal Diagnostics Logging
The editor SHALL log terminal start and resize errors to the runtime log.

#### Scenario: Terminal start fails
- **WHEN** a terminal session fails to start
- **THEN** the runtime log includes the error and session context

### Requirement: Terminal Resize Guardrails
The editor SHALL guard terminal resize events to avoid invalid or overly frequent resizes.
The main process MUST clamp resize requests that fall below a minimum cols/rows threshold.
The renderer MUST ignore resize requests when the container dimensions are zero or unchanged.
The editor MUST log ignored or clamped resize events for diagnostics.

#### Scenario: Invalid resize ignored
- **WHEN** the renderer computes a resize with cols < 20 or rows < 5
- **THEN** the resize is ignored and logged

#### Scenario: Backend clamp
- **WHEN** the main process receives a resize with cols < 2 or rows < 2
- **THEN** it skips the resize and logs the clamp event

#### Scenario: Resize storm suppressed
- **WHEN** the terminal is emitting dense output
- **THEN** resize events are deferred to avoid redraw storms

### Requirement: Stable Initial Sizing
The editor SHALL re-run a terminal fit/resize after fonts load and after terminal start completes.

#### Scenario: Fonts ready resize
- **WHEN** document fonts finish loading
- **THEN** the editor triggers a terminal resize to stabilize columns and rows

#### Scenario: Post-start resize
- **WHEN** a terminal session reports ready
- **THEN** the editor forces a resize to sync the PTY size

### Requirement: Session Detach vs Terminate
The editor SHALL distinguish between detaching a session and terminating a session.
Detaching MUST close the tab while keeping the tmux session running.
Terminating MUST kill the tmux session and mark the session as closed.
The tab close (X) action MUST perform Terminate by default and a context menu MUST expose Detach.

#### Scenario: Detach keeps tmux alive
- **WHEN** a user selects Detach on an active session
- **THEN** the tab closes and the tmux session remains available for reattach

#### Scenario: Terminate kills tmux
- **WHEN** a user clicks X on a session tab
- **THEN** the tmux session is killed and the session is marked closed

### Requirement: Rename Sessions
The editor SHALL allow users to rename sessions and persist the name in the session registry.

#### Scenario: Rename session
- **WHEN** a user renames a session
- **THEN** the new name is stored in the registry and displayed in the tab

### Requirement: Terminal Zoom Controls
The editor SHALL provide zoom in/out/reset controls for terminal sessions to adjust on-screen density.
Zoom adjustments MUST trigger a terminal resize to keep the PTY in sync.

#### Scenario: Zoom in
- **WHEN** a user zooms in on a terminal session
- **THEN** the terminal font size increases and the PTY is resized

#### Scenario: Zoom out
- **WHEN** a user zooms out on a terminal session
- **THEN** the terminal font size decreases and the PTY is resized

#### Scenario: Reset zoom
- **WHEN** a user resets terminal zoom
- **THEN** the terminal returns to the default font size

### Requirement: Terminal Idle Timer
The editor SHALL display how long the terminal view has been unchanged.
The timer MUST reset whenever terminal output or user input changes the view.

#### Scenario: Idle timer increments
- **WHEN** the terminal output is idle for a period
- **THEN** the idle timer increments to reflect elapsed time

#### Scenario: Idle timer resets on activity
- **WHEN** a user types or terminal output updates
- **THEN** the idle timer resets to zero

### Requirement: Actions Configuration Scopes in Hierarchy
The editor SHALL expose Global, Project, and Agent action configuration entries in Hierarchy.
Project and Agent entries SHALL require a selected Cell.

#### Scenario: Open global actions
- **WHEN** a user selects Global Actions in Hierarchy
- **THEN** the editor shows the global actions configuration view

#### Scenario: Project actions without a Cell
- **WHEN** a user selects Project Actions without an active Cell
- **THEN** the editor disables editing and prompts the user to select a Cell

### Requirement: Hierarchy Configuration Navigation
The editor SHALL provide a Hierarchy entry in the activity bar for configuration of Actions, Gates, and Softlinks.
The Hierarchy view SHALL present navigation for Actions, Gates, and Softlinks.

#### Scenario: Open hierarchy configuration
- **WHEN** a user selects the Hierarchy item in the activity bar
- **THEN** the editor shows Actions, Gates, and Softlinks navigation entries

### Requirement: Agent Cells Explorer Shortcuts
The editor SHALL label the Explorer view as "Agent Cells" and focus it on Cell management.
The Agent Cells view SHALL provide jump links to Actions, Gates, and Softlinks configuration.

#### Scenario: Jump from Agent Cells
- **WHEN** a user selects a jump link in Agent Cells
- **THEN** the editor navigates to the corresponding Hierarchy view

### Requirement: Gate Configuration Scopes
The editor SHALL support gate definitions in Global, Project, and Agent scopes.
The editor SHALL resolve gate definitions by id using Global -> Project -> Agent overrides.
Gate definitions SHALL be grouped by lifecycle stage (draft, active, archived).
Gate definitions SHALL execute line-by-line shell commands.
Gate definitions SHALL be stored as:
- Global: the editor user data directory as `gates.yaml`
- Project: `.agency/gates.yaml` at the repository root
- Agent: `.agency/gates-<worktree-name>.yaml` in the worktree root

#### Scenario: Override gate definition
- **WHEN** a project gate shares an id with a global gate
- **THEN** the project definition is used for evaluation

### Requirement: Gate Execution Semantics
The editor SHALL execute gate command lines using `/bin/zsh -lc`.
The editor SHALL skip empty lines and lines that start with `#`.
The editor SHALL stop gate evaluation on the first non-zero exit status.
The editor SHALL run gate commands with the repository root as the working directory.
The editor SHALL provide gate context via environment variables, including `AGENCY_CELL_NAME`, `AGENCY_WORKTREE_PATH`, and `AGENCY_LIFECYCLE_TARGET`.

#### Scenario: Gate line handling
- **WHEN** a gate definition contains empty lines or comment lines
- **THEN** the editor skips them and executes only the command lines in order

### Requirement: Softlinks Configuration View
The editor SHALL provide a Softlinks configuration entry under Hierarchy for worktree link settings.

#### Scenario: Open softlinks view
- **WHEN** a user selects Softlinks in Hierarchy
- **THEN** the editor shows the worktree link configuration view

### Requirement: Project Explorer Navigation
The editor SHALL provide an Explorer entry in the activity bar that shows a project file tree rooted at the active Agent Cell worktree.
If no Agent Cell is available, the Explorer SHALL fall back to the repository root.

#### Scenario: Open project explorer
- **WHEN** a user selects Explorer in the activity bar
- **THEN** the editor shows the project file tree and root metadata

#### Scenario: Switch cell scope
- **WHEN** a user selects a different Agent Cell scope in Explorer
- **THEN** the file tree updates to the new worktree root

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

