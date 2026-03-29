## ADDED Requirements

### Requirement: Commander Unified Operator Station
The editor SHALL treat Commander as one bounded operator capability spanning the Session Map operational station and Commander-owned session actions.
The editor SHALL preserve clear renderer/main/Harness boundaries while presenting Commander as one coherent product family.

#### Scenario: Commander reads as one capability across surfaces
- **WHEN** a user encounters Commander in Session Map and in Agent Cells Commander-owned actions
- **THEN** those entrypoints read as parts of the same Commander capability
- **AND** the user does not need to infer separate product identities for each surface

#### Scenario: Commander remains bounded instead of becoming a global assistant
- **WHEN** a user uses Commander features
- **THEN** the editor keeps Commander scoped to its approved operational surfaces and actions
- **AND** the editor does not present Commander as an unconstrained window-global chat assistant

### Requirement: Commander Station Visual System
The editor SHALL use a consistent Commander visual language across the Session Map `Ops` rail, the Session Map `Briefing` panel, the Commander entry surface, Commander-owned task sheets, and Commander-owned action affordances.

#### Scenario: Session Map commander surfaces share one visual identity
- **WHEN** a user opens and closes Commander from docked Session Map
- **THEN** the entry surface, `Ops` rail, and `Briefing` panel share one Commander identity, tone, and ownership language

#### Scenario: Commander-owned actions use consistent ownership cues
- **WHEN** a user opens a session row menu containing Commander-backed actions
- **THEN** the Commander-owned actions use ownership cues consistent with the main Commander station
- **AND** they do not read like unrelated local actions

### Requirement: Commander Execution Modes Stay Explicit
The editor SHALL distinguish between evidence-backed local Commander briefing and provider-backed Commander actions without presenting them as unrelated products.

#### Scenario: Briefing answers from local evidence
- **WHEN** a user asks Commander for current status, failure explanation, or next-step guidance
- **THEN** the editor may answer from current session/run/error evidence without requiring a provider round-trip
- **AND** the response remains bounded to current operational context

#### Scenario: Commander-backed action routes through Harness
- **WHEN** a user invokes a Commander-backed action such as Smart Fork or Smart Name
- **THEN** the editor routes the action through Harness and approved host-managed capability paths
- **AND** the UI presents that action as Commander-owned execution rather than local renderer improvisation

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
The editor SHALL compute Commander readiness for Commander-backed session actions from both provider configuration completeness and a lightweight backend/provider connectivity probe.

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
The editor SHALL present Commander-backed smart fork as a distinct session-row action when Commander readiness is true and session suitability requirements are satisfied.

#### Scenario: Create sub terminal child
- **WHEN** a user invokes `Sub Terminal` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=sub_terminal`
- **AND** the child uses the shell baseline profile

#### Scenario: Create smart fork child by Commander
- **WHEN** a user invokes `Smart Fork [by commander]` from a session row action menu
- **THEN** the editor starts the Commander-backed Harness `Create Agent` specialization for fork
- **AND** the action is visually labeled as Commander-owned in the menu
