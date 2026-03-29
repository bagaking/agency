## ADDED Requirements

### Requirement: Canonical Object Hierarchy
The editor SHALL define one canonical Agency object hierarchy and SHALL use it consistently across product language, runtime contracts, and cross-surface ownership.
The canonical hierarchy SHALL distinguish at least:
- `App`: the desktop application instance
- `Window`: one top-level editor shell with window-local project context
- `Project`: the repository context selected inside a window
- `Cell`: the worktree-bound workspace object
- `Session`: an execution lane inside exactly one cell
- `Run`: a host-owned bounded orchestration record that may inspect, create, or target sessions through approved capabilities

#### Scenario: Session and run remain distinct
- **WHEN** a user starts child execution from a session entry
- **THEN** the system creates or references a `Run` as the orchestration identity
- **AND** any resulting child session remains a separate execution-lane object rather than replacing the run identity

#### Scenario: Same object identity across surfaces
- **WHEN** a user views the same cell or session in Agent Cells and Session Map
- **THEN** both surfaces refer to the same underlying object identity
- **AND** neither surface invents a competing ownership model for that object

### Requirement: Surface Roles Stay Distinct From Object Ownership
The editor SHALL treat product surfaces as views and action surfaces over canonical objects rather than as independent domain-object roots.
At minimum:
- `Agent Cells` SHALL be a surface for cells and sessions
- `Explorer` and `Workbench` SHALL be file surfaces in project/cell context
- `Session Map` SHALL be a navigation and observability surface over cells, sessions, and runs
- `Hierarchy` SHALL be a configuration surface
- `Memo` SHALL be an artifact surface
- `Commander` SHALL be a bounded operator surface over session and run context rather than a standalone object type

#### Scenario: Commander stays a bounded surface
- **WHEN** a user opens Commander from Session Map or a Commander-backed session action
- **THEN** the product presents Commander as an operator surface over current session/run evidence
- **AND** it does not imply that Commander is a separate execution object hierarchy

### Requirement: Workflow Artifact Ownership
The editor SHALL model workflow artifacts separately from canonical domain objects and SHALL keep their ownership explicit.
At minimum:
- lifecycle records and lifecycle gates SHALL remain bound to cell lifecycle state
- Action Sheets SHALL be workflow artifacts bound to a cell and optionally a session
- Reply items SHALL be session-bound memo artifacts
- Delivery records SHALL be dispatch artifacts that reference source artifacts and target sessions

#### Scenario: Reply remains a session-bound artifact
- **WHEN** a user records or sends a reply
- **THEN** the product stores a reply artifact with session ownership metadata
- **AND** the reply does not become a new execution object parallel to cells, sessions, or runs

#### Scenario: Delivery remains a dispatch artifact
- **WHEN** a user dispatches content through Promote, Explorer send, or Session Reply
- **THEN** the product records delivery as a dispatch artifact referencing source items and target sessions
- **AND** the dispatch does not redefine session or run ownership semantics

### Requirement: Child-Execution Vocabulary Is Distinct From Workspace Creation
The editor SHALL reserve `Create Cell` for worktree-bound workspace creation and SHALL reserve `Create Agent` for bounded child execution.
`Fork` SHALL remain a specialized child-execution strategy rather than the default meaning of workspace creation or child execution.

#### Scenario: Create cell uses workspace semantics
- **WHEN** a user creates a new worktree-bound workspace
- **THEN** the product presents that action as `Create Cell`
- **AND** the resulting object is a new or reused cell

#### Scenario: Create agent uses run-based execution semantics
- **WHEN** a user starts bounded child execution from an existing project, cell, or session context
- **THEN** the product presents that action as `Create Agent`
- **AND** the action creates or references a host-owned run identity
- **AND** any fork behavior is treated as an optional specialization under that action

## RENAMED Requirements
- FROM: `### Requirement: Create Agent (Cell)`
- TO: `### Requirement: Create Cell`

## MODIFIED Requirements
### Requirement: Create Cell
The editor SHALL create a new Cell by creating or reusing a git worktree and binding it 1:1 with a branch.
The editor SHALL treat Cell creation as workspace creation rather than as child execution or run orchestration.

#### Scenario: Create new Cell
- **WHEN** a user creates a new cell with a new branch
- **THEN** a new worktree is created and bound to that branch

#### Scenario: Reuse existing worktree
- **WHEN** a user selects an existing worktree for a new cell
- **THEN** the editor reuses the worktree and keeps the branch binding intact
