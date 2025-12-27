## ADDED Requirements
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
