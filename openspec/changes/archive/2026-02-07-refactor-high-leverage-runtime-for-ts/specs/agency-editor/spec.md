## ADDED Requirements

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
- **WHEN** `App.jsx` renders `AppLayout`
- **THEN** existing feature views (Agent Cells, Explorer, Hierarchy, Memo, Action Sheets) remain reachable through stable props.
