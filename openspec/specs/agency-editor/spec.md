# agency-editor Specification

## Purpose
Define the requirements for the Agency Editor desktop app that manages Cells, terminals, and lifecycle state for agentic development.
## Requirements
### Requirement: Canonical Object Hierarchy
The editor SHALL define one canonical Agency object hierarchy and use it consistently across product language, runtime contracts, and cross-surface ownership.
The canonical hierarchy SHALL distinguish at least:
- `App`: the desktop application instance
- `Window`: one top-level editor shell with window-local project context
- `Project`: the repository context selected inside a window
- `Cell`: the worktree-bound workspace object
- `Session`: an execution lane inside exactly one Cell
- `Run`: a host-owned bounded orchestration record that may inspect, create, or target sessions through approved capabilities

#### Scenario: Session and run remain distinct
- **WHEN** a user starts child execution from a session entry
- **THEN** the system creates or references a `Run` as the orchestration identity
- **AND** any resulting child session remains a separate execution-lane object rather than replacing the run identity

#### Scenario: Same object identity across surfaces
- **WHEN** a user views the same Cell or session in Agent Cells and Session Map
- **THEN** both surfaces refer to the same underlying object identity
- **AND** neither surface invents a competing ownership model for that object

### Requirement: Surface Roles Stay Distinct From Object Ownership
The editor SHALL treat product surfaces as views and action surfaces over canonical objects rather than as independent domain-object roots.
At minimum:
- `Agent Cells` SHALL be a surface for Cells and sessions
- `Explorer` and `Workbench` SHALL be file surfaces in project/Cell context
- `Session Map` SHALL be a navigation and observability surface over Cells, sessions, and runs
- `Hierarchy` SHALL be a configuration surface
- `Memo` SHALL be an artifact surface
- `Commander` SHALL be a bounded operator surface over session and run context rather than a standalone object type

#### Scenario: Commander stays a bounded surface
- **WHEN** a user opens Commander from Session Map or a Commander-backed session action
- **THEN** the product presents Commander as an operator surface over current session/run evidence
- **AND** it does not imply that Commander is a separate execution object hierarchy

### Requirement: Workflow Artifact Ownership
The editor SHALL model workflow artifacts separately from canonical domain objects and keep their ownership explicit.
At minimum:
- lifecycle records and lifecycle gates SHALL remain bound to Cell lifecycle state
- Action Sheets SHALL be workflow artifacts bound to a Cell and optionally a session
- Reply items SHALL be session-bound memo artifacts
- delivery records SHALL be dispatch artifacts that reference source artifacts and target sessions

#### Scenario: Reply remains a session-bound artifact
- **WHEN** a user records or sends a reply
- **THEN** the product stores a reply artifact with session ownership metadata
- **AND** the reply does not become a new execution object parallel to Cells, sessions, or runs

#### Scenario: Delivery remains a dispatch artifact
- **WHEN** a user dispatches content through Promote, Explorer send, or Session Reply
- **THEN** the product records delivery as a dispatch artifact referencing source items and target sessions
- **AND** the dispatch does not redefine session or run ownership semantics

### Requirement: Canonical Attention Layer
The editor SHALL provide one shared attention layer over canonical objects instead of surface-local urgency indicators.
The attention layer SHALL attach only to canonical object ownership:
- `Window`
- `Cell`
- `Session`
- `Run`

#### Scenario: Attention does not invent a new object root
- **WHEN** a surface renders an item that requires user intervention
- **THEN** the item references a canonical `Window`, `Cell`, `Session`, or `Run`
- **AND** the product does not introduce a competing standalone attention object hierarchy

### Requirement: Attention State Vocabulary
The editor SHALL classify attention using a bounded shared vocabulary.
At minimum the vocabulary SHALL support:
- `running`
- `failed`
- `pending_confirmation`
- `unread`
- `return_required`

#### Scenario: Same state language across surfaces
- **WHEN** the same session or run requires attention in Session Map, Agent Cells, and shell chrome
- **THEN** each surface uses the same attention state label and severity semantics

### Requirement: Cross-Surface Attention Surfacing
The editor SHALL surface local attention consistently in Session Map, Agent Cells, and shell chrome.
The editor SHALL surface cross-window attention through the existing window-shell/window-switching path using a minimal window attention summary.

#### Scenario: Another window advertises urgency
- **WHEN** a non-focused Agency window has a higher-priority attention item than the current window
- **THEN** the current window can show that urgency through shell chrome
- **AND** the window switcher identifies the target window's primary attention state

### Requirement: Attention Jump Paths
Attention items SHALL support direct navigation to the owning object instead of passive display-only indicators.

#### Scenario: Jump from attention item to target object
- **WHEN** a user activates an attention item
- **THEN** the editor focuses the owning object using bounded existing navigation paths
- **AND** run/session attention uses Session Map or Agent Cells as appropriate
- **AND** window attention focuses the target window

### Requirement: Running Child Execution Stays Visible
The editor SHALL keep active bounded child execution visible in the attention layer until the run no longer requires intervention.

#### Scenario: Running child execution is not buried
- **WHEN** a `Create Agent` child-execution run is active
- **THEN** the attention layer surfaces that run in shell chrome and current-window surfaces
- **AND** the user can jump to its owning session/run context

### Requirement: Return-Required Session Attention
The editor SHALL surface when a run creates or readies a session that the user has not revisited yet.

#### Scenario: Child session requires follow-up
- **WHEN** a run creates a child session and the user has not revisited that session since the run completed
- **THEN** the attention layer marks that session as `return_required`
- **AND** activating the attention item focuses that session

### Requirement: Unified Local Control Bus
The editor SHALL provide one host-owned local control bus for automation and external tooling.
The control bus SHALL expose one normalized request/response contract across its supported transports.

#### Scenario: CLI and socket use the same contract
- **WHEN** a local caller invokes the control bus through the CLI wrapper or the local socket transport
- **THEN** both transports accept the same operation envelope shape
- **AND** both transports return the same normalized success/failure schema

#### Scenario: Control bus stays local-only in v1
- **WHEN** the first production slice of the control bus is shipped
- **THEN** the bus is scoped to local host transports only
- **AND** the product does not present it as a remote multi-user network API

### Requirement: Control Bus Uses Canonical Object References
The control bus SHALL align with the canonical object model and SHALL make object references explicit in supported operations.
At minimum, the bus SHALL support canonical references for `Window`, `Project`, `Cell`, `Session`, and `Run` when those objects are relevant to the operation.

#### Scenario: Operation targets a session and run context
- **WHEN** a caller requests a run or session-related operation through the control bus
- **THEN** the request identifies the relevant object references explicitly instead of hiding them inside transport-specific payload conventions

### Requirement: Control Bus Routes Through Existing Capability Owners
The control bus SHALL remain a dispatcher over existing host-owned capability owners rather than becoming a new direct side-effect owner.

#### Scenario: File operation goes through File Intent
- **WHEN** a caller requests a file interaction through the control bus
- **THEN** the control bus routes the request through the File Intent capability owner
- **AND** file safety, permission, and conflict semantics remain those of File Intent

#### Scenario: Session orchestration goes through Session Runtime or Harness
- **WHEN** a caller requests session orchestration or run control through the control bus
- **THEN** the control bus routes the request through Session Runtime or Main Agent Harness as appropriate
- **AND** the bus does not bypass those host-owned capability seams

### Requirement: Control Bus Trust And Caller Metadata Stay Explicit
The control bus SHALL preserve transport-derived trust and caller-declared identity as distinct concepts.

#### Scenario: Trusted local host caller invokes the bus
- **WHEN** a local CLI or socket caller invokes the control bus
- **THEN** the request is tagged with explicit transport trust/access scope metadata
- **AND** caller-declared metadata remains available for audit and policy decisions

### Requirement: Unified Control Bus Operation Set
The first shipped control-bus slice SHALL provide one namespaced operation set over the already-shipped host seams.
At minimum, the initial operation set SHALL cover:
- window shell control
- file intent operations
- session runtime operations
- main agent harness run operations

#### Scenario: Caller controls a window through the bus
- **WHEN** a local caller requests a window-shell operation through the control bus
- **THEN** the bus performs the operation through the window-shell capability owner
- **AND** the response includes normalized result data for the affected window shell

#### Scenario: Caller starts a run through the bus
- **WHEN** a local caller requests run creation through the control bus
- **THEN** the bus starts the run through Main Agent Harness
- **AND** the response returns normalized run data including the resulting `runId`

### Requirement: Child-Execution Vocabulary Is Distinct From Workspace Creation
The editor SHALL reserve `Create Cell` for creating or managing durable workspace contexts that may attach to git worktrees, and SHALL reserve `Create Agent` for bounded child execution.
`Fork` SHALL remain a specialized child-execution strategy rather than the default meaning of workspace creation or child execution.

#### Scenario: Create Cell uses workspace semantics
- **WHEN** a user creates a new workspace context or attaches an existing worktree to an existing context
- **THEN** the product presents that action as `Create Cell`
- **AND** the resulting object is a Cell rather than a child execution run

#### Scenario: Create Agent uses run-based execution semantics
- **WHEN** a user starts bounded child execution from an existing project, Cell, or session context
- **THEN** the product presents that action as `Create Agent`
- **AND** the action creates or references a host-owned run identity
- **AND** any fork behavior is treated as an optional specialization under that action

### Requirement: macOS-First Agency Editor
Agency SHALL provide a desktop editor application that runs on macOS in v0.2.
The architecture MUST keep a path open for future Windows/Linux support.

#### Scenario: macOS build artifacts
- **WHEN** v0.2 release artifacts are produced
- **THEN** an installer/package exists for macOS

### Requirement: Create Cell
The editor SHALL create a new Cell as a durable project-owned workspace object.
The editor SHALL allow Cell creation to attach a new git worktree, reuse an existing git worktree, or bind an existing branch by creating or reusing an attachment worktree, but Cell identity SHALL remain valid if the attachment later changes or disappears.
The editor SHALL treat Cell creation as workspace/context creation rather than as child execution or run orchestration.
Branch strategy and naming constraints SHALL apply only when the editor creates a new branch itself.
Binding an existing worktree or branch SHALL preserve the existing branch identity rather than forcing it through create-time naming rules.

#### Scenario: Create new Cell
- **WHEN** a user creates a new Cell with a new branch
- **THEN** the editor creates a durable Cell record
- **AND** attaches a new worktree bound to that branch

#### Scenario: Reuse existing worktree
- **WHEN** a user selects an existing worktree for a new Cell
- **THEN** the editor creates or reuses the durable Cell record for that context
- **AND** attaches the existing worktree without redefining Cell identity around that path alone

#### Scenario: Bind existing branch
- **WHEN** a user selects an existing branch for a new Cell
- **THEN** the editor creates or reuses a worktree attachment for that branch
- **AND** creates or reuses the durable Cell record without renaming the existing branch

#### Scenario: Create from explicit base branch
- **WHEN** a user creates a new branch-backed Cell and selects an explicit base branch such as `main`
- **THEN** the new worktree branches from that explicit base branch
- **AND** the chosen base branch is not silently replaced by the repository default branch

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
The editor SHALL persist Cell lifecycle state in a repo-owned Cell record under the project root rather than only in the attached worktree.
The record MUST be YAML or Markdown and MUST be treated as a mergeable record.
The editor SHALL read and update this record to reflect lifecycle changes even when the Cell has no live worktree attachment.

#### Scenario: External update
- **WHEN** the Cell record changes due to an external workflow
- **THEN** the editor reflects the updated lifecycle state

#### Scenario: Worktree attachment missing
- **WHEN** a Cell's worktree attachment is removed or missing
- **THEN** the editor still reads the repo-owned Cell record
- **AND** preserves the Cell lifecycle state

### Requirement: Lifecycle Gates and Confirmation
The editor SHALL require a confirmation step for lifecycle transitions.
For Cells with an attached worktree, the confirmation MUST show gate results for the target state and MUST block the transition when any required gate fails.
The editor SHALL resolve gate definitions for the target state using Global -> Project -> Agent overrides.
The editor SHALL execute gate commands line-by-line and treat any non-zero exit status as a gate failure.
The editor SHALL seed default gates that cover spec created, checklist completed, and no unresolved merge conflicts for attached development Cells.

#### Scenario: Transition allowed
- **WHEN** a user transitions an attached Cell to Active or Archived and all required gates pass
- **THEN** the editor allows the transition after explicit confirmation

#### Scenario: Transition blocked
- **WHEN** a user transitions an attached Cell to Active or Archived and any required gate fails
- **THEN** the editor blocks the transition and surfaces the failing gate(s)

#### Scenario: Archive detached Cell
- **WHEN** a user archives a Cell whose worktree attachment is already missing or detached
- **THEN** the editor offers an attachment-aware confirmation path
- **AND** does not require the missing worktree to be resolved before archiving the Cell

### Requirement: Minimal Validation (MVP)
The editor SHALL perform minimal validation of spec/branch context and MUST label this validation as a temporary version.
Validation failures MUST surface as warnings and MUST NOT block the workflow.

#### Scenario: Spec missing
- **WHEN** a Cell is missing its spec file
- **THEN** the editor shows a warning and allows the user to proceed

### Requirement: Session Registry and Recovery
The editor SHALL maintain a per-Cell session registry in repo-owned Cell storage and restore sessions on relaunch.
Losing the current worktree attachment SHALL NOT erase the Cell's session registry.
The editor SHALL NOT auto-create a `Default` session merely because a Cell is selected, restored, or has an attached worktree.

#### Scenario: Restore sessions on relaunch
- **WHEN** the editor restarts
- **THEN** it restores the session list for each Cell from the session registry
- **AND** it attempts to reattach to recoverable sessions

#### Scenario: Empty registry stays empty on startup
- **WHEN** the editor restores a Cell whose session registry is empty
- **THEN** the Cell remains sessionless after startup
- **AND** the UI offers explicit session creation instead of silently materializing a `Default` session

#### Scenario: Stale session detection
- **WHEN** a registered session cannot be recovered
- **THEN** the editor marks it as stale and prompts the user to start a new session

#### Scenario: Missing worktree keeps session evidence
- **WHEN** a Cell's worktree attachment is missing during relaunch
- **THEN** the editor still loads that Cell's session registry
- **AND** keeps the sessions visible as stale, closed, detached, or otherwise offline as appropriate

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
The editor SHALL preserve parent-child relationships between sessions within the same Cell.

#### Scenario: Create a new session
- **WHEN** a user creates a new session in a Cell
- **THEN** a new terminal session is added to that Cell without replacing existing sessions

#### Scenario: Switch sessions
- **WHEN** a user selects another session
- **THEN** the editor shows the selected session output and input

#### Scenario: Preserve topology after reparenting
- **WHEN** a user reparents or reorders a session within a Cell
- **THEN** the editor keeps the session in the same Cell and preserves the updated topology

### Requirement: Configurable Quick Actions
The editor SHALL allow users to configure quick actions with `startCommand` and `resumeCommand`.
Quick actions SHALL support Global, Project, and Agent scopes, where identifiers resolve in Global -> Project -> Agent order.
Project-scoped quick actions SHALL resolve from repository-root storage and Agent-scoped quick actions SHALL resolve from repo-owned Cell storage.
Quick action commands SHALL accept multi-line scripts.

#### Scenario: Run a quick action
- **WHEN** a user invokes a quick action
- **THEN** the editor runs its `startCommand` in the selected session

#### Scenario: Resume a quick action
- **WHEN** a user resumes a quick action and `resumeCommand` is configured
- **THEN** the editor runs the `resumeCommand` in the selected session

#### Scenario: Override quick actions per scope
- **WHEN** an Agent scope action shares the same identifier as a Project or Global action
- **THEN** the Agent definition is used for execution

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
The editor SHALL render sessions as a tree of nested list items under their parent Cell in the Agent Cells sidebar and highlight the active session.
The editor SHALL allow expanding and collapsing session groups in that tree.

#### Scenario: Switch session via session tree
- **WHEN** a user clicks a session entry under a Cell
- **THEN** the editor activates that session and selects the parent Cell

#### Scenario: Expand nested sessions
- **WHEN** a session node has child sessions and the user expands that node
- **THEN** the editor shows the child sessions in the Agent Cells sidebar

### Requirement: Closed Sessions Overflow
The editor SHALL display detached and closed sessions in an overflow menu associated with the Cell's session list rather than the main session list.

#### Scenario: View closed sessions
- **WHEN** a user opens the sessions overflow menu on a Cell
- **THEN** the editor lists detached/closed sessions and allows selecting/restoring them

### Requirement: Session Hierarchy Reordering
The editor SHALL allow users to reorder sessions among siblings, move a session under another session as a child, and promote a child session to a higher level within the same Cell.

#### Scenario: Reorder among siblings
- **WHEN** a user drags a session before or after another session with the same parent
- **THEN** the editor updates sibling ordering and persists the new order

#### Scenario: Reparent as child
- **WHEN** a user drags a session onto another session's child drop target
- **THEN** the editor reparents the dragged session under the target session and persists the new hierarchy

#### Scenario: Promote to a higher level
- **WHEN** a user drags a child session out onto one of its visible ancestor levels
- **THEN** the editor reparents the session to that higher level and persists the new hierarchy

### Requirement: Session Hierarchy Persistence
The editor SHALL store session topology metadata in the repo-owned Cell session registry and SHALL migrate existing flat or worktree-local registries without losing sessions or relative order.

#### Scenario: Load legacy registry
- **WHEN** the editor loads a session registry that lacks hierarchy metadata
- **THEN** it treats all sessions as root nodes in their existing order

#### Scenario: Reload preserved hierarchy
- **WHEN** the editor relaunches after sessions were reordered or reparented
- **THEN** it restores the same hierarchy and sibling order

### Requirement: Invalid Session Hierarchy Protection
The editor SHALL reject or repair topology changes that would create invalid session trees.

#### Scenario: Prevent cyclic parentage
- **WHEN** a user attempts to move a session under one of its descendants
- **THEN** the editor rejects the change and preserves the previous hierarchy

#### Scenario: Repair missing parent
- **WHEN** the registry references a missing parent session
- **THEN** the editor promotes the orphaned session to the root level and keeps it accessible

### Requirement: Typed Child Session Creation
The editor SHALL allow users to create typed child sessions from an existing session in Agent Cells.

#### Scenario: Create sub terminal child
- **WHEN** a user invokes `Sub Terminal` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=sub_terminal`
- **AND** the child uses the shell baseline profile

#### Scenario: Create fork child
- **WHEN** a user invokes `Fork` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=fork`
- **AND** the child preserves the parent session profile when available

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
Project entries SHALL require a selected project root but SHALL NOT require a selected Cell with a live worktree attachment.
Agent entries SHALL require a selected Cell.

#### Scenario: Open global actions
- **WHEN** a user selects Global Actions in Hierarchy
- **THEN** the editor shows the global actions configuration view

#### Scenario: Open project actions without a selected Cell
- **WHEN** a user selects Project Actions with an active project but no selected Cell
- **THEN** the editor allows editing the Project action configuration

#### Scenario: Agent actions without a Cell
- **WHEN** a user selects Agent Actions without an active Cell
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
The Agent Cells view SHALL expose an embedded Explorer section anchored in the lower area of the Agent Cells sidebar, aligned with the currently selected Cell context.
The embedded Explorer section SHALL collapse to a bottom bar and expand to a default half-height state, and users SHALL be able to resize the split via vertical drag.
The embedded Explorer section SHALL provide scoped file interaction entry points and lightweight drag/drop routing into Explorer import semantics.
The embedded Explorer section SHALL keep the Agent Cells list and the embedded Explorer file list independently scrollable when content overflows.
The Explorer view SHALL provide a companion changed-files panel above the Agent footer, using consistent presentation and row interactions with the Agent Cells embedded Explorer while remaining changes-only.

#### Scenario: Embedded Explorer panel placement
- **WHEN** a user opens Agent Cells view
- **THEN** the embedded Explorer section appears in the lower Agent Cells sidebar flow
- **AND** the section is context-aware to the selected Cell.

#### Scenario: Embedded Explorer panel collapse and resize
- **WHEN** a user collapses the embedded Explorer section
- **THEN** it remains accessible as a bottom bar at the bottom of the Agent Cells sidebar.
- **WHEN** a user expands the embedded Explorer section
- **THEN** it opens at a default half-height of the available sidebar space
- **AND** a user can drag to resize the section height.

#### Scenario: Changes view shows modified files
- **WHEN** a user selects `Changes` in the embedded Explorer section
- **THEN** the editor presents modified files for the selected Cell/worktree from canonical Explorer status data
- **AND** ignored entries are excluded by default
- **AND** users can switch between Flat and Tree presentation.

#### Scenario: All view shows all files
- **WHEN** a user selects `All` in the embedded Explorer section
- **THEN** the editor presents a file list for the selected Cell/worktree (tracked + untracked)
- **AND** changed entries are highlighted with status badges when available
- **AND** the list MAY be limited; when limited the UI indicates truncation.

#### Scenario: Independent scrolling for Agents and Explorer lists
- **WHEN** the Agent Cells list overflows
- **THEN** it scrolls independently of the embedded Explorer section.
- **WHEN** the embedded Explorer file list overflows
- **THEN** it scrolls within the embedded Explorer section.

#### Scenario: Open and reveal from embedded Explorer
- **WHEN** a user activates open/reveal actions on a file row in the embedded Explorer section
- **THEN** the editor routes actions through unified file interaction intents
- **AND** workbench/Explorer landing behavior remains consistent with other surfaces.

#### Scenario: Embedded Explorer drag/drop routing
- **WHEN** a user drags a file row from embedded Explorer or drops external files onto embedded Explorer
- **THEN** drag-out uses unified `text/plain` payload semantics
- **AND** drop-in routes through unified `import_copy` behavior with standard conflict-safe naming and path-safety checks.

#### Scenario: Explorer companion changed-files continuity
- **WHEN** a user switches from Agent Cells to Explorer view
- **THEN** a changed-files panel is visible above the Agent footer with consistent row/tree presentation
- **AND** the panel does not expose scope toggles and only displays changed files for the selected Cell.

### Requirement: Gate Configuration Scopes
The editor SHALL support gate definitions in Global, Project, and Agent scopes.
The editor SHALL resolve gate definitions by id using Global -> Project -> Agent overrides.
Gate definitions SHALL be grouped by lifecycle stage (draft, active, archived).
Gate definitions SHALL execute line-by-line shell commands.
Gate definitions SHALL be stored as:
- Global: the editor user data directory as `gates.yaml`
- Project: `.agency/gates.yaml` at the repository root
- Agent: `.agency/cells/<cell-id>/gates.yaml` in repo-owned Cell storage

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
The editor SHALL provide an Explorer entry in the activity bar that shows a project file tree rooted at the active Cell worktree.
If no Cell is available, the Explorer SHALL fall back to the repository root.
Explorer SHALL also act as the canonical interaction hub for cross-surface file intents and reveal requests.

#### Scenario: Open project explorer
- **WHEN** a user selects Explorer in the activity bar
- **THEN** the editor shows the project file tree and root metadata

#### Scenario: Switch cell scope
- **WHEN** a user selects a different Cell scope in Explorer
- **THEN** the file tree updates to the new worktree root

#### Scenario: Cross-surface reveal lands in Explorer
- **WHEN** another surface issues a `reveal` intent for a file
- **THEN** Explorer focuses and reveals/selects the target path in the active scope

### Requirement: Explorer File Operations
The explorer SHALL support create, rename, delete, move, and copy operations for files and folders.
The explorer SHALL support multi-select, drag-and-drop reordering, and copying paths.
The explorer SHALL allow revealing the selected path in the system file manager.
Explorer SHALL execute file intents from other surfaces using the same path safety, conflict handling, and result/error model used by direct Explorer operations.

#### Scenario: Rename file
- **WHEN** a user renames a file from the explorer context menu
- **THEN** the editor updates the filesystem and refreshes the tree

#### Scenario: Move file via drag
- **WHEN** a user drags a file onto another folder
- **THEN** the editor moves the file and updates the explorer view

#### Scenario: Cross-surface import consistency
- **WHEN** Explorer receives an `import_copy` intent routed from another surface
- **THEN** Explorer applies the same conflict-safe naming and structured result reporting used by native Explorer import flows

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
The explorer SHALL allow filtering the tree by filename/path, by change status, and by semantic file rules.
The explorer SHOULD evolve built-in filters through a descriptor-driven model so future filter families can be added without hard-coded UI proliferation.

#### Scenario: Filter by filename
- **WHEN** a user enters a filename filter
- **THEN** the explorer shows matching files and their ancestor paths

#### Scenario: Semantic filter
- **WHEN** a user enables a semantic filter
- **THEN** the explorer shows files matching that semantic rule and their required ancestor paths

### Requirement: Explorer Filter Descriptor Registry
The editor SHALL represent Explorer filters through a descriptor-driven model instead of only through hard-coded UI toggles.
Built-in filters SHALL be the first entries in that registry.
The descriptor model SHALL support persisted active state and future project-defined filter bundles.

#### Scenario: Built-in filters use the descriptor model
- **WHEN** Explorer renders built-in visibility, status, or semantic filters
- **THEN** it derives their labels, ids, and active-state handling from filter descriptors
- **AND** existing filter behavior remains functionally equivalent

#### Scenario: Persist filter state by descriptor id
- **WHEN** a user changes Explorer filters and later reopens the same root scope
- **THEN** Explorer restores filter state using stable descriptor ids

### Requirement: Explorer Search Capability Split
The editor SHALL distinguish between Explorer path/name search and Explorer full-text content search.
Path/name search SHALL continue to support fast tree reduction.
Content search SHALL support cross-file keyword discovery and SHALL NOT be treated as equivalent to filename filtering.

#### Scenario: Path search reduces the tree
- **WHEN** a user enters a path or filename query in Explorer search
- **THEN** Explorer filters visible paths and required ancestor nodes
- **AND** the result behaves as a tree-reduction interaction

#### Scenario: Content search returns content matches
- **WHEN** a user searches for a keyword across file contents
- **THEN** the editor returns file matches with line-level or snippet-level evidence
- **AND** the result is presented as a content-search result set rather than only as filename-filtered tree rows

### Requirement: Explorer Content Search And Replace
The editor SHALL support content search and scoped content replace across files.
Content replace SHALL provide target visibility and confirmation semantics suitable for multi-file mutation.
The editor SHALL allow confirmed targets to be curated at match granularity and SHALL require explicit full-file confirmation when a result file has more total matches than the visible review list.

#### Scenario: Replace keyword across a folder
- **WHEN** a user runs content replace within a folder scope
- **THEN** the editor shows target matches and replacement impact before applying the change
- **AND** the result surface previews how confirmed file snippets would change when replacement text is present
- **AND** when a file contains more matches than the visible review list, the editor keeps an explicit full-file confirmation path instead of treating visible evidence as exhaustive

#### Scenario: Replace keyword across the project
- **WHEN** a user runs content replace across the active project
- **THEN** the editor applies the replacement only to confirmed targets
- **AND** reports any files that could not be changed

### Requirement: Explorer Command Registry
The editor SHALL represent Explorer header and context-menu actions through a command registry rather than only hard-coded UI lists.
Each command SHALL define id, label, surface placement, and visibility conditions.

#### Scenario: Header actions come from command registry
- **WHEN** Explorer renders header actions
- **THEN** it derives action order and visibility from registered Explorer commands

#### Scenario: Context menu actions come from command registry
- **WHEN** a user opens the Explorer context menu
- **THEN** the menu groups and visible actions come from registered Explorer commands
- **AND** commands can still route to the existing file intent execution layer

### Requirement: Explorer Working-Set Views
The editor SHALL support Explorer working-set views as a first-class capability family in addition to the canonical file tree.
`Changed Files` SHALL be the first working-set view in that family.

#### Scenario: Switch to a working-set view
- **WHEN** a user activates the `Changed Files` working-set view
- **THEN** Explorer renders the registered working-set view using Explorer-aligned action grammar

#### Scenario: Working-set family is extensible
- **WHEN** a new working-set view is added in the future
- **THEN** it can attach to the Explorer working-set model without inventing a separate panel architecture

### Requirement: Explorer Project Policy Defaults
The editor SHALL support project-level Explorer policy for default filter, working-set, search, command-visibility, and research-lane behavior.
Project policy SHALL be able to define those defaults without replacing user-local state persistence.
Named Explorer presets are deferred until there is a stronger product contract for reusable starting states.

#### Scenario: Project default working set
- **WHEN** a project defines an Explorer policy with default working-set or filter preferences
- **THEN** Explorer applies those defaults on first load for that project scope
- **AND** user-local persisted state can still override them afterwards

### Requirement: Explorer Bounded URL Intake
The explorer SHALL provide bounded URL intake for URL-driven file workflows.
Explorer SHALL own discovery, intent selection, and launch/focus into a bounded web research workflow hosted by Workbench.
The feature SHALL NOT behave as a general-purpose browser replacement.

#### Scenario: Launch URL research into Workbench
- **WHEN** a user enters or confirms a public `http/https` URL from Explorer
- **THEN** the editor launches or focuses a bounded web research tab in Workbench
- **AND** Explorer remains the intake surface rather than replacing its primary panel with a browser-like page

#### Scenario: Save URL research into the workspace
- **WHEN** a user saves a bounded web research result as Markdown
- **THEN** the editor writes a Markdown artifact inside the active project scope
- **AND** the artifact carries fixed source frontmatter so Workbench can reopen it in markdown + preview mode
- **AND** the saved artifact can be opened or revealed back through the existing Explorer/workbench flows

#### Scenario: Cite URL research into memo workflow
- **WHEN** a user cites an inspected URL from the bounded web research tab
- **THEN** the editor creates a memo artifact through the existing HIL/Memo flow
- **AND** any previously saved Markdown path is attached as a workspace reference when available

#### Scenario: Escape to the system browser
- **WHEN** a user needs full browser behavior
- **THEN** the bounded web research tab provides an explicit action to open the URL in the system browser
- **AND** Agency does not grow tab, cookie, auth, or in-place browser session management

### Requirement: Workbench Browser-Surface View
The Workbench SHALL host bounded web research `View` as a true browser surface rather than a renderer iframe.
The browser surface SHALL stay owned by the active bounded web research tab and SHALL keep the same bounded public-URL policy as Explorer intake.

#### Scenario: Browser-denied sites still render in View
- **WHEN** a bounded web research tab enters `View`
- **THEN** Agency hosts the page in a browser surface that is not subject to iframe embedding limits
- **AND** sites that deny framing still render inside Agency without forcing a system-browser escape

#### Scenario: In-view navigation keeps Workbench state coherent
- **WHEN** a user clicks a link or the page redirects to another public `http/https` URL inside `View`
- **THEN** the browser surface stays inside the same bounded research tab
- **AND** the tab URL/title update so `Reader`, `Save Markdown`, and `Cite` still refer to the current research object

#### Scenario: Non-public destinations stay outside the browser surface
- **WHEN** a page or user action attempts to navigate `View` to a localhost, private-network, or non-`http/https` destination
- **THEN** the browser surface rejects that navigation inside Agency
- **AND** the bounded workbench surface keeps the failure local instead of turning into a general browser

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
The shell SHALL own docked-sidebar collapse and expand through one shared activity-bar-adjacent control rather than per-surface edge or corner affordances.

#### Scenario: Resize and persist sidebar
- **WHEN** a user resizes the sidebar and restarts the editor
- **THEN** the sidebar restores the last width and collapsed state

#### Scenario: Toggle the docked sidebar from the shell
- **WHEN** a docked sidebar surface such as Explorer or Memo is active
- **THEN** the user can collapse or expand the left sidebar from one shared shell-level control
- **AND** the dock container does not expose a second competing collapse affordance

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
The workbench SHALL keep diff, blame, and comment actions as contextual secondary review tools that appear only when the active tab resolves to a code editor state.
The shell SHALL NOT expose inert review actions when the backing capability is unavailable in the current environment.

#### Scenario: Show blame metadata
- **WHEN** a user hovers a line with blame enabled
- **THEN** the editor shows author, commit id, and commit time

#### Scenario: Review tools wait for code state resolution
- **WHEN** a workbench tab has not yet resolved to a code editor state
- **THEN** the shell keeps review actions hidden instead of exposing inert diff, blame, or comment controls

### Requirement: Media Preview
The workbench SHALL preview common media files (images, video, audio, PDF) with zoom/fit controls.

#### Scenario: Preview an image
- **WHEN** a user opens a PNG file
- **THEN** the editor shows the image with zoom and fit controls

### Requirement: Workbench Navigation Aids
The workbench SHALL display breadcrumbs for the active file and provide a quick-open affordance.
The quick-open affordance SHALL behave like a navigation surface rather than a misleading generic search button.
The quick-open surface SHALL accept optional `:line[:column]` suffixes and use them as in-editor jump targets after opening or focusing the selected file.

#### Scenario: Quick-open a file
- **WHEN** a user invokes quick-open and selects a file
- **THEN** the editor opens or activates the selected file target
- **AND** the quick-open surface closes after the selection is accepted

#### Scenario: Quick-open prioritizes already open context
- **WHEN** a user invokes quick-open
- **THEN** the surface may show open-tab matches ahead of broader project file matches
- **AND** the affordance label remains truthful to that capability

#### Scenario: Quick-open targets a location inside the file
- **WHEN** a user enters a quick-open query with `:line` or `:line:column`
- **THEN** the editor opens or focuses the selected file
- **AND** places the cursor at the requested location

### Requirement: Workbench Affordance Truthfulness
The workbench MUST NOT expose primary toolbar controls for layout capabilities that are not actually implemented.

#### Scenario: Split editor is unavailable
- **WHEN** split-editor layout is not implemented
- **THEN** the workbench does not expose a primary `Split` control that implies the feature already exists

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
The explorer SHALL allow filtering by Cell scope when multiple Cells exist.
The explorer SHOULD surface active filter state clearly enough that users do not need to reopen the filter panel to understand the current browsing mode.

#### Scenario: Toggle hidden files
- **WHEN** a user disables hidden files
- **THEN** dot-prefixed entries are removed from the tree

#### Scenario: Filter by status
- **WHEN** a user enables the "modified only" filter
- **THEN** the tree shows only modified entries and their ancestors

#### Scenario: Filter by Cell
- **WHEN** a user selects a Cell filter
- **THEN** status decorations and counts are scoped to that Cell

#### Scenario: Active filter summary is visible
- **WHEN** one or more Explorer filters are active
- **THEN** Explorer surfaces a readable summary or equivalent state indicator in the visible shell

### Requirement: Explorer Row State Hierarchy
Explorer rows SHALL honor a deterministic state hierarchy so visibility controls do not unexpectedly rearrange focus or selection. The hierarchy SHALL give priority to explicit user intent (keyboard focus, selection, multi-select context, drag/drop target) before applying visibility filters (hidden, ignored, working-set filters) and SHALL keep semantic metadata (git status, cell attribution, search hits) legible without altering higher-priority actions.
Ignored rows SHALL remain visually de-emphasized but still legible and actionable; the tree SHALL NOT style them as if they were deleted or invalid.
Workbench activity metadata within a row SHALL prioritize the most important current state instead of presenting multiple equal-weight row-state badges that compete with the file name.

#### Scenario: Hidden/ignored filters preserve selection state
- **WHEN** a user filters ignored entries out of the tree while a focused row is part of a multi-select set
- **THEN** the selection/focus metadata remains stored so re-enabling `visibility.hidden` or `visibility.ignored` immediately returns to the same configuration rather than auto-selecting an adjacent row

#### Scenario: Ignored rows honor higher-priority actions when shown
- **WHEN** `visibility.ignored` is enabled and the tree renders ignored rows
- **THEN** the ignored rows respect existing focus or selection-based commands, and reveal/open flows for those entries behave the same as tracked files while still surfacing their ignored metadata

#### Scenario: Ignored rows stay legible when visible
- **WHEN** ignored rows are visible in the tree
- **THEN** the file name remains readable enough to scan without guessing
- **AND** the ignored treatment reads as de-emphasis rather than deletion

#### Scenario: Workbench row metadata stays prioritized
- **WHEN** a file row is both open in the workbench and has unsaved edits
- **THEN** the row surfaces the higher-priority unsaved state instead of presenting two competing workbench-state badges

### Requirement: Explorer Shell Hierarchy
The Explorer shell SHALL keep title, search, filter, and working-set chrome subordinate to the tree rows they control.
The shell SHALL present current context clearly without visually competing with the file list.

#### Scenario: Header chrome stays subordinate to the tree
- **WHEN** the Explorer header renders root context, search controls, and filter state
- **THEN** those controls remain legible as file-context chrome
- **AND** the tree rows continue to read as the primary visual surface

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
When no project is configured, the window SHALL stay in a window-owned home state instead of projecting synthetic Project, Cell, or Session objects.

#### Scenario: Launch without project
- **WHEN** the editor starts with no configured project directory
- **THEN** the Explorer view is the default
- **AND** a Project Home UI prompts the user to choose a project directory
- **AND** the no-project window does not route through synthetic Cell/session identities
- **AND** startup does not auto-expand the right-side attention rail or HIL drawer over the Project Home surface

#### Scenario: Restore last project
- **WHEN** a user selects a project directory
- **THEN** the editor stores it locally
- **AND** the next launch opens that project by default

### Requirement: Agent Cells Empty State
When no project directory is configured, the Agent Cells surface SHALL show the shared window-owned Project Home state instead of a synthetic Cell row.
Only window-owned actions that do not require a project-backed Cell SHALL be available until a project directory is selected.

#### Scenario: No project configured
- **WHEN** the user opens Agent Cells without a configured project directory
- **THEN** the shared Project Home state is shown
- **AND** Cell/session creation affordances stay disabled until a project is selected

### Requirement: Project Home Surface Craft
The no-project `Project Home` surface SHALL read as one primary work surface instead of a bordered dashboard split into independent side columns.
The startup state SHALL prioritize larger surface groupings and restrained chrome over repeated outline boxes.

#### Scenario: Startup uses a single primary no-project surface
- **WHEN** a no-project window first appears
- **THEN** the main `Project Home` composition reads as one coherent primary surface
- **AND** it does not reserve a separately expanded right-side shell column before the home shell is opened

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
When no project is open, the left sidebar SHALL display recent projects together with explicit no-project recovery actions for the current window.
Selecting a recent project SHALL open it and set the active project root.

#### Scenario: Open recent project from sidebar
- **WHEN** a user selects a recent project from the sidebar list
- **THEN** the editor switches to that project and loads its Cells

### Requirement: Window-Owned Home Shell
The editor SHALL provide an optional home shell for no-project windows as a window-owned capability.
The home shell SHALL use the user's home directory as its default working directory.
The home shell SHALL NOT create or mutate repo-owned Cell/session storage.

#### Scenario: Start a home shell before selecting a project
- **WHEN** a user chooses `Start Home Shell` in a no-project window
- **THEN** the editor opens a shell rooted at the user home directory
- **AND** the shell is owned by that window rather than by a Project, Cell, or Session

#### Scenario: Home shell stays out of Cell storage
- **WHEN** a user uses the home shell in a no-project window
- **THEN** the editor does not create `.agency/cells/**` session registry entries or Cell-owned runtime records for that shell

### Requirement: Project Menu Actions
The editor SHALL expose menu actions for Open Project, Switch Project, and New Window.
Open/Switch Project SHALL prompt for a repository directory and update the active project root.
New Window SHALL open a new editor window.

#### Scenario: Switch project from menu
- **WHEN** a user selects Switch Project from the application menu
- **THEN** the editor prompts for a new repository and updates the active project context

### Requirement: Cell-Owned HIL Index
The editor SHALL store human-in-loop artifacts in a cell-owned HIL index under `.agency/cells/<cellId>/hil/index.yaml`.
The HIL index SHALL be YAML and mergeable, and SHALL contain items of kind `comment`, `memo`, or `draft`.
Each HIL item SHALL include `meta.processed`, defaulting to `false` unless explicitly set.

#### Scenario: Store a comment in HIL index
- **WHEN** a user submits a line comment
- **THEN** the editor appends a `comment` item to the HIL index for the active cell
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
The drawer SHALL use `Memo` as the primary user-facing artifact noun, while `HIL` remains an internal/storage term.
The drawer SHALL NOT mix unrelated panel metaphors for the same artifact system.

#### Scenario: Auto-open drawer after comment
- **WHEN** a user submits a line comment
- **THEN** the right-side drawer opens to show the Comments panel

#### Scenario: Drawer terminology stays coherent
- **WHEN** a user switches between Comments, Drafts, and Memo-facing HIL surfaces
- **THEN** the chrome keeps one consistent Memo vocabulary
- **AND** the surface does not rename the same artifact family with unrelated labels

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active cell and allow filtering by kind and status.
Memo file references SHALL provide unified `open` and `reveal` entry points.
Memo SHALL support lightweight drag routing into Explorer import flows in phase 1.
The Memo surface SHALL present artifact navigation, capture shortcuts, and draft review as one coherent workspace.
Explorer and Memo side-surface headers SHALL keep current context and state legible without redundant explanatory subtitle copy.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor shows the HIL list for the current cell
- **AND** the navigation, capture, and draft affordances read as one Memo workspace instead of disconnected sub-tools

#### Scenario: Side-surface headers stay concise
- **WHEN** a user opens Explorer or Memo
- **THEN** the header foregrounds the active root or record summary
- **AND** avoids redundant instructional subtitle text when current context and state can already be read directly from the controls and summary chips

### Requirement: Comment Surface Hierarchy
The Comments surface SHALL keep the compose action, file context, snippet evidence, and comment list readable without collapsing into a generic dense tool card.
The Comments surface SHALL make the current file/line, compose state, and submit action legible before secondary metadata.

#### Scenario: Comment compose path stays obvious
- **WHEN** a user opens comment compose from the HIL surface
- **THEN** the UI clearly separates current file context, captured snippet evidence, note input, and submit controls
- **AND** micro-labels do not carry the primary comprehension burden

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
Screenshot memo assets SHALL be stored as PNG under `.agency/cells/<cellId>/hil/assets/` with a stable path recorded in the memo metadata.

#### Scenario: Persist screenshot asset
- **WHEN** a screenshot memo is created
- **THEN** the image asset is saved under the owning cell assets directory as a PNG

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
The Promote flow SHALL provide two execution modes:
- `Quick` (default): one-step draft creation and direct structured dispatch.
- `Gated` (advanced): Action Sheet-linked execution with gate tracking.
The Promote UI SHALL use unified send semantics with explicit source/mode metadata.
The Promote UI SHALL make the primary path legible in this order: selected records, target session, execution mode, and confirmation state.

#### Scenario: Start quick promote dispatch
- **WHEN** a user starts Promote in quick mode with selected items and target session
- **THEN** a structured send is dispatched directly
- **AND** the run is tagged with `source=promote` and `mode=quick`

#### Scenario: Promote hierarchy stays legible
- **WHEN** a user opens the Promote modal
- **THEN** the UI makes it obvious what will be sent, where it will run, and whether the draft is ready to confirm
- **AND** lower-priority metadata does not visually compete with the primary action path

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
- **THEN** the editor writes comments and memos under `.agency/cells/<cellId>/hil/items/<kind>/`
- **AND** writes drafts under `.agency/cells/<cellId>/hil/drafts/`
- **AND** updates `.agency/cells/<cellId>/hil/index.yaml`

### Requirement: Legacy Comment Migration
If legacy comment storage exists, the editor SHALL import those comments into the HIL index non-destructively.

#### Scenario: Migrate legacy comments
- **WHEN** a worktree contains `.agency/comments-<worktree>.yaml`
- **THEN** the editor imports comments into the owning cell HIL index and leaves the legacy file intact

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
Comments MUST be stored as `comment` items in the owning cell HIL index.
The comment payload SHOULD capture structured metadata for future threading and status updates.

#### Scenario: Comment schema metadata
- **WHEN** a comment is stored
- **THEN** the comment includes a stable id, thread id, status, and creation metadata

#### Scenario: Submit a line comment
- **WHEN** a user submits a comment on a specific line
- **THEN** the editor appends the comment to the owning cell HIL index

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
The editor SHALL record execution status on draft metadata with source/mode context.
For gated mode, completion gating SHALL require `meta.promoted: true` AND `meta.executionStatus: complete` before final confirmation.

#### Scenario: Track quick promote status
- **WHEN** quick dispatch is initiated and acknowledged
- **THEN** metadata records mode-aware status transitions and timestamps

#### Scenario: Gate waits for completion in gated mode
- **WHEN** gated run is in progress
- **THEN** final confirmation remains disabled until completion criteria are satisfied

### Requirement: Promote Prompt Bundle
The editor SHALL generate a prompt bundle that includes the draft description, selected item references, and file anchors.
The prompt bundle SHALL be stored alongside the draft metadata for auditability.

#### Scenario: Prompt bundle stored
- **WHEN** Promote starts
- **THEN** the draft metadata stores the prompt bundle that was dispatched

### Requirement: Screenshot Routing After Capture
After capture, the editor SHALL present a routing panel that lets the user choose:
- Target project/worktree + Cell (save to HIL)
- Clipboard-only
- Save to HIL and clipboard

#### Scenario: Route capture to HIL
- **WHEN** a user completes a capture and selects a target Cell
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
Each contextual variant SHALL preserve the same Memo/HIL visual language and hierarchy quality.

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
- **AND** the drawer shows Inbox shortcuts for Flash, Excerpt, and Screenshot capture
- **AND** the drawer provides an Open Inbox entry
- **AND** the Memo main Inbox sections remain available in the main pane

#### Scenario: Contextual panels still feel like one system
- **WHEN** the user moves between Agent Cells, Memo, Explorer, and Action Sheets
- **THEN** the HIL surfaces retain one coherent visual language, spacing rhythm, and status treatment
- **AND** they do not degrade into unrelated card collections

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
Terminus settings SHALL be stored in new files (`terminus-settings.json` for Global, `.agency/terminus-settings.yaml` for Project at the repository root, and `.agency/cells/<cell-id>/terminus-settings.yaml` for Agent).
Terminus shortcuts SHALL be configured per Terminus profile and only apply to the active profile.
No backward compatibility with legacy shortcut behavior is required.

#### Scenario: Resolve scoped settings
- **WHEN** a user defines a Terminus profile shortcut binding in Project scope that shares an id with a Global binding
- **THEN** the Project binding is used for the active profile in that Cell

#### Scenario: Agent overrides project
- **WHEN** an Agent scope binding shares the same id as a Project binding
- **THEN** the Agent binding is used for that Agent's active profile

#### Scenario: Project settings remain available without worktree attachment
- **WHEN** the selected Cell has no live worktree attachment but the project root is still known
- **THEN** Project scope Terminus settings still resolve from the repository root

### Requirement: Baseline Terminal Profile
The editor SHALL include a baseline plain-shell profile in Terminus settings.
The baseline profile MUST be visible in the Terminus configuration view and MUST NOT be deletable.

#### Scenario: Baseline profile is present
- **WHEN** a user opens the Terminus configuration view
- **THEN** the plain-shell profile is listed and cannot be removed

### Requirement: Shortcut Interception Defaults
The editor SHALL NOT intercept keyboard shortcuts unless explicitly configured in Terminus settings for the active profile, except for documented baseline terminal compatibility behaviors that preserve cross-platform modifier keys.

#### Scenario: Baseline modifier behaviors
- **WHEN** a user presses Shift+Enter in the terminal and no Terminus bindings are configured for the active profile
- **THEN** the terminal receives the baseline Shift+Enter behavior documented for the editor's terminal compatibility layer.

### Requirement: Shortcut Input Dispatch
The editor SHALL route configured Terminus shortcut bindings through a centralized terminal input dispatcher that sends explicit input actions (e.g., text or key sequences) to the active session.

#### Scenario: Dispatch a configured shortcut
- **WHEN** a user triggers a configured shortcut binding
- **THEN** the dispatcher sends the defined input action to the active session

### Requirement: App Shortcuts Configuration
The editor SHALL provide App Shortcuts configuration at Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
App Shortcuts SHALL be stored in new files (`app-shortcuts.json` for Global, `.agency/app-shortcuts.yaml` for Project at the repository root, and `.agency/cells/<cell-id>/app-shortcuts.yaml` for Agent).
App Shortcuts SHALL be defined as a fixed action list that users configure (no add/remove).

#### Scenario: Configure an app shortcut
- **WHEN** a user opens App Shortcuts in Hierarchy
- **THEN** the editor displays the full action list with per-action configuration

#### Scenario: Resolve app shortcut overrides
- **WHEN** a Project app shortcut entry shares an id with a Global entry
- **THEN** the Project entry is used for the active Cell

#### Scenario: Project app shortcuts remain available without worktree attachment
- **WHEN** the selected Cell has no live worktree attachment but the project root is still known
- **THEN** Project scope App Shortcuts still resolve from repository-root storage

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

### Requirement: Terminal Keyboard Protocol Fidelity
The editor SHALL preserve modifier-specific key sequences for Shift+Enter via a renderer-side handler.
The editor SHALL prefer bracketed-paste newline when bracketed paste mode is enabled.
The editor SHALL avoid collapsing Shift+Enter into plain Enter when the handler is active and no shortcut binding matches.

#### Scenario: Modifier-aware Enter
- **WHEN** a user presses Shift+Enter and no shortcut binding matches
- **THEN** the input stream includes bracketed-paste newline (`\x1b[200~\n\x1b[201~`) if enabled
- **AND** otherwise falls back to CSI-u (`\x1b[13;2u`)
- **AND** CLI tools receive the modifier-aware sequence unchanged

#### Scenario: Fallback to standard Enter
- **WHEN** the handler is not active or a shortcut binding handles the key
- **THEN** the terminal sends standard Enter sequences without additional modifiers

### Requirement: Global Session Map Overlay
The editor SHALL provide a global map overlay that is available across all main screens and is anchored to the status bar.

#### Scenario: Open map from any screen
- **WHEN** a user clicks the map entry in the status bar
- **THEN** the map overlay is shown without leaving the current screen

### Requirement: Cell and Session Map Representation
The editor SHALL render Cells as faction clusters and Sessions as role tokens, including offline states for archived/closed/stale sessions.

#### Scenario: Offline session visibility
- **WHEN** a session is archived, closed, or stale
- **THEN** the map displays it as an offline state distinct from active sessions

### Requirement: Session Navigation from Map
The editor SHALL allow users to jump to a session by clicking its token in the map, without leaving the current screen.
Session Map SHALL also provide unified file `open` and `reveal` entry points where file shortcuts are available.
Session Map SHALL support lightweight drag routing into Explorer import flows in phase 1.

#### Scenario: Jump to session
- **WHEN** a user clicks a session token
- **THEN** the editor selects the corresponding Cell and session while keeping the current view

#### Scenario: Open file from map shortcut
- **WHEN** a user triggers a file shortcut from Session Map
- **THEN** the editor opens the file through the unified file interaction contract

#### Scenario: Drag map file shortcut into Explorer
- **WHEN** a user drags a file shortcut from Session Map into Explorer
- **THEN** the editor routes the drop to Explorer `import_copy` and reports structured results

### Requirement: Session Hover Preview
The editor SHALL show a live terminal preview on hover and allow jumping from the preview.

#### Scenario: Hover preview jump
- **WHEN** a user clicks the terminal preview shown on hover
- **THEN** the editor selects the corresponding Cell and session

### Requirement: Session Attach Lifecycle Management
The editor SHALL centralize session attach/detach behavior in a session-level manager that supports preview, capture, and terminal interactions without breaking idle tracking.

#### Scenario: Lazy attach for preview
- **WHEN** a session preview is requested and the session is not attached
- **THEN** the system attaches the session long enough to capture a preview and may detach after the capture completes

#### Scenario: Idle-based attach GC
- **WHEN** a session has been idle beyond the configured threshold and has no active interactive client
- **THEN** the system detaches its attach client to reclaim resources
- **AND WHEN** an interaction occurs (preview/click/terminal focus)
- **THEN** the session is reattached immediately

#### Scenario: Attach does not reset idle
- **WHEN** the system attaches or detaches a session for preview or capture
- **THEN** the idle timer is not reset by that attach activity

### Requirement: Map Auto-Open
The editor SHALL auto-open the map on first entry per project.

#### Scenario: First entry
- **WHEN** a user opens the editor for a project for the first time
- **THEN** the map overlay is shown by default

### Requirement: Faction Color Defaults and Overrides
The editor SHALL derive default faction colors from Cell type and creation order, and allow configuration overrides.

#### Scenario: Color override
- **WHEN** a project defines faction color overrides
- **THEN** the map uses the configured colors instead of defaults

### Requirement: Map Summary Stats
The editor SHALL show summary counts for cells and sessions, including online/offline totals.

#### Scenario: Large map overview
- **WHEN** the map overlay is open
- **THEN** the summary counts are visible without scrolling

### Requirement: Session Lifecycle Activity Tracking
The editor SHALL keep session activity/idle time tracking running regardless of view switches or panel visibility.

#### Scenario: Idle tracking across views
- **WHEN** the user switches views or closes panels (including Session Map or Explorer)
- **THEN** session idle time continues to update based on terminal I/O activity

#### Scenario: Idle vs visited semantics
- **WHEN** the session output stream changes
- **THEN** idle time resets based on output updates (input-only events do not reset idle)
- **AND WHEN** the user explicitly switches to a session
- **THEN** the UI MAY show a separate `visited` timestamp to avoid ambiguity
- **AND WHEN** an attach happens for preview or capture
- **THEN** the system ignores attach noise within a one-minute grace window

### Requirement: Preview Cache and Snapshot Storage
The editor SHALL cache the most recent session previews and persist snapshots under `.agency/` for fast hover rendering.

#### Scenario: Preview cache on hover
- **WHEN** a user hovers a session
- **THEN** the UI shows the latest cached preview immediately and refreshes it asynchronously

#### Scenario: Snapshot storage
- **WHEN** a session snapshot is captured
- **THEN** the snapshot is written under `.agency/` and can be reused on the next app launch

### Requirement: Session Avatar Customization
The editor SHALL allow users to customize session avatars using the bundled open-agent-avatars catalog.

#### Scenario: Change session avatar
- **WHEN** a user selects a new avatar from the session map or session tabs
- **THEN** the session avatar is updated and reflected across the UI

### Requirement: Hover Preview Action Bar
The editor SHALL provide a non-click-through info bar under the hover preview with rename and avatar actions.

#### Scenario: Rename from hover preview
- **WHEN** a user edits the session name in the hover info bar
- **THEN** the session name updates without triggering a jump

### Requirement: Map Session Creation
The editor SHALL allow creating sessions from within a Cell group in the session map, including Terminus profiles.

#### Scenario: Create session from map
- **WHEN** a user chooses a profile from the map cell menu
- **THEN** a new session is created for that Cell using the selected profile

### Requirement: Session Auto Naming Rules
The editor SHALL allow configuring an auto-naming rule for new sessions using placeholder tokens.
The editor SHALL resolve session naming rules by Global -> Project -> Agent scope, with Agent overrides winning.
When a new session is created without an explicit name, the editor SHALL generate a name using the resolved rule.
The editor SHALL support time/date placeholders and sequence counters with optional zero-padding.
The editor SHALL support name lists for template substitution and allow user-defined lists in settings.
If the generated name conflicts with an existing session name in the same Cell, the editor SHALL append a numeric suffix until the name is unique.

#### Scenario: Generate name from rule
- **WHEN** a user creates a new session without providing a name
- **AND** the resolved rule is `"Session {seq:absolute:02} · {time:HHmm}"`
- **THEN** the editor creates a name like `"Session 03 · 1425"`

#### Scenario: Scope overrides
- **WHEN** Global and Project rules are configured
- **AND** the Project rule differs from Global
- **THEN** new sessions use the Project rule

#### Scenario: Name list substitution
- **WHEN** the resolved rule contains `{name:myth:absolute}`
- **THEN** the editor selects the myth name based on the absolute sequence index (wrapping as needed)

### Requirement: Terminal Selection Actions
The terminal view SHALL allow users to select text and keep the selection after mouse release.
When a selection exists, the editor SHALL allow copying the selection via `Cmd+C` on macOS.
When a selection exists, the editor SHALL show a floating action bar with Copy and Send-to-Session actions.
Send-to-Session SHALL dispatch the selected text to a user-chosen session without closing the current view.

#### Scenario: Selection persists
- **WHEN** a user drags to select terminal text and releases the mouse
- **THEN** the selection remains visible until cleared or replaced

#### Scenario: Copy selection
- **WHEN** a selection exists in the terminal
- **AND** the user presses `Cmd+C`
- **THEN** the selected text is copied to the system clipboard

#### Scenario: Send selection to another session
- **WHEN** a selection exists and the user chooses Send-to-Session
- **THEN** the selected text is sent to the chosen session

### Requirement: Cmd+Click path navigation
The editor SHALL allow users to Cmd+Click file paths in terminal output to open the file.
The editor SHALL support absolute and worktree-relative paths with optional `:line[:column]` suffixes.
The editor SHALL ignore trailing punctuation characters when resolving the path.

#### Scenario: Open file with line number
- **WHEN** a terminal line contains `docs/notes-terminal-keyboard.md:11`
- **AND** the user Cmd+Clicks the path
- **THEN** the editor opens `docs/notes-terminal-keyboard.md` at line 11

#### Scenario: Ignore punctuation
- **WHEN** a terminal line contains `行为说明。docs/notes-terminal-keyboard.md:11` 
- **THEN** the resolved path is `docs/notes-terminal-keyboard.md` (excluding `行为说明。`)

### Requirement: Session Reply Relay
The editor SHALL provide a session-side Reply panel for creating session-owned reply artifacts.
The editor SHALL store replies outside HIL with explicit session ownership and isolate reply threads per session.
The editor SHALL NOT surface session replies as editable items inside the main Memo view.

#### Scenario: Reply panel default
- **WHEN** a user opens a session
- **THEN** the right-side panel defaults to Reply

### Requirement: Reply editor and actions
The editor SHALL provide a rich markdown editor for reply input.
The editor SHALL support `Record`, `Send to Current`, and `Send to Other` actions.

#### Scenario: Record reply
- **WHEN** a user submits a reply with `Record`
- **THEN** the reply is saved as a session reply artifact without sending terminal input

#### Scenario: Send reply to current session
- **WHEN** a user submits a reply with `Send to Current`
- **THEN** the reply is saved as a session reply artifact and sent to the active session

### Requirement: Reply metadata
The editor SHALL record source site and query for replies in metadata.
The editor SHALL record selection time (or a fixed tag when no selection) instead of line numbers.
The editor SHALL record the authoring cell/session and timestamp.

#### Scenario: Reply metadata recorded
- **WHEN** a reply is created
- **THEN** its artifact metadata includes source, selection time tag, and session identifiers

### Requirement: Session Reply Artifact Storage
The editor SHALL store session reply artifacts in a cell-owned reply store separate from HIL.
The reply store SHALL keep an index under `.agency/cells/<cellId>/session-replies/index.yaml`.
Each reply artifact SHALL record explicit owner metadata for `cellId` and `sessionId`.

#### Scenario: Persist a recorded reply
- **WHEN** a user records a reply from Session Reply
- **THEN** the editor writes a reply artifact into the owning cell reply store
- **AND** the stored artifact records the owning `cellId` and `sessionId`

#### Scenario: Invalid legacy reply rows are preserved until repair
- **WHEN** legacy HIL `reply` rows cannot be normalized into valid session ownership
- **THEN** the editor does not silently delete them during migration
- **AND** only successfully imported legacy reply rows are removed from the legacy HIL store

### Requirement: Session Reply Storage Tree Layout
The editor SHALL store session reply artifacts under a session-owned tree layout while keeping the cell-owned reply index as the source of truth.

#### Scenario: Write reply artifact files
- **WHEN** a session reply artifact is created
- **THEN** the editor updates `.agency/cells/<cellId>/session-replies/index.yaml`
- **AND** writes the artifact under `.agency/cells/<cellId>/session-replies/sessions/<sessionId>/<replyId>.yaml`

### Requirement: Session Delivery References Reply Artifacts
When Session Reply triggers delivery, the resulting delivery draft SHALL reference the reply artifact rather than pretending the reply is a HIL item.

#### Scenario: Delivery references a reply artifact
- **WHEN** a user sends a reply through Session Reply quick delivery
- **THEN** the delivery draft stores a source reference with `system=reply`
- **AND** the target delivery draft remains a HIL `draft` artifact

### Requirement: Send-result cards
The editor SHALL display send-result cards in the Reply panel.
Each card SHALL show the target avatar and provide a jump link to the destination.
Record-only cards SHALL show a memo icon and jump link to the stored memo.

#### Scenario: Send-result card
- **WHEN** a reply is sent to another session
- **THEN** a card shows the target avatar and a navigation link

### Requirement: Session List Order Preservation
The editor SHALL preserve the session ordering as stored in the cell/session registry and not apply additional sorting in the Agent Cells list.

#### Scenario: Keep registry order
- **WHEN** multiple sessions are listed under a Cell
- **THEN** the ordering matches the registry without active/idle reordering

### Requirement: Session Idle Indicators in List
The editor SHALL display each session's idle duration directly in the session list item.

#### Scenario: Idle visible per session
- **WHEN** the session list is shown
- **THEN** each session entry shows its idle time (or a placeholder if unknown)

### Requirement: Activity Ring Fades with Idle
The editor SHALL render the avatar ring as green when active and gradually fade it toward the inactive color as idle time increases, reaching the most inactive color at 15 minutes.

#### Scenario: Ring reflects idle progression
- **WHEN** a session has been idle for increasing durations
- **THEN** the avatar ring color interpolates from active green toward the inactive color

### Requirement: Unified Avatar Badge
The editor SHALL render agent/session avatars through a shared badge component to keep idle rings and closed-state styling consistent across views.

#### Scenario: Consistent avatar styling
- **WHEN** avatars are rendered in the sidebar, editor header, session map, explorer footer, or picker
- **THEN** they use the same badge component and ring logic

### Requirement: Per-Cell Session Creation Entry
The editor SHALL provide a new session action on each Cell entry in the Agent Cells view.

#### Scenario: Create session from Cell node
- **WHEN** a user opens the new-session menu on a Cell
- **THEN** the editor creates a session for that Cell (blank or profile)

### Requirement: Collapsible Session Lists
The editor SHALL allow each Cell's session list to be collapsed or expanded.

#### Scenario: Collapse sessions under a Cell
- **WHEN** a user toggles the collapse control on a Cell
- **THEN** the session list for that Cell is hidden or revealed

### Requirement: Pre-Attach Terminal Preview
The editor SHALL show cached session preview data and a connecting indicator before tmux attach completes, and disable terminal input until attach succeeds.

#### Scenario: Preview before attach
- **WHEN** a session is selected and tmux attach is still in progress
- **THEN** the terminal view shows the last cached preview with a connecting indicator
- **AND THEN** terminal input is disabled until attach succeeds

### Requirement: Detached Session Activity Polling
The editor SHALL periodically refresh detached sessions so idle indicators can reflect new output activity.

#### Scenario: Detached session receives new output
- **WHEN** a session is detached and new output arrives in tmux
- **THEN** the session idle time updates after the next refresh interval

### Requirement: Idle Updates Require Output Diff
The editor SHALL only update session activity timestamps when captured output differs from the previously cached content.

#### Scenario: Refresh without output changes
- **WHEN** the session list refreshes without any output diff
- **THEN** the session idle time does not reset

### Requirement: Workflow-focused selection actions
The editor SHALL show an advanced floating selection action menu that prioritizes workflow actions.
The menu SHALL include Send-to-Session and Create Memo actions.
The floating menu SHALL NOT include a Copy action.

#### Scenario: Selection actions available
- **WHEN** a user selects terminal text
- **THEN** the floating menu offers Send-to-Session and Create Memo
- **AND** Copy is not shown in the menu

### Requirement: Create memo from selection
The editor SHALL allow creating a memo from selected terminal text.

#### Scenario: Create memo
- **WHEN** a user selects terminal text and chooses Create Memo
- **THEN** a memo is created with the selected text

### Requirement: Idle based on output change threshold
The editor SHALL update a session's idle activity timestamp only when output changes exceed a character threshold.

#### Scenario: Ignore tiny changes
- **WHEN** a session output changes by fewer characters than the threshold
- **THEN** the session idle timestamp is not refreshed

#### Scenario: Record meaningful changes
- **WHEN** a session output changes by more characters than the threshold
- **THEN** the session idle timestamp is refreshed

### Requirement: Editor TypeScript Foundation
The editor SHALL provide a TypeScript foundation in `apps/editor` with a project tsconfig entrypoint and a standard typecheck command.

#### Scenario: Typecheck command is available
- **WHEN** a developer runs `pnpm -C apps/editor typecheck`
- **THEN** TypeScript project checks execute via `tsc --noEmit`.

### Requirement: Renderer Ambient Runtime Types
The editor SHALL provide ambient type declarations required for typed renderer code to access runtime globals safely.

#### Scenario: Renderer global bridge typing exists
- **WHEN** TypeScript code in renderer accesses `window.agency`
- **THEN** the symbol resolves through project ambient declarations without implicit-any global errors.

### Requirement: High-Leverage Runtime Decomposition
The editor SHALL decompose high-leverage runtime modules into smaller reusable units before broad TS conversion.

#### Scenario: Session hook helper extraction
- **WHEN** session lifecycle code is maintained
- **THEN** deterministic helper logic is hosted in dedicated reusable modules instead of one monolithic hook file.

#### Scenario: Voice hook helper extraction
- **WHEN** voice capture behavior is maintained
- **THEN** reusable helper logic is hosted in dedicated modules while preserving hook behavior.

### Requirement: App Layout View Composition Split
The editor SHALL split large layout view orchestration into composable components with stable integration props.

#### Scenario: Existing App integration remains valid
- **WHEN** `App.tsx` renders `AppLayout`
- **THEN** existing feature views (Agent Cells, Explorer, Hierarchy, Memo, Action Sheets) remain reachable through stable props.

### Requirement: Shared Session Naming Rule Engine
The system SHALL maintain one canonical session naming rule parser/formatter reused by both Electron main process and renderer consumers.

#### Scenario: Renderer and main produce consistent session names
- **GIVEN** the same naming rule, sequence values, name lists, context, and timestamp
- **WHEN** main and renderer format a session name
- **THEN** they produce identical formatted output

#### Scenario: Shared naming defaults stay aligned
- **GIVEN** no user overrides for rule and name lists
- **WHEN** settings are normalized in main and renderer
- **THEN** both use the same default rule and default name lists

### Requirement: Shared Path Safety Utilities
The system SHALL use shared path utilities for relative path normalization and root-boundary-safe resolution in Electron services and preload fallbacks.

#### Scenario: Backslash and trailing separator normalization
- **GIVEN** a relative path containing Windows separators and trailing slashes
- **WHEN** the path is normalized
- **THEN** the result uses forward slashes and no trailing separators

#### Scenario: Root escape rejection
- **GIVEN** a root path and a target path that escapes the root
- **WHEN** safe path resolution is attempted
- **THEN** the operation fails with a path-escape error

### Requirement: Shared Scoped Settings State Lifecycle
The system SHALL provide a reusable renderer state lifecycle utility for scoped settings (global/project/agent) including IPC availability guard, dirty tracking, saving status, and error handling.

#### Scenario: Scope dirty tracking is consistent
- **GIVEN** a scoped settings editor using the shared lifecycle utility
- **WHEN** a scope is updated locally
- **THEN** only that scope is marked dirty until explicitly cleared

#### Scenario: IPC unavailability feedback is consistent
- **GIVEN** IPC bridge is unavailable
- **WHEN** a scoped settings editor attempts to load or save
- **THEN** a consistent IPC unavailable error is set and operation short-circuits

### Requirement: Explorer External Drag Import
The Explorer SHALL accept external drag-drop entries from Finder and import them into the project tree.
The external drag import operation SHALL copy sources into the target directory and SHALL NOT move source files from Finder.
The Explorer SHALL preserve existing internal drag-move behavior for drags originating from Explorer rows.

#### Scenario: Import Finder file onto folder row
- **WHEN** a user drags a Finder file onto an Explorer folder row
- **THEN** the file is copied into that folder
- **AND** the tree refreshes to show the imported file.

#### Scenario: Import Finder folder recursively
- **WHEN** a user drags a Finder folder onto an Explorer folder row
- **THEN** the folder and its descendants are copied recursively into that target folder.

#### Scenario: Preserve internal drag-move behavior
- **WHEN** a user drags an Explorer row onto another folder row using internal drag payload
- **THEN** the editor keeps move semantics for that operation.

### Requirement: Explorer External Drop Target Resolution
The Explorer SHALL resolve external drop targets using deterministic rules:
- Drop on directory row -> that directory
- Drop on file row -> parent directory of that file
- Drop on blank list area -> focused directory if present, else focused file parent, else explorer root

#### Scenario: Blank-area drop with focused file
- **WHEN** a user drops Finder entries on blank Explorer list area while a file row is focused
- **THEN** the import target is the focused file's parent directory.

#### Scenario: Blank-area drop without focus
- **WHEN** a user drops Finder entries on blank Explorer list area and no row is focused
- **THEN** the import target is the explorer root directory.

### Requirement: Conflict-Safe External Import Naming
The Explorer SHALL never overwrite existing entries during external drag import.
When an imported entry name conflicts with an existing target entry, the editor SHALL auto-resolve using a numeric suffix pattern (`name (1)`, `name (2)`, ...) and preserve file extension for files.

#### Scenario: Same-name file import
- **WHEN** `report.md` already exists in target and a Finder file named `report.md` is dropped
- **THEN** the imported file is written as `report (1).md` (or next available index)
- **AND** existing `report.md` remains unchanged.

### Requirement: External Import Failure Isolation and Reporting
The external drag import flow SHALL process independent source paths without aborting all imports on first failure.
The system SHALL report a structured result that distinguishes successful imports, skipped items, and per-item failures.

#### Scenario: Partial failure import
- **WHEN** one dropped source path is unreadable and another is valid
- **THEN** the valid source is imported
- **AND** the unreadable source is reported as a failure without canceling the whole operation.

### Requirement: Unified File Interaction Contract
The editor SHALL provide a unified file interaction contract for Explorer, Agent Cells, Session Map, and Memo.
The contract MUST support action intents `open`, `reveal`, `import_copy`, `move`, `copy`, and `delete`.
All intent executions MUST return a normalized result containing success state, affected paths, warnings, and failures.

#### Scenario: Consistent intent result across surfaces
- **WHEN** the same file intent is triggered from different surfaces
- **THEN** the editor returns the same result schema and error categories
- **AND** surfaces render consistent success and failure semantics

#### Scenario: Invalid intent payload
- **WHEN** an intent request has an invalid path or unsupported payload
- **THEN** the editor returns a structured `UserError` failure without crashing the surface

### Requirement: Cross-Surface File Entry Points
The editor SHALL provide file entry points from Agent Cells, Session Map, and Memo using the unified file interaction contract.
Phase 1 entry points MUST include `open` and `reveal`.

#### Scenario: Open from Session Map
- **WHEN** a user triggers a file shortcut from Session Map
- **THEN** the editor opens the target file in the workbench via the unified contract

#### Scenario: Reveal from Memo reference
- **WHEN** a user requests reveal for a Memo file reference
- **THEN** the editor focuses Explorer and reveals/selects the target path

### Requirement: Lightweight Cross-Surface Drop Routing
The editor SHALL support lightweight drag routing from Session Map and Memo into Explorer for copy-import behavior.
The routed drop flow MUST reuse Explorer import conflict handling and path safety checks.

#### Scenario: Route drop into Explorer import
- **WHEN** a user drags a file reference from Session Map or Memo into Explorer
- **THEN** the editor executes `import_copy` via the unified contract
- **AND** naming conflicts are resolved with the existing conflict-safe naming strategy

#### Scenario: Reject unsupported routed drop
- **WHEN** routed drop payload cannot resolve to valid source paths
- **THEN** the editor reports a structured recoverable failure and does not mutate filesystem state

### Requirement: Agent File Semantics Registry
The editor SHALL classify files with agent semantics using built-in rules and optional project-level extension rules.
Project-level semantic rules SHALL be loaded from `.agency/agent-files.yaml`.
Each semantic rule SHALL support `id`, `label`, optional `icon`, `priority`, `matcherType`, and `matcherExpr`.

#### Scenario: Built-in semantic classification
- **WHEN** Explorer evaluates known agent files such as `Agency.md` and Spark convention files
- **THEN** the editor assigns built-in semantic tags for those files

#### Scenario: Project rule merge
- **WHEN** project-level semantic rules exist in `.agency/agent-files.yaml`
- **THEN** the editor merges built-in and project rules deterministically by priority
- **AND** project rules can extend or override tag presentation

### Requirement: Agent File Affordance and Discoverability
Explorer SHALL expose semantic-file affordances without restructuring the filesystem tree.
Affordances MUST include tag/highlight display and semantic filtering.

#### Scenario: Semantic tag in tree row
- **WHEN** a visible file matches one or more semantic rules
- **THEN** Explorer shows semantic tag/highlight metadata on that file row

#### Scenario: Semantic filter
- **WHEN** a user enables a semantic filter
- **THEN** Explorer narrows visible entries to matching files and required ancestor paths

### Requirement: Explorer Tool-Capable File Interfaces
The editor SHALL expose Explorer-grade file interaction capabilities as tool-capable interfaces for Agent workflows.
Tool-invoked file intents MUST use the same gateway, validation, and result schema as UI-invoked file intents.
Tool invocations MUST include caller metadata and enforce capability-scoped authorization.
The gateway contract SHOULD remain CLI-friendly (JSON request/response) so CLI wrappers can call the same semantics without duplicating logic.

#### Scenario: Tool-invoked import follows Explorer semantics
- **WHEN** an Agent workflow invokes `import_copy` via tool interface
- **THEN** the editor applies the same conflict-safe naming and path-safety rules as Explorer UI import
- **AND** returns the normalized file intent result schema

#### Scenario: Unauthorized tool intent
- **WHEN** a tool caller lacks permission for a requested file intent
- **THEN** the editor rejects the request with a structured permission failure
- **AND** no filesystem mutation occurs

### Requirement: Process-Boundary Ready File Interaction Gateway
The unified file interaction gateway SHALL remain caller-agnostic so that renderer workflows and future dedicated Agency helper processes can use the same contracts.
Gateway behavior MUST remain consistent regardless of caller transport.

#### Scenario: Equivalent results across caller transports
- **WHEN** the same file intent is invoked by renderer-side workflow and process-boundary workflow
- **THEN** the editor returns equivalent success/failure semantics and affected path reporting

### Requirement: Electron TypeScript Build Foundation
The editor SHALL provide an Electron runtime TypeScript build foundation that compiles TS entrypoints into runnable JS artifacts for development, testing, and packaging flows.

#### Scenario: Electron runtime build command exists
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** Electron runtime artifacts are emitted to the configured build output
- **AND** entry launch paths resolve compiled runtime modules.

#### Scenario: Dev and package flows enforce Electron prebuild
- **WHEN** developers run dev/e2e/package scripts
- **THEN** Electron runtime build step executes before launching Electron main process.

### Requirement: Electron Entrypoint Structural Decomposition
The editor SHALL keep Electron entrypoint behavior stable while decomposing entrypoint responsibilities into focused modules to reduce complexity and improve maintainability.

#### Scenario: Main process responsibilities are modularized
- **WHEN** startup timeline, menu setup, and IPC setup logic are maintained
- **THEN** they are defined in focused modules instead of one monolithic entry implementation.

#### Scenario: Preload bridge binding uses reusable patterns
- **WHEN** new IPC bridge methods are added in preload
- **THEN** invoke/send/subscribe bindings reuse shared helper patterns rather than repeated ad-hoc wrappers.

### Requirement: TypeScript-First Editor Tooling Layer
The editor SHALL execute supported development/build/test tooling entrypoints from TypeScript sources to maintain a consistent language baseline.

#### Scenario: Script entrypoints run from TypeScript sources
- **WHEN** developers run editor tooling commands (dev/build/test)
- **THEN** the configured script entrypoints resolve to TypeScript files with equivalent behavior to pre-migration flows.

### Requirement: Explicit JS Compatibility Exceptions
The editor SHALL keep a documented, minimal set of JS/CJS compatibility exceptions only where runtime/tooling integration requires it.

#### Scenario: Remaining JS files are intentional
- **WHEN** the migration is complete
- **THEN** remaining JS/CJS files are limited to documented compatibility cases and not general feature implementation paths.

### Requirement: Typed Electron IPC Handler Layer
The editor SHALL compile the Electron IPC handler layer from TypeScript source to improve maintainability of renderer-main process contracts.

#### Scenario: IPC handlers compile through Electron TS build
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** all IPC handler modules under `electron/ipc/handlers` compile successfully from TypeScript source.

### Requirement: IPC Contract Behavior Parity During Handler TS Migration
The editor SHALL preserve existing IPC channel names and runtime semantics while migrating handlers to TypeScript.

#### Scenario: Existing renderer IPC calls remain valid
- **WHEN** renderer invokes existing IPC channels
- **THEN** handlers respond with behavior compatible with the pre-migration implementation.

### Requirement: Typed Electron Service Layer
The editor SHALL compile Electron service modules from TypeScript source to improve maintainability of main-process runtime logic.

#### Scenario: Electron services compile through TS pipeline
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** service modules under `apps/editor/electron/services` compile successfully from TypeScript source.

### Requirement: Electron Service Behavior Parity During TS Migration
The editor SHALL preserve existing Electron service runtime semantics while migrating service files to TypeScript.

#### Scenario: Existing IPC service integrations remain compatible
- **WHEN** IPC handlers call existing service functions after migration
- **THEN** the runtime behavior remains compatible with the pre-migration implementation.

### Requirement: Terminal Mouse + Selection Compatibility
The editor SHALL provide terminal mouse interaction, modifier key combos, and text selection simultaneously, without requiring global tradeoffs.

#### Scenario: Mouse interaction by default
- **WHEN** a user clicks or scrolls in a terminal with a TUI that enables mouse reporting
- **THEN** mouse interactions are delivered to the TUI by default.

#### Scenario: Force selection with modifier
- **WHEN** a user holds the selection modifier (Shift or Alt) and drags to select text
- **THEN** mouse reporting is temporarily disabled for that session and text selection succeeds in the terminal.

#### Scenario: Restore mouse after selection
- **WHEN** the selection drag ends or selection is cleared
- **THEN** mouse reporting returns to its default enabled state for that session.

### Requirement: Modifier-Based Scrollback Override
The editor SHALL allow users to force local scrollback even when mouse reporting is enabled.

#### Scenario: Alt/Option scrolls local buffer
- **WHEN** a user holds Alt/Option and scrolls the mouse wheel
- **THEN** the terminal scrollback moves locally without sending wheel events to the TUI.

### Requirement: Reply Quick Prompt Scoped Configuration
The editor SHALL provide Reply Quick Prompt configuration in Hierarchy with Global, Project, and Agent scopes.
The editor SHALL persist prompt lists per scope using the repo-owned scoped-config conventions shared by other Hierarchy settings.

#### Scenario: Open Reply Quick Prompts in Hierarchy
- **WHEN** a user navigates to Hierarchy configuration
- **THEN** a Reply Quick Prompts section is available
- **AND** users can switch between Global, Project, and Agent scopes.

#### Scenario: Save scoped prompts
- **WHEN** a user edits prompt items in a scope and saves
- **THEN** the prompt list is persisted for that scope and reloads correctly.

### Requirement: Reply Quick Prompt Resolution Uses Union + Dedupe
The editor SHALL resolve effective Reply Quick Prompts by computing the ordered union of Global, Project, and Agent lists.
The editor SHALL deduplicate prompts by normalized prompt text instead of overriding by scope.
The first occurrence in scope order (Global -> Project -> Agent) SHALL be canonical for display text, while later duplicates SHALL still contribute source metadata.

#### Scenario: Duplicate prompt across scopes
- **WHEN** the same prompt text exists in both Global and Agent scopes
- **THEN** the effective prompt list contains one entry for that text
- **AND** the entry records both scopes as sources.

#### Scenario: Scope-specific additions preserved
- **WHEN** each scope contributes different prompt texts
- **THEN** the effective prompt list includes all unique prompts in stable scope order.

### Requirement: Hierarchy Shows Resolved Prompt Sources
The editor SHALL show a resolved prompt preview in the Hierarchy Reply Quick Prompts view.
Each resolved prompt SHALL show source scope badges to explain dedupe/union results.

#### Scenario: Visualize merged source badges
- **WHEN** a resolved prompt is contributed by multiple scopes
- **THEN** the Hierarchy resolved list shows all contributing scope badges for that prompt.

### Requirement: Reply Composer Quick Prompt Entry
In Agent Cells Reply panel, the editor SHALL provide a quick prompt action labeled `快捷回复如何` near the reply input controls.
The action SHALL open the resolved prompt list and allow inserting a selected prompt into the reply editor.

#### Scenario: Insert prompt from quick action
- **WHEN** a user selects a prompt from `快捷回复如何`
- **THEN** the prompt text is inserted into the Reply editor at the cursor position
- **AND** the Reply editor remains focused for further editing.

### Requirement: Unified Multi-Source Send Semantics
The editor SHALL treat Promote, Explorer send, and session quick-dialog send as one delivery system with different sources.
Delivery metadata SHALL include source identifiers for audit and filtering.

#### Scenario: Promote, Explorer, and session quick-dialog share delivery protocol
- **WHEN** Promote, Explorer, or Session Reply send triggers a delivery
- **THEN** all runs use the same delivery start/confirm/status lifecycle contract
- **AND** each run records its source (`promote`, `explorer`, or `session`)

### Requirement: Explorer Send Quick Default
Explorer selection send SHALL default to quick mode and dispatch without mandatory Action Sheet creation.

#### Scenario: Explorer quick send
- **WHEN** a user sends selected Explorer files with instruction text
- **THEN** the system dispatches a quick delivery run to the selected session
- **AND** marks the run as `source=explorer`, `mode=quick`

### Requirement: Optional Gated Explorer Send
Explorer send SHALL provide an optional gated mode for strict workflows.
Gated explorer runs SHALL use Action Sheet linkage and gate-aware status.

#### Scenario: Explorer gated send
- **WHEN** a user selects gated mode from Explorer send advanced options
- **THEN** the run is linked to an Action Sheet
- **AND** status follows gate-aware transitions

### Requirement: Delivery Payload Source/Mode Tagging
Quick and gated dispatch payloads SHALL include explicit source/mode tags and structured context references.

#### Scenario: Payload includes source/mode tags for all delivery sources
- **WHEN** any delivery run is dispatched
- **THEN** payload metadata includes source and mode fields
- **AND** references/anchors and session ownership fields are preserved for auditability

### Requirement: Quick Mode Immediate Consumption Policy
Quick runs SHALL consume source selections/items immediately after dispatch ACK.

#### Scenario: Quick ACK consumes source for Promote/Explorer/Session
- **WHEN** a quick run is acknowledged by host dispatch
- **THEN** source items are marked consumed immediately when applicable
- **AND** audit metadata records the ACK timestamp and session ownership context

### Requirement: Delivery Runtime Path Convergence
Renderer workflows for Promote and Explorer SHALL use the delivery facade APIs (`startDelivery`, `confirmDelivery`, `getDeliveryStatus`, `getDeliveryTimeline`) for delivery orchestration.
Renderer workflows SHALL NOT duplicate draft lifecycle state transitions that are already owned by the delivery domain module.

#### Scenario: Promote dispatch uses delivery APIs
- **WHEN** a user dispatches Promote
- **THEN** the renderer calls delivery facade APIs for run creation and status handling
- **AND** draft/audit records are produced by the shared delivery module

#### Scenario: Explorer dispatch uses delivery APIs
- **WHEN** a user dispatches Explorer send
- **THEN** the renderer calls delivery facade APIs for run creation and status handling
- **AND** quick and gated runs follow the same shared lifecycle primitives

### Requirement: Session Quick Delivery Persistence
Session quick-dialog sends SHALL be persisted as delivery runs under the unified delivery storage contract.
Each run SHALL carry session ownership metadata in record meta.

#### Scenario: Session Reply send creates unified delivery records
- **WHEN** a user sends content from Session Reply
- **THEN** the system creates a unified delivery run with `source=session`
- **AND** the record stores origin/target session ownership metadata in `meta`

#### Scenario: Session Reply send auto-confirms dispatch
- **WHEN** a user sends content from Session Reply
- **THEN** the system dispatches the reply to the target session and triggers one explicit confirm action
- **AND** the reply is not left as unsubmitted text in the target terminal by default

### Requirement: Explicit Dispatch Confirmation Semantics
Programmatic delivery and action-sheet dispatches SHALL use explicit confirm-key behavior for submit actions rather than relying only on raw newline-byte injection.

#### Scenario: Programmatic dispatch submits with explicit confirm behavior
- **WHEN** a delivery or action-sheet run is programmatically dispatched to a terminal session
- **THEN** the host sends the command text to the session
- **AND** submit confirmation is issued as explicit terminal key behavior

### Requirement: Shared Session-Input Dispatch Primitive
The editor SHALL expose one shared host-owned session-input dispatch primitive for programmatic terminal submissions.
Compatibility wrappers MAY preserve legacy caller shapes, but the canonical execution contract SHALL be semantic (`text`, `confirm strategy`, optional settle delay) rather than transport-shaped newline flags.

#### Scenario: Multiple send surfaces reuse one primitive
- **WHEN** Delivery, Action Sheet, or future agent-send flows dispatch terminal input
- **THEN** they route through the same host-owned session-input dispatch primitive
- **AND** confirmation behavior is configured from that primitive instead of duplicated per surface

### Requirement: Unified Promotion Storage Contract
Delivery runs across all sources SHALL be stored in one converged contract:
- Draft records in HIL draft storage.
- Audit timeline entries in `.agency/cells/<cellId>/delivery/events.jsonl`.

#### Scenario: Multi-source runs are stored in the same contract
- **WHEN** delivery runs are created from different sources
- **THEN** each run is queryable from the same draft + timeline storage model
- **AND** source and session ownership metadata differentiates runs without splitting storage locations

### Requirement: Agency Data Package Boundary
The editor runtime SHALL host Agency data-domain logic in a root package `pkg/agency-data`.
The package SHALL be the canonical place for HIL, Action Sheet, and delivery-audit domain operations.

#### Scenario: Main process uses package domain APIs
- **WHEN** Electron services perform HIL or Action Sheet domain operations
- **THEN** they call `pkg/agency-data` APIs
- **AND** service files remain thin facades over package logic

### Requirement: Promote System Subpath Export
The package SHALL expose a `promote-system` subpath for delivery orchestration and status transitions.

#### Scenario: Promote system is imported as subpath
- **WHEN** main-process delivery handlers initialize
- **THEN** they can import `@agency/agency-data/promote-system`
- **AND** invoke start/confirm/status/timeline use cases through this entry

### Requirement: Host Adapter-Based Session Dispatch
Delivery orchestration SHALL depend on a host adapter contract for session dispatch and focus operations.
The package SHALL NOT directly control renderer/UI transport.

#### Scenario: Host provides dispatch adapter
- **WHEN** a delivery run is started
- **THEN** package orchestration calls host adapter methods for dispatch/focus
- **AND** transport details remain host-specific

### Requirement: Delivery Audit Event Persistence
The editor SHALL persist delivery audit events under the owning cell delivery directory in an append-only format.
Events SHALL include source, mode, status transition, timestamps, and entity references.

#### Scenario: Delivery run emits timeline events
- **WHEN** a quick or gated delivery transitions state
- **THEN** an event record is appended to the owning cell audit log
- **AND** timeline queries can filter by source and mode

### Requirement: Backward-Compatible Agency Storage
The package SHALL keep backward-compatible behavior for existing `.agency/hil/*`, `.agency/session-replies/*`, `.agency/delivery/*`, and `.agency/action-sheets/*` files.

#### Scenario: Legacy files are read by package repositories
- **WHEN** a project already contains legacy HIL, session reply, delivery, or Action Sheet data
- **THEN** package repositories read and update them without requiring schema migration
- **AND** previously stored fields remain available to existing views

### Requirement: Renderer Large-File Decomposition Program
The editor SHALL decompose large renderer modules into cohesive domain units while preserving existing feature behavior and integration contracts.

#### Scenario: App composition remains stable during decomposition
- **WHEN** renderer orchestration logic is extracted from `App.tsx`
- **THEN** existing feature views and callbacks remain reachable through stable integration props
- **AND** no feature-level behavior regression is introduced by the decomposition.

#### Scenario: Existing large panels are decomposed by bounded responsibilities
- **WHEN** large panels (Agent Cells, Explorer, Terminal, Workbench, HIL, Quick Actions, Session Reply) are refactored
- **THEN** each panel is split into bounded modules (view, domain controller, shared utility) instead of one monolithic component file.

#### Scenario: Extracted runtime hooks are also bounded
- **WHEN** large runtime hooks (for example terminal runtime orchestration hooks) exceed renderer quality limits
- **THEN** they are decomposed into focused sub-hooks/utilities instead of replacing one monolith with another.

### Requirement: Reuse-First Shared Interaction Modules
The editor SHALL extract and reuse shared interaction modules for duplicated renderer logic before applying file-local splitting.

#### Scenario: External drop parsing is shared across surfaces
- **WHEN** Agent Cells and Explorer handle external drop inputs
- **THEN** both surfaces use one shared external drop-path parsing module
- **AND** path parsing behavior remains consistent across MIME payload variants.

#### Scenario: File dashboard preview loading is shared across surfaces
- **WHEN** Agent Cells and Explorer companion changed-files panel request file previews
- **THEN** both surfaces use one shared preview-loading mechanism
- **AND** preview request/cancellation semantics remain consistent.

#### Scenario: Snippet preview loading is shared for hover/detail previews
- **WHEN** dashboards and HIL anchor/tooltips request file snippets
- **THEN** they use one shared snippet-preview loading mechanism
- **AND** loading/error/cancellation semantics remain consistent across surfaces.

### Requirement: Renderer Bridge Adapter Consistency
The editor SHALL route renderer-main operations in large UI components and high-churn orchestration hooks through service bridge adapters rather than direct runtime-global calls.

#### Scenario: Component runtime calls use bridge adapters
- **WHEN** large renderer components perform terminal/workbench/explorer/HIL runtime operations
- **THEN** calls flow through typed renderer service adapters
- **AND** direct `window.agency` usage in those component implementations is eliminated except global availability checks.

#### Scenario: Explorer clipboard/materialize paths use bridge adapters
- **WHEN** Explorer handles paste/materialize flows
- **THEN** those runtime calls flow through bridge adapters instead of direct `window.agency` access in component code
- **AND** existing paste/materialize behavior remains unchanged.

#### Scenario: High-churn hooks use bridge adapters
- **WHEN** `useProjectExplorer` and `useSessions` perform runtime operations
- **THEN** those operations flow through renderer bridge adapters rather than direct `window.agency` calls
- **AND** existing hook-level behavior and return contracts remain unchanged.

### Requirement: Reuse Catalog Synchronization After Refactor
The editor SHALL synchronize reusable-item documentation when refactor work introduces, modifies, or deprecates reusable coding assets.

#### Scenario: New reusable module is documented
- **WHEN** a refactor extracts a reusable component/hook/mechanism
- **THEN** `docs/notes-reusable-items-coding.md` is updated in the same refactor change with usage and source-of-truth path.

#### Scenario: Deprecated duplicated logic is recorded
- **WHEN** duplicated logic is removed and replaced by shared modules
- **THEN** the catalog records the replacement and migration note to avoid future reintroduction.

### Requirement: Session Continue on Mobile
The editor SHALL provide a session-level "Continue on Mobile" action that prepares a remote attach command for the selected session.
The command MUST target the session's bound tmux session and be suitable for direct execution in mobile SSH clients.

#### Scenario: Ready command copied
- **WHEN** a user triggers "Continue on Mobile" for a live session and SSH endpoint discovery succeeds
- **THEN** the editor generates an `ssh ... -t "tmux attach-session -t <session>"` command for that session
- **AND** copies the command to clipboard
- **AND** surfaces readiness details (host/port/session)

#### Scenario: SSH endpoint not ready
- **WHEN** a user triggers "Continue on Mobile" and no listening SSH endpoint is detected
- **THEN** the editor attempts a best-effort local SSH service enable flow
- **AND** re-runs port discovery
- **AND** if still unavailable, surfaces a manual next-step command with clear warning state

#### Scenario: Stale or missing session
- **WHEN** a user triggers "Continue on Mobile" for a missing/stale session
- **THEN** the editor rejects command generation and shows an actionable error
- **AND** does not report command-copy success

### Requirement: Continue on Mobile Hub Mode
The editor SHALL provide a hub-oriented mobile continuation mode that attaches to a dedicated tmux Hub session instead of directly attaching to only one target session.

#### Scenario: Hub continuation command is generated
- **WHEN** a user triggers Continue on Mobile in Hub mode
- **THEN** the editor generates an SSH command that creates-or-attaches a deterministic Hub tmux session for the current project
- **AND** the command is suitable for direct execution in mobile SSH clients.

#### Scenario: Hub session exposes Project/Cell/Session navigator
- **WHEN** the generated Hub command is executed and the Hub session is attached
- **THEN** the Hub renders an interactive terminal navigator listing available sessions grouped by Project -> Cell -> Session
- **AND** the user can switch to a selected session without returning to desktop UI.

#### Scenario: Hub catalog reflects live lifecycle changes
- **WHEN** Agency sessions are created, renamed, detached, or closed
- **THEN** subsequent Hub refreshes update the navigator entries accordingly
- **AND** stale/non-live targets are not presented as attachable by default.

### Requirement: Continue on Mobile Action Variants
The editor SHALL expose direct-session continuation, Hub continuation, and proxy-token continuation variants from session-level UI.

#### Scenario: Direct continuation remains available
- **WHEN** a user selects direct continuation from session UI
- **THEN** the editor preserves existing behavior that targets the selected session tmux identity
- **AND** continues to copy the generated direct command to clipboard when ready.

#### Scenario: Hub continuation reuses SSH readiness diagnostics
- **WHEN** a user selects Hub continuation and no listening SSH endpoint is available
- **THEN** the editor runs the same SSH readiness detection/enabling workflow used by direct continuation
- **AND** surfaces warning/manual-next-step diagnostics in Hub mode result payload.

#### Scenario: Proxy continuation is available from session UI
- **WHEN** a user selects proxy continuation from session UI
- **THEN** the editor prepares a proxy-mode command payload for the selected session
- **AND** the UI surfaces proxy endpoint/token diagnostics when setup is incomplete.

### Requirement: Terminal Data Write Batching
The editor SHALL batch high-frequency terminal output writes at frame granularity before flushing to xterm.

#### Scenario: High-throughput output avoids per-chunk repaint storms
- **WHEN** terminal runtime receives many output chunks within the same animation frame
- **THEN** the renderer coalesces those chunks and performs a single xterm write flush for that frame
- **AND** activity detection semantics remain unchanged.

### Requirement: Continue on Mobile Proxy Mode
The editor SHALL provide a token-authenticated proxy continuation mode that allows a mobile client to attach to a target tmux session without requiring direct tmux target knowledge.

#### Scenario: Proxy continuation command is generated
- **WHEN** a user triggers Continue on Mobile in proxy mode for a live session
- **THEN** the editor generates a proxy connect command containing endpoint and session token
- **AND** the command is suitable for direct execution in mobile terminal clients.

#### Scenario: Session token remains reusable during session lifetime
- **WHEN** a user repeatedly triggers proxy continuation for the same live session
- **THEN** the editor reuses the same session token
- **AND** token validity remains until that session ends.

#### Scenario: Session token is rejected after session ends
- **WHEN** a client attempts proxy attach with a token whose target session has ended
- **THEN** the proxy rejects the attach request
- **AND** the editor does not treat that token as valid for future attaches.

### Requirement: Consistent App-Native Interaction Prompts
The renderer SHALL use shared application-native prompt and confirmation interactions for destructive actions and text-entry flows in core UI surfaces instead of browser-native dialogs.

#### Scenario: Explorer destructive confirmation
- **WHEN** a user deletes one or more files from Explorer
- **THEN** the renderer uses a shared in-app confirmation interaction
- **AND** the flow preserves theme, keyboard handling, and deterministic action callbacks

#### Scenario: Workbench save as prompt
- **WHEN** a user performs Save As from the workbench
- **THEN** the renderer uses a shared in-app text-entry interaction
- **AND** the workbench only updates the tab after successful validation and save execution

### Requirement: Modular Renderer Screen Composition
The renderer SHALL compose major screens through typed screen/view-model boundaries rather than one untyped top-level prop graph.

#### Scenario: Agent Cells screen extraction
- **WHEN** Agent Cells screen composition is refactored
- **THEN** the layout shell receives typed view-model and handler contracts for that screen
- **AND** the user-visible Agent Cells behavior remains unchanged

#### Scenario: Explorer and Workbench composition extraction
- **WHEN** Explorer or Workbench composition logic is extracted from top-level renderer orchestration
- **THEN** each extracted module keeps its state ownership explicit
- **AND** the current open/reveal/edit/save interaction behavior remains unchanged

### Requirement: Renderer Service Boundary for Privileged UI APIs
Renderer view components SHALL access preload-exposed privileged APIs through renderer service abstractions instead of direct global calls.

#### Scenario: Capture overlay integration
- **WHEN** the capture overlay loads capture source data or completes/cancels a capture flow
- **THEN** the view layer calls a renderer service abstraction
- **AND** transport details remain isolated from the UI component tree

### Requirement: Cell Attachment Lifecycle
The editor SHALL model worktree attachment separately from Cell lifecycle state.
A Cell SHALL remain selectable and inspectable when its worktree attachment is missing, removed, or intentionally detached.
The editor SHALL surface attachment state distinctly from lifecycle state.

#### Scenario: Worktree removed outside the editor
- **WHEN** a Cell's recorded worktree is no longer present on disk or in the repository worktree list
- **THEN** the editor keeps the Cell record
- **AND** marks the Cell attachment as missing or detached instead of deleting the Cell
- **AND** preserves the Cell's sessions and workflow artifacts

#### Scenario: Select a Cell without a live worktree
- **WHEN** a user selects a Cell whose worktree attachment is missing or detached
- **THEN** worktree-bound surfaces show an attachment-aware empty state or repository fallback as appropriate
- **AND** non-worktree artifacts such as sessions, replies, runs, and lifecycle metadata remain accessible

### Requirement: Detached Cell Cleanup And Archived Lifecycle Surfaces
The editor SHALL allow users to archive or delete a Cell after its worktree attachment has been removed.
The editor SHALL allow users to clear stale attachment metadata without recreating the old worktree first.
The Agent Cells sidebar SHALL project missing/detached non-archived Cells into a cleanup-first section rather than rendering them as ordinary session-tree cards.
The cleanup-first section SHALL represent attachment triage rather than lifecycle completion and SHALL render each entry with a `Cleanup Recommended` eyebrow that pairs evidence-preserving microcopy with early CTA visibility.
Cells whose lifecycle state is already `archived` SHALL leave the cleanup queue and active development buckets and become reachable through an explicit archived-view affordance.
Cleanup and archived lifecycle surfaces SHALL stay visually compact, avoid nested card-within-card scaffolding, and rely on a single-shell action grammar rather than duplicated bordered wells.

#### Scenario: Archive a detached Cell
- **WHEN** a user archives a Cell whose worktree attachment has already been removed or marked detached
- **THEN** the editor allows the archive transition through an attachment-aware confirmation flow
- **AND** does not require the missing worktree path to be rediscovered first

#### Scenario: Cleanup section in Agent Cells
- **WHEN** the Agent Cells sidebar contains Cells whose worktree attachment is missing or detached and whose lifecycle state is not `archived`
- **THEN** those Cells appear in a dedicated `Needs Cleanup` section with preserved-evidence copy and session summary
- **AND** each cleanup Cell exposes a direct archive action
- **AND** the cleanup card surfaces a `Cleanup Recommended` eyebrow to keep the attachment triage tone consistent while distinguishing `missing` vs `detached` copy
- **AND** cleanup copy distinguishes `missing` attachment from intentionally `detached` attachment
- **AND** the sidebar does not render their session tree inline as though they were still attached development Cells

#### Scenario: View archived Cells
- **WHEN** the Agent Cells sidebar contains one or more Cells whose lifecycle state is `archived`
- **THEN** the sidebar exposes an explicit `View Archived` affordance
- **AND** archived Cells render through an archived-history surface with `View Details`, preserved-evidence copy, and session summary rather than cleanup triage
- **AND** each archived card visible in that surface displays an `Archived` badge while keeping `View Details` as the primary CTA

#### Scenario: Archived detached Cell uses archived surface
- **WHEN** the Agent Cells sidebar contains a Cell whose worktree attachment is missing or detached and whose lifecycle state is `archived`
- **THEN** that Cell appears only through the archived-view surface instead of `Needs Cleanup`
- **AND** the card may communicate offline attachment state without reclassifying the Cell as needing cleanup

#### Scenario: Delete a detached Cell
- **WHEN** a user deletes a detached or missing-worktree Cell
- **THEN** the editor removes the repo-owned Cell record and related Cell-owned artifacts
- **AND** does not require the previous worktree path to still exist

### Requirement: Scoped Hierarchy Configuration Uses Repo-Owned Storage
The editor SHALL store Project-scoped Hierarchy configuration at repository-root `.agency/`.
The editor SHALL store Agent-scoped Hierarchy configuration in repo-owned Cell storage under `.agency/cells/<cell-id>/`.
This convention SHALL apply to Quick Actions, Reply Quick Prompts, Session Naming, Terminus Settings, App Shortcuts, and Gates.

#### Scenario: Project config survives worktree churn
- **WHEN** a user switches, detaches, or removes a Cell worktree
- **THEN** Project-scoped configuration still resolves from the repository root

#### Scenario: Agent config survives worktree replacement
- **WHEN** a Cell later reattaches to a different worktree
- **THEN** the Cell's Agent-scoped configuration still resolves from the same repo-owned Cell record

### Requirement: Turn Tooling Is Explicit
Gate Create, Gate Execute, and Action Sheet scaffolding SHALL be explicit workflow tools rather than mandatory Cell lifecycle artifacts.
The editor SHALL NOT auto-create Turn tooling artifacts during Cell creation unless the user explicitly opts in.

#### Scenario: Create Cell without Turn scaffold
- **WHEN** a user creates a Cell and does not explicitly start Turn tooling
- **THEN** the editor creates the Cell without creating a new Gate Create Action Sheet

#### Scenario: Explicit Gate Create
- **WHEN** a user invokes Gate Create on an existing Cell
- **THEN** the editor creates the Gate Create Action Sheet template for that Cell on demand
