## MODIFIED Requirements

### Requirement: Canonical Object Hierarchy
The editor SHALL define one canonical Agency object hierarchy and use it consistently across product language, runtime contracts, and cross-surface ownership.
The canonical hierarchy SHALL distinguish at least:
- `App`: the desktop application instance
- `Window`: one top-level editor shell with window-local project context
- `Project`: the repository context selected inside a window
- `Cell`: a repo-owned workspace record that may bind one live worktree attachment and anchor session/config/runtime metadata
- `Session`: an execution lane inside exactly one Cell
- `Run`: a host-owned bounded orchestration record that may inspect, create, or target sessions through approved capabilities

Live repository worktrees MAY exist without a Cell until the user explicitly chooses to track or bind them.

#### Scenario: Live worktree exists without a tracked Cell
- **WHEN** a repository contains a git worktree that has no matching Cell record
- **THEN** the editor surfaces that worktree as an unmanaged workspace candidate
- **AND** the editor does not synthesize a tracked Cell until the user explicitly adopts or binds it

#### Scenario: Same object identity across surfaces
- **WHEN** a user views the same Cell or session in Agent Cells and Session Map
- **THEN** both surfaces refer to the same underlying object identity
- **AND** neither surface invents a competing ownership model for that object

### Requirement: Workflow Artifact Ownership
The editor SHALL model workflow artifacts separately from canonical domain objects and keep their ownership explicit.
The core editor SHALL NOT require a default SPEC, lifecycle, draft, or gate workflow in order to create, bind, inspect, or use Cells and worktrees.
Optional workflow suites MAY attach additional artifacts or checks to Cells, but they SHALL remain explicit overlays rather than redefining Cell, Session, or Run ownership.
Existing advanced delivery-domain workflows MAY continue to expose optional gated behavior during the transition away from default core Gate management, but those modes SHALL remain optional and SHALL NOT become preconditions for core workspace management.
At minimum:
- Reply items SHALL be session-bound memo artifacts
- delivery records SHALL be dispatch artifacts that reference source artifacts and target sessions
- workflow artifacts such as Action Sheets, when enabled, SHALL remain explicit artifacts bound to a Cell and optionally a session

#### Scenario: Core workspace management without a workflow suite
- **WHEN** a user creates or binds a Cell in a repository with no workflow suite configured
- **THEN** the core workspace flow succeeds without requiring draft, gate, or lifecycle workflow artifacts
- **AND** the resulting Cell, sessions, and runs keep their canonical ownership semantics

### Requirement: Create Cell
The editor SHALL allow users to create a tracked Cell from:
- a new branch-backed worktree created by Agency
- an existing live worktree
- an existing branch without requiring immediate worktree materialization

The editor SHALL NOT require every live worktree to already have a Cell.
The editor SHALL allow a live unmanaged worktree to remain unmanaged until the user explicitly chooses to track it.
Branch strategy and naming constraints SHALL apply only when the editor creates a new branch itself.
Binding an existing worktree or branch SHALL preserve the existing branch identity rather than forcing it through create-time naming rules.
Binding an existing branch SHALL NOT implicitly create a new worktree unless the user explicitly chooses an attachment-creation action.

#### Scenario: Create new Cell
- **WHEN** a user creates a new Cell with a new branch
- **THEN** the editor creates a repo-owned Cell record
- **AND** attaches a new worktree bound to that branch

#### Scenario: Track an unmanaged worktree
- **WHEN** a user selects an unmanaged live worktree and chooses `Create Cell`
- **THEN** the editor creates a repo-owned Cell record for that worktree
- **AND** preserves the existing branch and path identity of the worktree

#### Scenario: Bind existing branch
- **WHEN** a user selects an existing branch for a new Cell
- **THEN** the editor creates or reuses the durable Cell record without renaming the existing branch
- **AND** if the branch already has a live worktree, the editor binds that live workspace instead of creating a duplicate one
- **AND** otherwise the editor creates a branch-only Cell and leaves worktree materialization explicit

#### Scenario: Create explicit attachment for branch-only Cell
- **WHEN** a user explicitly chooses `Create Worktree Attachment` for a branch-only Cell
- **THEN** the editor creates or binds a live worktree attachment for that Cell
- **AND** the worktree is materialized only because the user chose the explicit attachment action

### Requirement: Hierarchy Configuration Navigation
The editor SHALL provide a Hierarchy entry in the activity bar for configuration of Actions, App Shortcuts, Reply Quick Prompts, Session Naming, Harness Providers, and Softlinks.
The core Hierarchy view SHALL NOT require a default Gates capability page.
Optional workflow suites MAY register additional Hierarchy entries such as Gates, but those entries SHALL be suite-owned rather than core-owned.

#### Scenario: Open hierarchy configuration without a workflow suite
- **WHEN** a user selects the Hierarchy item in the activity bar in the base product
- **THEN** the editor shows the core configuration entries
- **AND** it does not imply that Gate configuration is mandatory for ordinary workspace management

### Requirement: Agent Cells Explorer Shortcuts
The editor SHALL label the Explorer view as "Agent Cells" and focus it on workspace and Cell management.
The Agent Cells view SHALL provide jump links to Actions and Softlinks configuration.
The Agent Cells view SHALL expose an embedded Explorer section anchored in the lower area of the Agent Cells sidebar, aligned with the currently selected tracked Cell context.
The embedded Explorer section SHALL collapse to a bottom bar and expand to a default half-height state, and users SHALL be able to resize the split via vertical drag.
The embedded Explorer section SHALL provide scoped file interaction entry points and lightweight drag/drop routing into Explorer import semantics.
The embedded Explorer section SHALL keep the Agent Cells list and the embedded Explorer file list independently scrollable when content overflows.
The Explorer view SHALL provide a companion changed-files panel above the Agent footer, using consistent presentation and row interactions with the Agent Cells embedded Explorer while remaining changes-only.

#### Scenario: Embedded Explorer panel placement
- **WHEN** a user opens Agent Cells view with a tracked Cell selected
- **THEN** the embedded Explorer section appears in the lower Agent Cells sidebar flow
- **AND** the section is context-aware to the selected tracked Cell

### Requirement: Settings Dashboard Overview
The editor SHALL provide a Settings dashboard that summarizes the current project context and offers navigation entry cards to core runtime/configuration capabilities such as Actions and Softlinks.
The dashboard SHALL include the current project summary and the recent projects list.
The core dashboard SHALL NOT require a default Gates entry card.

#### Scenario: View settings dashboard
- **WHEN** a user opens the Settings view
- **THEN** the editor shows project summary, recent projects, and core configuration entry cards
- **AND** it does not imply that Gate configuration is required for ordinary workspace management

### Requirement: Cell Attachment Lifecycle
The editor SHALL model worktree attachment separately from tracked Cell identity.
A tracked Cell SHALL remain selectable and inspectable when its worktree attachment is missing, removed, or intentionally detached.
The editor SHALL also recognize live repository worktrees that are not currently tracked by any Cell.
The editor SHALL surface attachment and tracking state directly without requiring a default lifecycle state machine.
Legacy `state` values MAY remain stored during migration, but the default core routing SHALL be determined by tracking and attachment state rather than lifecycle state.

#### Scenario: Worktree removed outside the editor
- **WHEN** a tracked Cell's recorded worktree is no longer present on disk or in the repository worktree list
- **THEN** the editor keeps the Cell record
- **AND** marks the attachment as missing or detached instead of deleting the Cell
- **AND** preserves the Cell's sessions and other Cell-owned artifacts

#### Scenario: Select a tracked Cell without a live worktree
- **WHEN** a user selects a tracked Cell whose worktree attachment is missing or detached
- **THEN** worktree-bound surfaces show an attachment-aware empty state or repository fallback as appropriate
- **AND** non-worktree artifacts such as sessions, replies, and runs remain accessible

#### Scenario: Legacy archived record during migration
- **WHEN** a tracked Cell record still carries a legacy lifecycle value such as `archived`
- **THEN** the editor preserves that metadata for compatibility
- **AND** the default core routing still follows attachment/tracking state rather than lifecycle state
- **AND** the UI MAY show a low-emphasis compatibility badge without restoring the old lifecycle-first rail as the default core experience

### Requirement: Scoped Hierarchy Configuration Uses Repo-Owned Storage
The editor SHALL store Project-scoped Hierarchy configuration at repository-root `.agency/`.
The editor SHALL store Agent-scoped Hierarchy configuration in repo-owned Cell storage under `.agency/cells/<cell-id>/`.
This convention SHALL apply to Quick Actions, Reply Quick Prompts, Session Naming, Terminus Settings, and App Shortcuts in the base product.
Optional workflow suites MAY add their own scoped configuration, but such configuration SHALL remain suite-owned rather than implied by the core product.

#### Scenario: Project config survives worktree churn
- **WHEN** a user switches, detaches, or removes a Cell worktree
- **THEN** Project-scoped configuration still resolves from the repository root

#### Scenario: Agent config survives worktree replacement
- **WHEN** a Cell later reattaches to a different worktree
- **THEN** the Cell's Agent-scoped configuration still resolves from the same repo-owned Cell record

### Requirement: Turn Tooling Is Explicit
Workflow suites such as SPEC/gate/action-sheet tooling SHALL be explicit overlays rather than default Cell-management behavior.
The core editor SHALL NOT auto-create workflow-suite artifacts during ordinary Cell creation, worktree adoption, reattachment, or session startup unless the user explicitly opts into such tooling.

#### Scenario: Create Cell without workflow-suite scaffold
- **WHEN** a user creates or binds a Cell through the base core product
- **THEN** the editor completes the workspace action without creating default SPEC, Gate, or workflow-suite artifacts

## ADDED Requirements

### Requirement: Unmanaged Worktree Discovery And Quick Tracking
The editor SHALL discover live git worktrees in the current repository that do not yet have a matching tracked Cell record.
The editor SHALL surface those worktrees as unmanaged workspace candidates.
The editor SHALL offer explicit quick actions for unmanaged worktrees, including:
- `Create Cell`
- `Bind To Existing Cell` when a compatible detached Cell exists
- `Ignore For Now`
The editor SHALL persist ignored unmanaged-worktree state in a user-local per-repository store rather than repo-owned project storage.

#### Scenario: Discover unmanaged worktrees
- **WHEN** the repository contains one or more live worktrees that are not matched to tracked Cells
- **THEN** the editor lists them as unmanaged worktree candidates
- **AND** distinguishes them from tracked attached Cells and detached/missing tracked Cells

#### Scenario: Bind unmanaged worktree to an existing detached Cell
- **WHEN** a user selects an unmanaged worktree and chooses to bind it to a detached tracked Cell
- **THEN** the editor reattaches that Cell to the selected worktree
- **AND** preserves the Cell's existing sessions, replies, runs, and agent-scoped configuration

#### Scenario: Bind unmanaged worktree to an existing branch-only Cell
- **WHEN** a user selects an unmanaged worktree and chooses to bind it to a branch-only tracked Cell
- **THEN** the editor binds that Cell to the selected live worktree without switching to detached-reattach wording
- **AND** preserves the Cell's existing identity and branch metadata

#### Scenario: Automatic bind suggestion uses deterministic compatibility
- **WHEN** the editor suggests a detached Cell for an unmanaged worktree
- **THEN** it matches by exact last-known worktree path first
- **AND** otherwise it may suggest a detached Cell only when branch matching is unique
- **AND** it does not silently choose among multiple ambiguous detached Cells

#### Scenario: Ignore unmanaged worktree
- **WHEN** a user chooses `Ignore For Now` on an unmanaged worktree
- **THEN** the editor leaves the worktree unmanaged
- **AND** persists the ignore decision in user-local per-repository state
- **AND** it does not create a synthetic Cell record as a side effect

#### Scenario: Ignored unmanaged worktree becomes visible again
- **WHEN** an ignored unmanaged worktree disappears, is adopted into a Cell, or the user resets ignored unmanaged worktrees
- **THEN** the ignore record is cleared
- **AND** the worktree may reappear in unmanaged discovery if it is still live and untracked

### Requirement: Detached Cell And Unmanaged Worktree Management
The editor SHALL provide compact management surfaces for:
- tracked Cells with live worktree attachments
- tracked Cells that are branch-only
- tracked Cells whose attachments are detached or missing
- live unmanaged worktrees

The core product SHALL use attachment/tracking management actions rather than lifecycle-stage actions for those surfaces.

#### Scenario: Detached tracked Cell remains manageable
- **WHEN** the Agent Cells surface contains a tracked Cell whose worktree attachment is missing or detached
- **THEN** the editor surfaces that Cell in a dedicated detached-management section
- **AND** the primary actions focus on reattach, inspect, or remove-record flows rather than lifecycle-stage transitions

#### Scenario: Manual bind requires mismatch confirmation
- **WHEN** a user manually binds an unmanaged worktree to a detached Cell whose branch or last-known path does not match
- **THEN** the editor requires explicit user confirmation before rebinding
- **AND** it surfaces the mismatch rather than silently treating the bind as an exact recovery

#### Scenario: Delete a tracked Cell while worktree still exists
- **WHEN** a user deletes a tracked Cell record whose worktree still exists on disk
- **THEN** the editor removes the repo-owned Cell record and Cell-owned artifacts
- **AND** leaves the live worktree on disk by default
- **AND** returns that worktree to the unmanaged-worktree section

### Requirement: Cell Record
The editor SHALL persist a repo-owned Cell record under the project root.
The Cell record SHALL anchor Cell identity, label, attachment metadata, timestamps, avatar, and other durable workspace metadata needed by the base product.
The base Cell record SHALL NOT require a default `draft / active / archived` lifecycle state machine.

#### Scenario: Track a worktree without lifecycle state
- **WHEN** a user creates or binds a tracked Cell in the base product
- **THEN** the editor writes a repo-owned Cell record
- **AND** the record is sufficient for attachment, session, and config anchoring without requiring a default lifecycle-state transition model

### Requirement: Spec-Agnostic Core Workspace Management
The base workspace-management product SHALL work in repositories with no OpenSpec or other SPEC-system files.
The base product SHALL NOT emit missing-spec warnings or default gate failures during worktree discovery, Cell creation, Cell binding, Cell reattachment, or ordinary session startup.
Optional workflow suites MAY add explicit spec validation when installed and enabled.

#### Scenario: Repository without OpenSpec uses core worktree management
- **WHEN** a user opens a repository that has no `openspec/` directory and no enabled workflow suite
- **THEN** the editor still allows worktree discovery, Cell creation/binding, and session startup
- **AND** the core product does not warn that the repository is missing SPEC files

## REMOVED Requirements

### Requirement: Lifecycle State File
**Reason**: The base core no longer models Cell tracking around a default lifecycle-state file. The Cell record remains repo-owned, but lifecycle-state semantics move out of the default core contract.
**Migration**: Preserve repo-owned Cell records and attachment metadata. Existing lifecycle fields may remain for compatibility, but they stop being required by the base product.

### Requirement: Lifecycle Gates and Confirmation
**Reason**: Default gate-driven lifecycle transitions are no longer part of the base worktree-management product.
**Migration**: Core create/bind/reattach/delete flows must work without default Gates. A future optional workflow suite may reintroduce explicit gate behavior.

### Requirement: Minimal Validation (MVP)
**Reason**: The base product no longer assumes SPEC-file validation as a default Cell-management concern.
**Migration**: Repositories without spec files should no longer receive core validation warnings. Optional suites may add their own explicit validation.

### Requirement: Gate Configuration Scopes
**Reason**: Default Gate configuration is removed from the base core navigation and workspace model.
**Migration**: Any future workflow suite that needs Gates should own its own suite-level configuration surfaces and requirements.

### Requirement: Gate Execution Semantics
**Reason**: Default Gate execution is no longer part of the base Cell/worktree-management product.
**Migration**: Preserve internal execution seams only if needed for future optional workflow suites; do not let them block the base workspace path.

### Requirement: Detached Cell Cleanup And Archived Lifecycle Surfaces
**Reason**: The base product no longer frames detached/missing tracked Cells through lifecycle cleanup/archive states.
**Migration**: Replace lifecycle cleanup/archive surfaces with attachment/tracking management surfaces for detached Cells and unmanaged worktrees.
#### Scenario: Branch-only tracked Cell remains distinct from detached cleanup
- **WHEN** the Agent Cells surface contains a tracked Cell with branch identity but no live worktree attachment
- **THEN** the editor surfaces that Cell in a dedicated branch-only section
- **AND** the primary action focuses on explicit attachment creation rather than cleanup or failure recovery
