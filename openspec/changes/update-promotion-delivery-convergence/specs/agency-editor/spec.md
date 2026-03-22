## MODIFIED Requirements

### Requirement: Unified Multi-Source Send Semantics
The editor SHALL treat Promote, Explorer send, and session quick-dialog send as one delivery system with different sources.
Delivery metadata SHALL include source identifiers for audit and filtering.

#### Scenario: Promote, Explorer, and session quick-dialog share delivery protocol
- **WHEN** Promote, Explorer, or Session Reply send triggers a delivery
- **THEN** all runs use the same delivery start/confirm/status lifecycle contract
- **AND** each run records its source (`promote`, `explorer`, or `session`)

### Requirement: Delivery Payload Source/Mode Tagging
Quick and gated dispatch payloads SHALL include explicit source/mode tags and structured context references.

#### Scenario: Payload includes source/mode tags for all delivery sources
- **WHEN** any delivery run is dispatched
- **THEN** payload metadata includes source and mode fields
- **AND** references/anchors and session ownership fields are preserved for auditability

### Requirement: Quick Mode Immediate Consumption Policy
Quick runs SHALL consume source selections/items immediately after dispatch ACK.

#### Scenario: Quick ACK consumes source for Promote/Explorer/Session
- **WHEN** a quick run is acknowledged by host dispatch
- **THEN** source items are marked consumed immediately when applicable
- **AND** audit metadata records the ACK timestamp and session ownership context

## ADDED Requirements

### Requirement: Delivery Runtime Path Convergence
Renderer workflows for Promote and Explorer SHALL use the delivery facade APIs (`startDelivery`, `confirmDelivery`, `getDeliveryStatus`, `getDeliveryTimeline`) for delivery orchestration.
Renderer workflows SHALL NOT duplicate draft lifecycle state transitions that are already owned by the delivery domain module.

#### Scenario: Promote dispatch uses delivery APIs
- **WHEN** a user dispatches Promote
- **THEN** the renderer calls delivery facade APIs for run creation and status handling
- **AND** draft/audit records are produced by the shared delivery module

#### Scenario: Explorer dispatch uses delivery APIs
- **WHEN** a user dispatches Explorer send
- **THEN** the renderer calls delivery facade APIs for run creation and status handling
- **AND** quick and gated runs follow the same shared lifecycle primitives

### Requirement: Session Quick Delivery Persistence
Session quick-dialog sends SHALL be persisted as delivery runs under the unified delivery storage contract.
Each run SHALL carry session ownership metadata in record meta.

#### Scenario: Session Reply send creates unified delivery records
- **WHEN** a user sends content from Session Reply
- **THEN** the system creates a unified delivery run with `source=session`
- **AND** the record stores origin/target session ownership metadata in `meta`

#### Scenario: Session Reply send auto-confirms dispatch
- **WHEN** a user sends content from Session Reply
- **THEN** the system dispatches the reply to the target session and triggers one explicit confirm action
- **AND** the reply is not left as unsubmitted text in the target terminal by default

### Requirement: Explicit Dispatch Confirmation Semantics
Programmatic delivery and action-sheet dispatches SHALL use explicit confirm-key behavior for submit actions rather than relying only on raw newline-byte injection.

#### Scenario: Programmatic dispatch submits with explicit confirm behavior
- **WHEN** a delivery or action-sheet run is programmatically dispatched to a terminal session
- **THEN** the host sends the command text to the session
- **AND** submit confirmation is issued as explicit terminal key behavior

### Requirement: Unified Promotion Storage Contract
Delivery runs across all sources SHALL be stored in one converged contract:
- Draft records in HIL draft storage.
- Audit timeline entries in `.agency/delivery/events-<worktree>.jsonl`.

#### Scenario: Multi-source runs are stored in the same contract
- **WHEN** delivery runs are created from different sources
- **THEN** each run is queryable from the same draft + timeline storage model
- **AND** source and session ownership metadata differentiates runs without splitting storage locations
