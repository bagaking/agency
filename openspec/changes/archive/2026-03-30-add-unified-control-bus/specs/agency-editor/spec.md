## ADDED Requirements

### Requirement: Unified Local Control Bus
The editor SHALL provide one host-owned local control bus for automation and external tooling.
The control bus SHALL expose one normalized request/response contract across its supported transports.

#### Scenario: CLI and socket use the same contract
- **WHEN** a local caller invokes the control bus through the CLI wrapper or the local socket transport
- **THEN** both transports accept the same operation envelope shape
- **AND** both transports return the same normalized success/failure schema

#### Scenario: Control bus stays local-only in v1
- **WHEN** the first production slice of the control bus is shipped
- **THEN** the bus is scoped to local host transports only
- **AND** the product does not present it as a remote multi-user network API

### Requirement: Control Bus Uses Canonical Object References
The control bus SHALL align with the canonical object model and SHALL make object references explicit in supported operations.
At minimum, the bus SHALL support canonical references for `Window`, `Project`, `Cell`, `Session`, and `Run` when those objects are relevant to the operation.

#### Scenario: Operation targets a session and run context
- **WHEN** a caller requests a run or session-related operation through the control bus
- **THEN** the request identifies the relevant object references explicitly instead of hiding them inside transport-specific payload conventions

### Requirement: Control Bus Routes Through Existing Capability Owners
The control bus SHALL remain a dispatcher over existing host-owned capability owners rather than becoming a new direct side-effect owner.

#### Scenario: File operation goes through File Intent
- **WHEN** a caller requests a file interaction through the control bus
- **THEN** the control bus routes the request through the File Intent capability owner
- **AND** file safety, permission, and conflict semantics remain those of File Intent

#### Scenario: Session orchestration goes through Session Runtime or Harness
- **WHEN** a caller requests session orchestration or run control through the control bus
- **THEN** the control bus routes the request through Session Runtime or Main Agent Harness as appropriate
- **AND** the bus does not bypass those host-owned capability seams

### Requirement: Control Bus Trust And Caller Metadata Stay Explicit
The control bus SHALL preserve transport-derived trust and caller-declared identity as distinct concepts.

#### Scenario: Trusted local host caller invokes the bus
- **WHEN** a local CLI or socket caller invokes the control bus
- **THEN** the request is tagged with explicit transport trust/access scope metadata
- **AND** caller-declared metadata remains available for audit and policy decisions

### Requirement: Unified Control Bus Operation Set
The first shipped control-bus slice SHALL provide one namespaced operation set over the already-shipped host seams.
At minimum, the initial operation set SHALL cover:
- window shell control
- file intent operations
- session runtime operations
- main agent harness run operations

#### Scenario: Caller controls a window through the bus
- **WHEN** a local caller requests a window-shell operation through the control bus
- **THEN** the bus performs the operation through the window-shell capability owner
- **AND** the response includes normalized result data for the affected window shell

#### Scenario: Caller starts a run through the bus
- **WHEN** a local caller requests run creation through the control bus
- **THEN** the bus starts the run through Main Agent Harness
- **AND** the response returns normalized run data including the resulting `runId`
