## ADDED Requirements

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

### Requirement: Detached Cell Cleanup And Archive
The editor SHALL allow users to archive or delete a Cell after its worktree attachment has been removed.
The editor SHALL allow users to clear stale attachment metadata without recreating the old worktree first.

#### Scenario: Archive a detached Cell
- **WHEN** a user archives a Cell whose worktree attachment has already been removed or marked detached
- **THEN** the editor allows the archive transition through an attachment-aware confirmation flow
- **AND** does not require the missing worktree path to be rediscovered first

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

## MODIFIED Requirements

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

### Requirement: Create Cell
The editor SHALL create a new Cell as a durable project-owned workspace object.
The editor SHALL allow Cell creation to attach a new git worktree or reuse an existing git worktree, but Cell identity SHALL remain valid if the attachment later changes or disappears.
The editor SHALL treat Cell creation as workspace/context creation rather than as child execution or run orchestration.

#### Scenario: Create new Cell
- **WHEN** a user creates a new Cell with a new branch
- **THEN** the editor creates a durable Cell record
- **AND** attaches a new worktree bound to that branch

#### Scenario: Reuse existing worktree
- **WHEN** a user selects an existing worktree for a new Cell
- **THEN** the editor creates or reuses the durable Cell record for that context
- **AND** attaches the existing worktree without redefining Cell identity around that path alone

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

### Requirement: Session Registry and Recovery
The editor SHALL maintain a per-Cell session registry in repo-owned Cell storage and restore sessions on relaunch.
Losing the current worktree attachment SHALL NOT erase the Cell's session registry.

#### Scenario: Restore sessions on relaunch
- **WHEN** the editor restarts
- **THEN** it restores the session list for each Cell from the session registry
- **AND** it attempts to reattach to recoverable sessions

#### Scenario: Stale session detection
- **WHEN** a registered session cannot be recovered
- **THEN** the editor marks it as stale and prompts the user to start a new session

#### Scenario: Missing worktree keeps session evidence
- **WHEN** a Cell's worktree attachment is missing during relaunch
- **THEN** the editor still loads that Cell's session registry
- **AND** keeps the sessions visible as stale, closed, detached, or otherwise offline as appropriate

### Requirement: Session Hierarchy Persistence
The editor SHALL store session topology metadata in the repo-owned Cell session registry and SHALL migrate existing flat or worktree-local registries without losing sessions or relative order.

#### Scenario: Load legacy registry
- **WHEN** the editor loads a session registry that lacks hierarchy metadata
- **THEN** it treats all sessions as root nodes in their existing order

#### Scenario: Reload preserved hierarchy
- **WHEN** the editor relaunches after sessions were reordered or reparented
- **THEN** it restores the same hierarchy and sibling order

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
