## MODIFIED Requirements

### Requirement: Per-Cell Multi-Session Terminals
The editor SHALL allow multiple terminal sessions per Cell.
The editor SHALL preserve parent-child relationships between sessions within the same Cell.

#### Scenario: Create a new session
- **WHEN** a user creates a new session in a Cell
- **THEN** a new terminal session is added to that Cell without replacing existing sessions

#### Scenario: Preserve topology after reparenting
- **WHEN** a user reparents or reorders a session within a Cell
- **THEN** the editor keeps the session in the same Cell and preserves the updated topology

### Requirement: Session Tabs
The editor SHALL render sessions as a tree of nested list items under their parent Cell in the Agent Cells sidebar and highlight the active session.
The editor SHALL allow expanding and collapsing session groups in that tree.

#### Scenario: Switch session via session tree
- **WHEN** a user clicks a session entry under a Cell
- **THEN** the editor activates that session and selects the parent Cell

#### Scenario: Expand nested sessions
- **WHEN** a session node has child sessions and the user expands that node
- **THEN** the editor shows the child sessions in the Agent Cells sidebar

## ADDED Requirements

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
The editor SHALL store session topology metadata in the per-worktree session registry and SHALL migrate existing flat registries without losing sessions or relative order.

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
