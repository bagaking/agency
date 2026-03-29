> Superseded by `refactor-commander-unified-station`.
>
> Keep this delta only as historical context. The canonical Commander delta now lives under the unified Commander station change.
>
> The detailed body below is historical only and MUST NOT be treated as an active delta.

## ADDED Requirements

### Requirement: Commander-Backed Session Context Actions
The editor SHALL expose Commander-backed session actions from the Agent Cells session context menu only when Commander is ready for that project/session context.

#### Scenario: Commander-backed actions appear only when ready
- **WHEN** a user opens the session row context menu
- **AND** Commander readiness is true for the current project
- **THEN** the menu shows `Smart Fork [by commander]`
- **AND** the menu shows `Smart Name [by commander]`

#### Scenario: Commander-backed actions stay hidden when not ready
- **WHEN** a user opens the session row context menu
- **AND** Commander readiness is false because provider configuration is incomplete or the backend probe failed
- **THEN** the menu does not show `Smart Fork [by commander]`
- **AND** the menu does not show `Smart Name [by commander]`
- **AND** local non-Commander actions remain available

#### Scenario: Smart fork stays hidden for unsupported source sessions
- **WHEN** a user opens the session row context menu
- **AND** Commander readiness is true
- **AND** the current source session has neither a true smart-fork path nor a concrete child launch path
- **THEN** the menu does not show `Smart Fork [by commander]`
- **AND** other eligible local or Commander-backed actions may still be shown

### Requirement: Commander Readiness Gate For Session Actions
The editor SHALL compute Commander readiness for session context actions from both provider configuration completeness and a lightweight backend/provider connectivity probe.

#### Scenario: Configuration incomplete
- **WHEN** required Commander provider settings are missing
- **THEN** Commander readiness is false

#### Scenario: Connectivity probe fails
- **WHEN** required Commander provider settings are present
- **AND** the lightweight backend/provider probe fails
- **THEN** Commander readiness is false

#### Scenario: Configuration and probe both succeed
- **WHEN** required Commander provider settings are present
- **AND** the lightweight backend/provider probe succeeds
- **THEN** Commander readiness is true

### Requirement: Commander-Backed Smart Session Naming
The editor SHALL provide a bounded Commander-backed smart session naming flow that derives short candidate names from current session context and applies the chosen result through the existing session rename path.

#### Scenario: Suggest session names from recent context
- **WHEN** a user invokes `Smart Name [by commander]` from a session row context menu
- **THEN** the editor sends bounded current-session context to Commander
- **AND** Commander returns 1 to 3 short candidate names

#### Scenario: Apply selected smart name
- **WHEN** the user selects one Commander-provided candidate
- **THEN** the editor renames the session through the existing rename flow
- **AND** the new name persists in the session registry

#### Scenario: Smart naming does not auto-apply without confirmation
- **WHEN** Commander returns candidate names
- **THEN** the editor does not rename the session until the user explicitly picks a candidate

## MODIFIED Requirements

### Requirement: Typed Child Session Creation
The editor SHALL allow users to create typed child sessions from an existing session in Agent Cells.
The editor SHALL present Commander-backed smart fork as a distinct session-row action when Commander readiness is true.

#### Scenario: Create sub terminal child
- **WHEN** a user invokes `Sub Terminal` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=sub_terminal`
- **AND** the child uses the shell baseline profile

#### Scenario: Create smart fork child by Commander
- **WHEN** a user invokes `Smart Fork [by commander]` from a session row action menu
- **THEN** the editor starts the Commander-backed Harness `Create Agent` specialization for fork
- **AND** the action is visually labeled as Commander-owned in the menu
