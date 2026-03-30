## MODIFIED Requirements
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
- **AND** in docked Session Map it appears as `Briefing` mode inside the same right-side station that otherwise hosts `Ops`

## ADDED Requirements
### Requirement: Session Map Right Station Preserves Ops Context Across Mode Switches
The docked Session Map SHALL treat its right side as one station with `Ops` and `Briefing` modes.
Switching into `Briefing` SHALL NOT discard the current `Ops` context or evidence state.

#### Scenario: Close briefing and return to the same ops context
- **WHEN** a user opens `Briefing` from the docked Session Map right station and then closes it
- **THEN** the same right-side station returns to `Ops`
- **AND** the prior `Ops` evidence state remains available instead of resetting to a fresh default view
