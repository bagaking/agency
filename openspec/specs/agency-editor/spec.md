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
Discovery MUST use git metadata and include nested ignored/untracked directories when detected.

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

#### Scenario: Drop into same folder
- **WHEN** a user drags an item onto its current parent folder
- **THEN** the editor performs no move and does not raise an error

#### Scenario: Prevent self-nesting moves
- **WHEN** a user moves or pastes a folder into its own descendant
- **THEN** the editor blocks the action and surfaces a clear error

### Requirement: Explorer Tree Loading and Refresh
The explorer SHALL lazily load directory children to keep large repositories responsive.
The explorer SHALL provide a manual refresh control for the tree.

#### Scenario: Expand large folder
- **WHEN** a user expands a large folder
- **THEN** the explorer loads children on demand and shows a loading indicator

### Requirement: VCS Status Decorations
The explorer SHALL decorate files and folders with git status (modified, added, deleted, renamed, untracked, ignored).
The explorer SHOULD visually distinguish ignored, untracked, and added entries.
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
The explorer SHALL open selected files inside a workbench tab area instead of a single static preview.
Binary or oversized files MUST show a preview warning and offer a reveal/open action.

#### Scenario: Open file in workbench
- **WHEN** a user selects a file in Explorer
- **THEN** the file opens in a workbench tab with an editor or media preview

### Requirement: Docked Sidebar Layout
The editor SHALL render Explorer, Agent Cells, and Hierarchy inside a shared docked sidebar container.
The docked sidebar SHALL support resize and collapse actions.
The docked sidebar width and collapse state SHALL persist across restarts.

#### Scenario: Resize and persist sidebar
- **WHEN** a user resizes the sidebar and restarts the editor
- **THEN** the sidebar restores the last width and collapsed state

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

### Requirement: Editor Packaging Workflow
The repository SHALL provide a packaging workflow for the Agency Editor that produces macOS installable artifacts.
Packaging MUST be runnable from both the repository root and the `apps/editor` directory.
Packaging artifacts MUST be written under `apps/editor/dist/release`.
The packaging workflow MUST be documented with installation steps.

#### Scenario: Generate macOS artifacts
- **WHEN** a user runs the packaging command
- **THEN** DMG and ZIP artifacts are created under `apps/editor/dist/release`

#### Scenario: Document installation
- **WHEN** a contributor follows the documentation
- **THEN** they can build and install the app locally on macOS

### Requirement: Explorer Visibility Controls
The explorer SHALL provide controls to toggle hidden files, ignored files, and status-based filters.
The explorer SHALL allow filtering by Agent Cell scope when multiple Cells exist.

#### Scenario: Toggle hidden files
- **WHEN** a user disables hidden files
- **THEN** dot-prefixed entries are removed from the tree

#### Scenario: Filter by status
- **WHEN** a user enables the "modified only" filter
- **THEN** the tree shows only modified entries and their ancestors

#### Scenario: Filter by Cell
- **WHEN** a user selects a Cell filter
- **THEN** status decorations and counts are scoped to that Cell

### Requirement: Explorer Keyboard Navigation
The explorer SHALL support keyboard navigation (up/down, left/right to expand/collapse, Enter to open, F2 to rename).

#### Scenario: Expand with keyboard
- **WHEN** a folder row is focused and the user presses Right Arrow
- **THEN** the folder expands and its children become visible

### Requirement: Explorer Multi-Select Actions
The explorer SHALL support multi-select actions (delete, move, copy, reveal) with a single confirmation prompt.

#### Scenario: Delete multiple files
- **WHEN** a user selects multiple entries and chooses Delete
- **THEN** all selected entries are removed after a single confirmation

### Requirement: Explorer Virtualized Rendering
The explorer SHALL virtualize rendering of tree rows when the visible list exceeds a threshold.

#### Scenario: Large tree
- **WHEN** a directory contains thousands of entries
- **THEN** scrolling remains responsive and memory usage stays bounded

### Requirement: Explorer Auto Refresh
The explorer SHALL support file-system watch updates with debounced refresh for affected directories.
The explorer SHALL allow manual refresh to force a full reload.

#### Scenario: File changed on disk
- **WHEN** a file changes outside the editor
- **THEN** the Explorer updates the affected folder without a full reload

### Requirement: Explorer Open/Diff Indicators
The explorer SHALL indicate which files are open in the workbench and which are dirty.

#### Scenario: Open file indicator
- **WHEN** a file is open in the workbench
- **THEN** the Explorer row displays an open indicator

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

### Requirement: Project Settings View
The editor SHALL provide a Project settings view that includes an Open Project action to choose a repository directory.
The Open Project action SHALL update the active project root and refresh Cells/Explorer scopes.

#### Scenario: Open project from settings
- **WHEN** a user opens the Project settings view and clicks Open Project
- **THEN** the system prompts for a directory and sets it as the active project root

### Requirement: Recent Projects
The editor SHALL persist a recent projects list in local UI state.
Each recent project entry SHALL include repository name, absolute path, and last-opened timestamp.
The recent list SHALL update whenever a project is selected successfully.

#### Scenario: Recent project persists after relaunch
- **WHEN** a user opens a project and relaunches the editor
- **THEN** the recent projects list includes the last-opened project

### Requirement: Recent Projects Sidebar
When no project is open, the left sidebar SHALL display a Recent Projects section.
Selecting a recent project SHALL open it and set the active project root.

#### Scenario: Open recent project from sidebar
- **WHEN** a user selects a recent project from the sidebar list
- **THEN** the editor switches to that project and loads its Cells

### Requirement: Project Menu Actions
The editor SHALL expose menu actions for Open Project, Switch Project, and New Window.
Open/Switch Project SHALL prompt for a repository directory and update the active project root.
New Window SHALL open a new editor window.

#### Scenario: Switch project from menu
- **WHEN** a user selects Switch Project from the application menu
- **THEN** the editor prompts for a new repository and updates the active project context

### Requirement: Worktree-Scoped HIL Index
The editor SHALL store human-in-loop artifacts in a worktree-scoped HIL index under `.agency/hil/index-<worktree>.yaml`.
The HIL index SHALL be YAML and mergeable, and SHALL contain items of kind `comment`, `memo`, or `draft`.
Each HIL item SHALL include `meta.processed`, defaulting to `false` unless explicitly set.

#### Scenario: Store a comment in HIL index
- **WHEN** a user submits a line comment
- **THEN** the editor appends a `comment` item to the HIL index for the active worktree
- **AND** the new item has `meta.processed: false`

### Requirement: HIL Comment Context Snapshot
HIL comment items SHALL store a lightweight context snapshot containing `line_text`, `before_ctx`, and `after_ctx`.

#### Scenario: Capture minimal comment context
- **WHEN** a user submits a line comment
- **THEN** the editor stores the target line text and surrounding context arrays

### Requirement: HIL Author Resolution
When available, the editor SHALL resolve comment author identity from git config (`user.name`/`user.email`) before falling back to the local username.

#### Scenario: Prefer git author identity
- **WHEN** git user.name or user.email is configured
- **THEN** new HIL comment items record the git identity as author

### Requirement: Global HIL Drawer
The editor SHALL provide a global right-side drawer for HIL panels.
The drawer SHALL be collapsible and default to collapsed.
The drawer SHALL auto-open when a HIL action is invoked (e.g., submitting a comment).

#### Scenario: Auto-open drawer after comment
- **WHEN** a user submits a line comment
- **THEN** the right-side drawer opens to show the Comments panel

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active worktree and allow filtering by kind and status.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor shows the HIL list for the current worktree

### Requirement: HIL Inbox Type Sections
The Memo Inbox SHALL present sections for Comments, Flash, Excerpt, and Screenshot.
Each section SHALL list items for that type.
Sections that accept user input SHALL provide inline input controls at the top of the section.

#### Scenario: Open Inbox sections
- **WHEN** a user opens the Memo view Inbox
- **THEN** the editor shows separate sections for Comments, Flash, Excerpt, and Screenshot
- **AND** each section lists its items

### Requirement: Memo Capture Modes
The Memo view SHALL provide capture actions for Flash note, Excerpt, and Screenshot.
Captured items SHALL be stored as HIL `memo` entries with `meta.noteType` set to the capture type.
Excerpt capture SHALL accept URL input and fetch remote content for extraction.
Excerpt capture SHALL enforce size/time limits and surface failures without creating a memo item.
Screenshot capture SHALL open an in-app capture UI for region selection and annotation, followed by a routing panel.

#### Scenario: Capture a flash note
- **WHEN** a user selects Flash and submits text
- **THEN** the editor creates a `memo` item with `meta.noteType: flash`

#### Scenario: Capture an excerpt from URL
- **WHEN** a user enters a valid URL and starts Excerpt capture
- **THEN** the editor fetches and extracts readable content
- **AND** the editor creates a `memo` item with `meta.noteType: excerpt`
- **AND** the memo metadata includes source URL, title, extracted excerpt summary, word/char counts, and fetch timestamp

#### Scenario: Excerpt fetch fails
- **WHEN** the URL is invalid or fetch/parse fails
- **THEN** the editor reports the error
- **AND** no Excerpt memo is created

#### Scenario: Capture a screenshot via UI
- **WHEN** a user clicks Capture in the Screenshot section
- **THEN** the editor opens a capture overlay for region selection and annotation
- **AND** the editor shows a routing panel to save to HIL, clipboard, or both

### Requirement: Memo Assets Storage
Screenshot memo assets SHALL be stored as PNG under `.agency/hil/assets/<worktree>/` with a stable path recorded in the memo metadata.

#### Scenario: Persist screenshot asset
- **WHEN** a screenshot memo is created
- **THEN** the image asset is saved under the worktree assets directory as a PNG

### Requirement: Promote Memo Items into Drafts
Memo items SHALL be eligible for selection in the Promote flow and referenced by drafts.

#### Scenario: Promote memo item
- **WHEN** a user selects memo items during Promote
- **THEN** the draft references those memo item ids

### Requirement: Promote Comment to Draft
The editor SHALL allow users to promote a comment into a `draft` HIL item.
Promotion SHALL NOT directly edit spec files or external spec systems.

#### Scenario: Promote comment
- **WHEN** a user promotes a comment to a draft
- **THEN** a new `draft` item is created in the HIL index
- **AND** repeating the promote action returns the existing draft instead of creating a duplicate
- **AND** the source comment is marked `meta.processed: true`

### Requirement: Bulk Promote Pending Items
The Promote flow SHALL dispatch a structured prompt to the selected Agent session when started.
The editor SHALL focus the selected session and open the terminal/workbench so progress is visible.
The Promote modal SHALL surface execution status for the running promote workflow.
The Promote flow SHALL synchronize Action Sheet execution state with the promote gate.

#### Scenario: Start promote dispatch
- **WHEN** a user starts Promote with selected items and a target session
- **THEN** a structured prompt is sent to that session
- **AND** the UI focuses the session terminal
- **AND** the Promote modal shows the execution status
- **AND** the linked Action Sheet state updates with the promote gate

### Requirement: Promote Tree Organization
The Promote modal SHALL group selectable items in a tree by Type and Source.
The tree SHALL support selecting a whole node or individual items.

#### Scenario: Select items by group
- **WHEN** a user expands a type/source node
- **THEN** the items under that node are listed
- **AND** selecting the node selects all items within it

### Requirement: HIL Storage Tree Layout
The editor SHALL store HIL items under a tree-aligned directory layout while keeping the index as the source of truth.

#### Scenario: Write HIL item files
- **WHEN** a HIL item is created
- **THEN** the editor writes comments and memos under `.agency/hil/<worktree>/items/<kind>/`
- **AND** writes drafts under `.agency/hil/<worktree>/drafts/`
- **AND** updates `.agency/hil/index-<worktree>.yaml`

### Requirement: Legacy Comment Migration
If legacy comment storage exists, the editor SHALL import those comments into the HIL index non-destructively.

#### Scenario: Migrate legacy comments
- **WHEN** a worktree contains `.agency/comments-<worktree>.yaml`
- **THEN** the editor imports comments into the HIL index and leaves the legacy file intact

### Requirement: Memo Dock Navigation
The editor SHALL render the Memo (HIL) view as a split layout with a left dock.
The dock SHALL list a Comment Inbox (Input Box) entry and Draft entries for all HIL drafts.

#### Scenario: View Memo dock
- **WHEN** a user opens the Memo view
- **THEN** the left dock shows Comment Inbox and Drafts
- **AND** the main pane displays the selected dock content

#### Scenario: Switch dock entries
- **WHEN** a user selects a Draft entry from the dock
- **THEN** the main pane shows that Draft's details

#### Scenario: Comment Inbox entry
- **WHEN** a user selects Comment Inbox
- **THEN** the main pane shows pending comment items

### Requirement: Draft Lifecycle Actions
The Memo draft detail view SHALL allow archiving and deleting drafts.
Destructive actions SHALL require confirmation via the modal system.

#### Scenario: Confirm Draft archive
- **WHEN** a user archives a Draft
- **THEN** the modal system asks for confirmation
- **AND** the Draft status updates only after confirmation

#### Scenario: Confirm Draft delete
- **WHEN** a user deletes a Draft
- **THEN** the modal system asks for confirmation
- **AND** the Draft is removed only after confirmation

### Requirement: Activity Bar Home Shortcut
The editor SHALL treat the activity bar logo as a home shortcut that opens the Agent Cells view.

#### Scenario: Click home icon
- **WHEN** a user clicks the activity bar logo
- **THEN** the editor switches to the Agent Cells view

### Requirement: Settings Dashboard Overview
The editor SHALL provide a Settings dashboard that summarizes the current project context and offers navigation entry cards to Actions, Gates, and Softlinks.
The dashboard SHALL include the current project summary and the recent projects list.

#### Scenario: View settings dashboard
- **WHEN** a user opens the Settings view
- **THEN** the editor shows project summary, recent projects, and configuration entry cards

### Requirement: Explorer Clipboard Operations
The Explorer SHALL support copy, cut, and paste operations for files and folders.
The editor SHALL expose these operations via context menu and keyboard shortcuts.
If a target name conflicts during copy, cut, or duplicate, the editor SHALL append a numeric `-1` suffix until a free name is found.

#### Scenario: Copy and paste a file
- **WHEN** a user copies a file and pastes into another folder
- **THEN** the editor creates a duplicate at the target location

#### Scenario: Cut and paste a folder
- **WHEN** a user cuts a folder and pastes into another folder
- **THEN** the editor moves the folder to the new location

#### Scenario: Duplicate with conflict
- **WHEN** a user duplicates a file and the target name already exists
- **THEN** the editor creates a copy with a `-1` style suffix

### Requirement: Window-Local Project Context
The editor SHALL treat the active project root as a window-local state.
Opening a new window SHALL start with no active project, while recent projects remain available.
Switching projects in one window SHALL NOT change the project context of other windows.

#### Scenario: Open new window
- **WHEN** a user opens a new window
- **THEN** the new window shows the project empty state and recent projects list

#### Scenario: Switch project in one window
- **WHEN** a user switches the project in one window
- **THEN** only that window refreshes its Agent Cells and Explorer scopes

### Requirement: Explorer System Clipboard Import
The Explorer SHALL allow pasting files or screenshots from the system clipboard into the selected folder.
If a target name conflicts, the editor SHALL append a numeric `-1` suffix until a free name is found.

#### Scenario: Paste a file from system clipboard
- **WHEN** a user copies a file in another app and pastes in Explorer
- **THEN** the file is copied into the target folder with conflict-safe naming

#### Scenario: Paste a screenshot from system clipboard
- **WHEN** a user pastes an image from the system clipboard in Explorer
- **THEN** the editor creates a `Screenshot-YYYYMMDD-HHMMSS.png` file in the target folder

### Requirement: Terminal Clipboard Materialization
When pasting into the terminal, the editor SHALL materialize clipboard files or images into the active cell's `.agency/tmp` directory and paste the relative path.

#### Scenario: Paste file into terminal
- **WHEN** a user pastes a file into the terminal
- **THEN** the editor saves it under `.agency/tmp` and inserts the relative path into the terminal input

#### Scenario: Paste image into terminal
- **WHEN** a user pastes an image into the terminal
- **THEN** the editor saves it under `.agency/tmp` and inserts the relative path into the terminal input

### Requirement: Clipboard Markdown Capture
The editor SHALL allow capturing clipboard content into a temporary Markdown file stored under `.agency/tmp/clipboard`.
Captured Markdown files MUST use the `Clipboard-YYYYMMDD-HHMMSS.md` naming format and resolve conflicts with `-1` suffixes.

#### Scenario: Capture clipboard as Markdown
- **WHEN** a user invokes Paste as Markdown
- **THEN** the editor creates a Markdown file summarizing clipboard content under `.agency/tmp/clipboard`

### Requirement: Line Comment Submission
The editor SHALL allow submitting a comment against the current file and line with an optional TODO flag.
Comments MUST be stored in a worktree-scoped YAML file under `.agency/comments-<worktree>.yaml`.
The comment payload SHOULD capture structured metadata for future threading and status updates.

#### Scenario: Comment schema metadata
- **WHEN** a comment is stored
- **THEN** the comment includes a stable id, thread id, status, and creation metadata

#### Scenario: Submit a line comment
- **WHEN** a user submits a comment on a specific line
- **THEN** the editor appends the comment to the worktree comment file

#### Scenario: Multiple comments per line
- **WHEN** a user submits more than one comment on the same line
- **THEN** each comment is appended as a separate entry

### Requirement: Line Comment Entry Actions
The editor SHALL expose a direct action to add a comment at the current cursor line.
The action SHALL be available from the editor context menu and the comment preview panel.

#### Scenario: Add comment from context menu
- **WHEN** a user opens the editor context menu on a code file
- **THEN** they can select an action to add a comment on the current line

#### Scenario: Add comment from preview panel
- **WHEN** a user clicks Add in the comment preview panel
- **THEN** the editor opens the comment entry modal for the current cursor line

### Requirement: Comment Preview List
The editor SHALL show a preview list of line comments in the workbench header area.
The preview list SHALL summarize comments for the active file.

#### Scenario: View comment preview list
- **WHEN** a file has submitted line comments
- **THEN** the preview list shows each comment with its line number and TODO indicator

### Requirement: Explorer Editing Shortcuts
The editor SHALL support common file editing shortcuts for workbench tabs, including save, save-as, close tab, and find/replace.
Shortcuts SHALL respect platform conventions (Cmd on macOS, Ctrl on Windows/Linux).

#### Scenario: Save via keyboard
- **WHEN** a user presses Cmd/Ctrl+S in an open file
- **THEN** the editor saves the file without requiring a UI button click

#### Scenario: Close tab via keyboard
- **WHEN** a user presses Cmd/Ctrl+W in an open file
- **THEN** the editor closes the active tab

#### Scenario: Find via keyboard
- **WHEN** a user presses Cmd/Ctrl+F in an open file
- **THEN** the editor opens the find UI for that file

### Requirement: Explorer Action Tooltips
Icon-only Explorer controls SHALL display a tooltip with an action description on hover.
Tooltip styling SHALL match the app’s muted/foreground palette.

#### Scenario: Hover tooltip
- **WHEN** a user hovers an icon-only Explorer control
- **THEN** a tooltip appears with the control’s purpose

### Requirement: Explorer Palette Consistency
Explorer header and footer sections SHALL use the same muted/foreground palette as other primary panels.

#### Scenario: Explorer palette aligned
- **WHEN** the Explorer view is visible
- **THEN** its header/footer colors match the app’s standard panel palette

### Requirement: Comment Indicator Navigation
Files with HIL comments SHALL show a comment icon in the Explorer row.
Clicking the icon SHALL open the HIL drawer focused on comments for that file.

#### Scenario: Jump to comments from Explorer
- **WHEN** a file row shows a comment icon and the user clicks it
- **THEN** the HIL drawer opens and filters to comments for that file

### Requirement: Promote Execution Status Tracking
The editor SHALL record promote execution status on the draft metadata.
Completion gating SHALL require `meta.promoted: true` AND `meta.executionStatus: complete` before enabling confirmation.

#### Scenario: Gate waits for execution completion
- **WHEN** the promote workflow is running
- **THEN** the confirm action remains disabled until execution status is complete

### Requirement: Promote Prompt Bundle
The editor SHALL generate a prompt bundle that includes the draft description, selected item references, and file anchors.
The prompt bundle SHALL be stored alongside the draft metadata for auditability.

#### Scenario: Prompt bundle stored
- **WHEN** Promote starts
- **THEN** the draft metadata stores the prompt bundle that was dispatched

### Requirement: Screenshot Routing After Capture
After capture, the editor SHALL present a routing panel that lets the user choose:
- Target project/worktree + Agent Cell (save to HIL)
- Clipboard-only
- Save to HIL and clipboard

#### Scenario: Route capture to HIL
- **WHEN** a user completes a capture and selects a target Agent Cell
- **THEN** the editor saves the screenshot to the selected worktree and creates a memo

#### Scenario: Route capture to clipboard only
- **WHEN** a user completes a capture and chooses clipboard-only
- **THEN** the editor copies the image to clipboard without creating a memo

### Requirement: Capture Window Visibility
The capture flow SHALL allow the user to choose whether Agency windows are visible in the screenshot.

#### Scenario: Hide Agency windows during capture
- **WHEN** a user starts a capture with Agency windows hidden
- **THEN** the overlay hides or minimizes Agency windows before capture

#### Scenario: Include Agency windows during capture
- **WHEN** a user starts a capture with Agency windows visible
- **THEN** the overlay keeps Agency windows visible in the screenshot

### Requirement: Screenshot Capture Session Management
The editor SHALL allow only one active capture session at a time.
The capture session SHALL be bound to the originating window and return the result to that window.

#### Scenario: Single active capture session
- **WHEN** a user starts a capture while another capture is active
- **THEN** the editor rejects or queues the new capture request

#### Scenario: Return capture to originating window
- **WHEN** a capture completes
- **THEN** the result is delivered to the window that initiated the capture

### Requirement: Action Sheet Storage
The editor SHALL persist Action Sheets under `.agency/action-sheets/<id>/`.
Each Action Sheet SHALL include a plan, prompt bundle, gate/check status, and execution status.

#### Scenario: Create an Action Sheet
- **WHEN** a user starts a new Action Sheet
- **THEN** the editor creates `.agency/action-sheets/<id>/plan.md`
- **AND** writes `prompt.json`, `checks.json`, and `status.json` for the Action Sheet

### Requirement: Action Sheet Prompt Format
The Action Sheet prompt SHALL be assembled with tagged sections for `requirements`, `context`, `checks`, and `done`.
The `done` section SHALL name the file and checklist marker that must be updated to mark work complete and drive Memo draft status.

#### Scenario: Assemble Action Sheet prompt
- **WHEN** an Action Sheet is dispatched
- **THEN** the prompt contains `<requirements>`, `<context>`, `<checks>`, and `<done>` sections

#### Scenario: Done instructions are explicit
- **WHEN** an Action Sheet is created for execution
- **THEN** the `done` section includes the file path and checklist marker used to record completion

### Requirement: Action Sheet Execution and Session Binding
The editor SHALL dispatch Action Sheet prompts to a selected session and record the session binding.
The UI SHALL surface the Action Sheet execution state and allow jumping to the linked session terminal.

#### Scenario: Run an Action Sheet
- **WHEN** a user starts an Action Sheet and selects a session
- **THEN** the editor sends the prompt to that session
- **AND** records the session binding in Action Sheet status
- **AND** the UI shows execution state with a jump-to-terminal control

### Requirement: Action Sheet Conditional Plugin
The Action Sheet runner SHALL support conditional rules to run follow-up actions or repeat until checks pass.
Loops SHALL be bounded by a retry limit and optional cooldown.

#### Scenario: Repeat until checks pass
- **WHEN** a conditional rule evaluates to retry and checks are not passing
- **THEN** the runner waits for the cooldown and re-runs the Action Sheet
- **AND** stops retrying after the configured maximum attempts

### Requirement: Action Sheet Gate Tracking
The editor SHALL update Action Sheet status when checks change and reflect gate results in the UI.

#### Scenario: Gate status updates
- **WHEN** an Action Sheet check transitions to passed or failed
- **THEN** the UI updates the Action Sheet status to reflect the gate results

### Requirement: Promote Draft Execution Visibility
The Memo draft detail view SHALL surface execution status for promoted drafts, including session binding.

#### Scenario: View promote execution status in draft detail
- **WHEN** a user opens a draft created by Promote
- **THEN** the draft detail view shows execution status and the linked session id

### Requirement: Explorer Feed Action Sheet
The Explorer feed SHALL allow users to create an Action Sheet from selected files and a description.
The Action Sheet prompt SHALL include the selection tree as context.

#### Scenario: Create Action Sheet from Explorer selection
- **WHEN** a user selects multiple files and submits a feed description
- **THEN** the editor creates an Action Sheet with the selection tree in the prompt context
- **AND** dispatches the Action Sheet to the selected session

### Requirement: Promote Action Sheet Linkage
The Promote flow SHALL create or bind an Action Sheet and store its id on the promote draft metadata.
The Promote UI SHALL surface the linked Action Sheet state and provide a navigation entry to view it.

#### Scenario: Promote binds Action Sheet
- **WHEN** a user starts Promote with selected items
- **THEN** the editor creates an Action Sheet and stores its id on the draft metadata
- **AND** the Promote modal shows the Action Sheet state

### Requirement: Action Sheet Activity Bar Entry
The editor SHALL provide an Action Sheets entry in the activity bar directly below Agent Cells.

#### Scenario: Open Action Sheets from activity bar
- **WHEN** a user selects Action Sheets in the activity bar
- **THEN** the editor shows the Action Sheets panel

### Requirement: Action Sheet Panel Layout
The Action Sheets view SHALL use the standard left/right layout with a list panel and detail panel.

#### Scenario: View Action Sheet list and details
- **WHEN** the Action Sheets view is active
- **THEN** the left panel lists Action Sheets
- **AND** the right panel shows details for the selected Action Sheet

### Requirement: Global Modal System
The editor SHALL provide a unified modal system for confirmations and notices.
New confirmations SHALL use the modal system instead of native OS dialogs.

#### Scenario: Confirm a destructive action
- **WHEN** a user initiates a destructive action
- **THEN** the modal system presents a confirm dialog with explicit cancel/confirm actions

### Requirement: Action Sheet Lifecycle Management
The editor SHALL allow Action Sheets to be archived or deleted from the UI.
Archived Action Sheets SHALL be hidden by default and surfaced on demand.

#### Scenario: Archive an Action Sheet
- **WHEN** a user archives an Action Sheet
- **THEN** the Action Sheet is marked archived in its status
- **AND** the default list hides the archived Action Sheet

#### Scenario: Delete an Action Sheet
- **WHEN** a user confirms delete for an Action Sheet
- **THEN** the Action Sheet data is removed from `.agency/action-sheets/<id>/`

### Requirement: Action Sheet Panel Embedding
The Action Sheet panel SHALL be embeddable in other flows to display status, retry, and session jump controls.

#### Scenario: Show Action Sheet status in Promote
- **WHEN** the Promote modal is open with a linked Action Sheet
- **THEN** a compact Action Sheet status panel is shown
- **AND** users can jump to the linked session terminal

#### Scenario: Show Action Sheet status in Draft detail
- **WHEN** a draft detail view is open with a linked Action Sheet
- **THEN** a compact Action Sheet status panel is shown
- **AND** users can retry the Action Sheet or jump to the linked session terminal

### Requirement: Embedded Action Sheet Missing State
When an embedded Action Sheet reference no longer exists, the UI SHALL hide the embedded panel.

#### Scenario: Linked Action Sheet is deleted
- **WHEN** a linked Action Sheet is deleted
- **THEN** embedded Action Sheet panels disappear instead of showing stale data

### Requirement: Create Action Sheet from Draft
The Draft detail view SHALL allow users to create an Action Sheet when none is linked.
The editor SHALL store the created Action Sheet id on the Draft metadata.

#### Scenario: Create Action Sheet from Draft detail
- **WHEN** a user selects Create Action Sheet in Draft detail with no linked sheet
- **THEN** the editor creates an Action Sheet for the Draft
- **AND** stores the Action Sheet id in the Draft metadata
- **AND** the Draft detail shows the Action Sheet status panel

### Requirement: Contextual HIL Drawer Panels
The editor SHALL adjust the right-side HIL drawer content based on the active view.

#### Scenario: Agent Cells default Drafts
- **WHEN** the user is in Agent Cells and opens the HIL drawer
- **THEN** Drafts is the default panel
- **AND** Comments remains available for selection

#### Scenario: Action Sheets and Explorer default Comments
- **WHEN** the user is in Action Sheets or Explorer and opens the HIL drawer
- **THEN** Comments is the default panel
- **AND** Drafts remains available for selection

#### Scenario: Memo view shows Inbox shortcuts
- **WHEN** the user is in Memo and opens the HIL drawer
- **THEN** the drawer hides the Comments and Drafts tabs
- **AND** the drawer shows Inbox shortcuts for Flash notes and Screenshot capture
- **AND** the drawer provides an Open Inbox entry
- **AND** the Memo main Inbox sections remain available in the main pane

### Requirement: Promote Default Session Selection
The editor SHALL default the Promote session selection to the active session when Promote is opened from Agent Cells.

#### Scenario: Promote uses active session
- **WHEN** the user opens Promote from Agent Cells with an active session
- **THEN** the Promote modal selects that session by default

### Requirement: Drafts Drawer Action Sheet Status
The editor SHALL surface Action Sheet execution status for drafts in the HIL drawer.

#### Scenario: Draft Action Sheet running
- **WHEN** a draft has a linked Action Sheet that is running or waiting for a gate in a session
- **THEN** the draft row shows the running state and session label
- **AND** selecting the draft jumps to that session

#### Scenario: Draft Action Sheet idle
- **WHEN** a draft has no linked Action Sheet or its Action Sheet is not running
- **THEN** the draft row indicates no active session
- **AND** selecting the draft opens Memo with that draft selected
- **AND** the drawer offers a run-in-active-session control for that draft

#### Scenario: Quick run in active session
- **WHEN** the user triggers run in active session for a draft
- **THEN** the system creates a default Action Sheet if none is linked
- **AND** the Action Sheet dispatches immediately to the active session without additional confirmation

#### Scenario: No active session available
- **WHEN** there is no active session
- **THEN** the run-in-active-session control is disabled and indicates a session is required

### Requirement: Dev Renderer Port Discovery
The editor SHALL avoid hard-coding a dev renderer port and MUST discover the active renderer URL when running against a dev server.
The default dev renderer port MUST NOT be 5173.

#### Scenario: Dev server on non-default port
- **WHEN** the dev renderer runs on a non-default port
- **THEN** the editor locates and loads the active dev renderer URL

### Requirement: Packaged Renderer Override
The editor SHALL allow packaged builds to load a dev renderer URL when explicitly configured for local development.

#### Scenario: Packaged build with renderer override
- **WHEN** a packaged build is launched with an explicit renderer URL override
- **THEN** the editor loads the configured renderer URL

### Requirement: Memo Drawer Shortcut Interaction
Memo drawer shortcut cards SHALL support Flash, Excerpt, and Screenshot capture surfaces.
Memo drawer shortcut cards SHALL allow inline capture interaction without switching the main Memo panel by default.
The drawer SHALL provide an explicit "View Records" action on each shortcut card to switch the main Memo inbox section.
When a memo capture is confirmed and stored, the main Memo panel SHALL switch to the corresponding inbox section.
These behaviors SHALL follow the interaction rules described in `apps/editor/README.md#memo-drawer-interactions`.

#### Scenario: Interact with shortcut without switching
- **WHEN** a user interacts with a shortcut card input in the Memo drawer
- **THEN** the main Memo panel remains on its current view

#### Scenario: Switch via View Records
- **WHEN** a user clicks the shortcut card "View Records" action
- **THEN** the main Memo panel switches to that inbox section

#### Scenario: Switch after capture
- **WHEN** a user saves a memo capture from the drawer
- **THEN** the main Memo panel switches to the matching inbox section

### Requirement: Terminus Settings Configuration
The editor SHALL load Terminus settings from Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
Terminus settings SHALL be stored in new files (`terminus-settings.json` for Global, `.agency/terminus-settings.yaml` for Project, and `.agency/terminus-settings-<worktreeName>.yaml` for Agent).
Terminus shortcuts SHALL be configured per Terminus profile and only apply to the active profile.
No backward compatibility with legacy shortcut behavior is required.

#### Scenario: Resolve scoped settings
- **WHEN** a user defines a Terminus profile shortcut binding in Project scope that shares an id with a Global binding
- **THEN** the Project binding is used for the active profile in that Cell

#### Scenario: Agent overrides project
- **WHEN** an Agent scope binding shares the same id as a Project binding
- **THEN** the Agent binding is used for that Agent's active profile

### Requirement: Baseline Terminal Profile
The editor SHALL include a baseline plain-shell profile in Terminus settings.
The baseline profile MUST be visible in the Terminus configuration view and MUST NOT be deletable.

#### Scenario: Baseline profile is present
- **WHEN** a user opens the Terminus configuration view
- **THEN** the plain-shell profile is listed and cannot be removed

### Requirement: Shortcut Interception Defaults
The editor SHALL NOT intercept keyboard shortcuts unless explicitly configured in Terminus settings for the active profile.
Default Terminus settings MUST provide zero shortcut bindings.

#### Scenario: No configured bindings
- **WHEN** a user presses Shift+Enter in the terminal and no Terminus bindings are configured for the active profile
- **THEN** the terminal receives the native Shift+Enter behavior without interception

### Requirement: Shortcut Input Dispatch
The editor SHALL route configured Terminus shortcut bindings through a centralized terminal input dispatcher that sends explicit input actions (e.g., text or key sequences) to the active session.

#### Scenario: Dispatch a configured shortcut
- **WHEN** a user triggers a configured shortcut binding
- **THEN** the dispatcher sends the defined input action to the active session

### Requirement: App Shortcuts Configuration
The editor SHALL provide App Shortcuts configuration at Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
App Shortcuts SHALL be stored in new files (`app-shortcuts.json` for Global, `.agency/app-shortcuts.yaml` for Project, and `.agency/app-shortcuts-<worktreeName>.yaml` for Agent).
App Shortcuts SHALL be defined as a fixed action list that users configure (no add/remove).

#### Scenario: Configure an app shortcut
- **WHEN** a user opens App Shortcuts in Hierarchy
- **THEN** the editor displays the full action list with per-action configuration

#### Scenario: Resolve app shortcut overrides
- **WHEN** a Project app shortcut entry shares an id with a Global entry
- **THEN** the Project entry is used for the active Cell

### Requirement: App Shortcuts UI Layout
The editor SHALL render App Shortcuts as a VSCode-style layout with an action list on the left and the selected action's configuration on the right.
The editor SHALL NOT require users to add actions manually.

#### Scenario: Select an action
- **WHEN** a user selects an action in the list
- **THEN** the corresponding configuration renders in the right panel

### Requirement: Memo Voice Input
The Memo Flash capture UI SHALL provide a voice input control with explicit start and stop actions.
The control SHALL allow selecting a recognition language, defaulting to the browser language when set to Auto.
While recording, the UI SHALL show a recording state and a live transcript preview that includes interim speech and draft segments.
Finalized transcripts SHALL be appended to the Flash text field without discarding existing typed content.
If voice input is unsupported, blocked, or fails, the editor SHALL surface a non-blocking status message with the failure reason and keep manual input available.
When voice input fails to start or crashes, the editor SHALL log a runtime warning with diagnostic context.
On macOS, the editor SHALL prefer native speech recognition when available and fall back to Web Speech when native capture is unavailable.
When language is set to Auto, the editor SHALL surface draft transcripts in the live preview and only commit text after rescoring the full segment audio.
Rescoring SHALL NOT interrupt ongoing capture or prevent subsequent speech from appearing in the live preview.
If auto language detection is uncertain, the editor SHALL rescore using normalized, supported locale candidates before selecting the replacement text.
When voice capture is used to create a Flash memo, the editor SHALL save the original audio alongside the memo and expose playback controls.
The editor SHALL warm up the native speech helper in the background after app ready and log the warmup duration so first capture does not block on helper setup.
When voice capture starts, the editor SHALL emit timing diagnostics for permission checks and audio initialization.

#### Scenario: Capture flash text by voice
- **WHEN** a user starts voice input from the Flash capture UI
- **THEN** the editor records speech and shows transcription progress
- **AND** finalized transcription is appended to the Flash text field after rescore completes

#### Scenario: Stop recording and keep manual input
- **WHEN** a user stops voice input during Flash capture
- **THEN** the editor finalizes the transcript and returns to idle
- **AND** the Flash text field remains editable

#### Scenario: Select recognition language
- **WHEN** a user selects a recognition language in the Flash capture UI
- **THEN** subsequent voice capture uses the selected language
- **AND** the selected value is shown in the UI

#### Scenario: Use macOS native speech recognition
- **WHEN** the editor runs on macOS and native speech recognition is available
- **THEN** voice capture uses the native speech backend

#### Scenario: Auto language detection with rescore
- **WHEN** a user records a Flash memo with language set to Auto
- **THEN** the editor detects the spoken language per segment
- **AND** the editor rescans the full segment audio before committing text to the Flash input

#### Scenario: Rescore does not block live capture
- **WHEN** a user continues speaking while a prior segment is rescoring
- **THEN** the live transcript preview continues updating with new speech

#### Scenario: Save and play Flash audio
- **WHEN** a user saves a Flash memo recorded via voice input
- **THEN** the original audio is stored with the memo
- **AND** the memo UI provides playback controls

#### Scenario: Warm up native speech helper
- **WHEN** the editor finishes app startup on macOS
- **THEN** the speech helper is warmed in the background
- **AND** warmup timing is logged for diagnostics

#### Scenario: Log voice initialization timing
- **WHEN** a user starts voice capture
- **THEN** the editor logs permission and audio initialization timing

#### Scenario: Voice input unavailable
- **WHEN** speech recognition is unsupported, blocked, or errors
- **THEN** the editor shows a fallback status message without blocking the UI
- **AND** manual text input remains usable

