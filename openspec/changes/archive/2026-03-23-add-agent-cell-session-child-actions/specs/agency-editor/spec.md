## ADDED Requirements

### Requirement: Typed Child Session Creation
The editor SHALL allow users to create typed child sessions from an existing session in Agent Cells.

#### Scenario: Create sub terminal child
- **WHEN** a user invokes `Sub Terminal` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=sub_terminal`

#### Scenario: Create fork child
- **WHEN** a user invokes `Fork` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=fork`
