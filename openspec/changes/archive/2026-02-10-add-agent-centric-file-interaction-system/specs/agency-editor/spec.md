## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Project Explorer Navigation
The editor SHALL provide an Explorer entry in the activity bar that shows a project file tree rooted at the active Agent Cell worktree.
If no Agent Cell is available, the Explorer SHALL fall back to the repository root.
Explorer SHALL also act as the canonical interaction hub for cross-surface file intents and reveal requests.

#### Scenario: Open project explorer
- **WHEN** a user selects Explorer in the activity bar
- **THEN** the editor shows the project file tree and root metadata

#### Scenario: Switch cell scope
- **WHEN** a user selects a different Agent Cell scope in Explorer
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

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active worktree and allow filtering by kind and status.
Memo file references SHALL provide unified `open` and `reveal` entry points.
Memo SHALL support lightweight drag routing into Explorer import flows in phase 1.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor shows the HIL list for the current worktree

#### Scenario: Open file from Memo reference
- **WHEN** a user activates a file reference in Memo
- **THEN** the editor opens the referenced file using the unified file interaction contract

#### Scenario: Drag Memo reference into Explorer
- **WHEN** a user drags a Memo file reference into Explorer
- **THEN** the editor routes the drop to Explorer `import_copy` with conflict-safe behavior

### Requirement: Agent Cells Explorer Shortcuts
The editor SHALL label the Explorer view as "Agent Cells" and focus it on Cell management.
The Agent Cells view SHALL provide jump links to Actions, Gates, and Softlinks configuration.
The Agent Cells view SHALL also expose file interaction entry points for file-change dashboards and lightweight drag/drop routing into Explorer import semantics.

#### Scenario: Jump from Agent Cells
- **WHEN** a user selects a jump link in Agent Cells
- **THEN** the editor navigates to the corresponding Hierarchy view

#### Scenario: Open file-change dashboard from Agent Cells
- **WHEN** a user opens file-change dashboard affordance in Agent Cells
- **THEN** the editor presents scoped file-change overview for the active Cell/worktree

#### Scenario: Agent Cells lightweight drop routing
- **WHEN** a user drags a supported file reference from Agent Cells into Explorer
- **THEN** the editor routes the drop into unified `import_copy` handling
- **AND** applies standard conflict-safe naming and error reporting

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
