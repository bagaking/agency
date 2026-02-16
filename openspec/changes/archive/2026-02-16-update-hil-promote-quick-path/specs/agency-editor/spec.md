## MODIFIED Requirements

### Requirement: Bulk Promote Pending Items
The Promote flow SHALL provide two execution modes:
- `Quick` (default): one-step draft creation and direct structured dispatch.
- `Gated` (advanced): Action Sheet-linked execution with gate tracking.
The Promote UI SHALL use unified send semantics with explicit source/mode metadata.

#### Scenario: Start quick promote dispatch
- **WHEN** a user starts Promote in quick mode with selected items and target session
- **THEN** a structured send is dispatched directly
- **AND** the run is tagged with `source=promote` and `mode=quick`

#### Scenario: Start gated promote dispatch
- **WHEN** a user starts Promote in gated mode
- **THEN** Action Sheet linkage is created or reused
- **AND** gate status is reflected in execution state

### Requirement: Promote Execution Status Tracking
The editor SHALL record execution status on draft metadata with source/mode context.
For gated mode, completion gating SHALL require `meta.promoted: true` AND `meta.executionStatus: complete` before final confirmation.

#### Scenario: Track quick promote status
- **WHEN** quick dispatch is initiated and acknowledged
- **THEN** metadata records mode-aware status transitions and timestamps

#### Scenario: Gate waits for completion in gated mode
- **WHEN** gated run is in progress
- **THEN** final confirmation remains disabled until completion criteria are satisfied

## ADDED Requirements

### Requirement: Unified Multi-Source Send Semantics
The editor SHALL treat Promote and Explorer send as one delivery system with different sources.
Delivery metadata SHALL include source identifiers for audit and filtering.

#### Scenario: Promote and Explorer share delivery protocol
- **WHEN** Promote or Explorer triggers a send
- **THEN** both use the same delivery protocol and status lifecycle
- **AND** each run records its source (`promote` or `explorer`)

### Requirement: Explorer Send Quick Default
Explorer selection send SHALL default to quick mode and dispatch without mandatory Action Sheet creation.

#### Scenario: Explorer quick send
- **WHEN** a user sends selected Explorer files with instruction text
- **THEN** the system dispatches a quick delivery run to the selected session
- **AND** marks the run as `source=explorer`, `mode=quick`

### Requirement: Optional Gated Explorer Send
Explorer send SHALL provide an optional gated mode for strict workflows.
Gated explorer runs SHALL use Action Sheet linkage and gate-aware status.

#### Scenario: Explorer gated send
- **WHEN** a user selects gated mode from Explorer send advanced options
- **THEN** the run is linked to an Action Sheet
- **AND** status follows gate-aware transitions

### Requirement: Delivery Payload Source/Mode Tagging
Quick and gated dispatch payloads SHALL include explicit source/mode tags and structured context references.

#### Scenario: Payload includes source/mode tags
- **WHEN** any delivery run is dispatched
- **THEN** payload metadata includes source and mode fields
- **AND** references/anchors are preserved for auditability

### Requirement: Quick Mode Immediate Consumption Policy
Quick runs SHALL consume source selections/items immediately after dispatch ACK.

#### Scenario: Quick ACK consumes source
- **WHEN** a quick run is acknowledged by host dispatch
- **THEN** source items are marked consumed immediately
- **AND** audit metadata records the ACK timestamp
