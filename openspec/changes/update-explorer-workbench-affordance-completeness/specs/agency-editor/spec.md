## MODIFIED Requirements

### Requirement: Workbench Navigation Aids
The workbench SHALL display breadcrumbs for the active file and provide a quick-open affordance.
The quick-open surface SHALL behave as a path-first launcher for the current worktree and currently open tabs.
The surface SHALL close after the user selects a target.

#### Scenario: Quick-open a file
- **WHEN** a user invokes quick-open and selects a file
- **THEN** the editor opens the file in a new workbench tab
- **AND** the quick-open surface closes

#### Scenario: Quick-open with empty query
- **WHEN** a user opens quick-open before entering a query
- **THEN** the editor surfaces currently open tabs as immediate navigation targets

### Requirement: Workbench Capability Honesty
The workbench SHALL not expose top-level controls for capabilities that do not yet have a real implementation behind them.
Placeholder or future capabilities SHALL remain hidden until the interaction contract and state model exist.

#### Scenario: Split editing is not yet shipped
- **WHEN** the workbench does not have a split-editor layout model
- **THEN** the main Workbench header does not expose a split-editor action
