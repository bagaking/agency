## ADDED Requirements

### Requirement: Main Agent Harness
The editor SHALL provide a main-process Harness that can coordinate complex tasks through approved host-managed capabilities instead of embedding all orchestration logic in renderer flows or direct tmux/file scripting.

#### Scenario: Start a Harness run
- **WHEN** a caller starts a Harness run with a structured goal and constraints
- **THEN** the host creates a stable run identity
- **AND** records an observable run timeline
- **AND** executes the run through approved host-managed capabilities

#### Scenario: Inspect Harness progress
- **WHEN** a caller inspects an active Harness run
- **THEN** the host returns structured step/timeline/progress data
- **AND** the caller does not need to infer state only from raw logs

#### Scenario: Cancel Harness run
- **WHEN** a caller cancels an active Harness run
- **THEN** the host stops scheduling additional Harness steps
- **AND** records the cancellation in run state and timeline

### Requirement: Host-Managed Capability Plane for Harness
The Harness SHALL invoke productized host-managed capabilities through a stable registry/contract rather than calling raw implementation details directly.

#### Scenario: Harness invokes approved capability
- **WHEN** the Harness needs a host capability such as session runtime orchestration or file intent execution
- **THEN** it routes the request through the capability registry
- **AND** the capability call is recorded as part of the Harness run timeline

### Requirement: Create Agent as Primary Child-Execution Semantic
The editor SHALL treat `Create Agent` as the primary product semantic for creating and coordinating child execution lanes.

#### Scenario: Create Agent for child execution
- **WHEN** the Harness or UI requests child execution
- **THEN** the product uses `Create Agent` semantics to create or prepare a child execution lane
- **AND** tool-native fork behavior remains an optional specialized capability, not the default meaning of child execution
