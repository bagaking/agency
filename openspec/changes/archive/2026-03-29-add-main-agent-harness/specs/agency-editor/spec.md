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

#### Scenario: Runner specialization uses approved skill pack
- **WHEN** a runner needs a complex tool-native specialization such as terminal-aware fork/resume orchestration
- **THEN** it uses an approved runner skill pack or playbook
- **AND** the resulting side effects still flow through host-managed capabilities instead of raw tmux/file calls

### Requirement: Transport-Derived Trust And Run Ownership
The Harness SHALL derive trust and run visibility from host transport context and stored ownership metadata, not from caller metadata declared inside payloads.

#### Scenario: Renderer cannot claim trusted host CLI privileges
- **WHEN** a renderer caller sends payload metadata that claims `callerType=cli` or `sourceSurface=main-agent-harness-cli`
- **THEN** the Harness still evaluates capability grants from host-derived transport trust
- **AND** renderer callers do not receive trusted-host capability access

#### Scenario: Process-scoped runs stay invisible to renderer windows
- **WHEN** a trusted host CLI run is process-scoped rather than window-owned
- **THEN** renderer windows do not receive its progress stream by default
- **AND** renderer inspect/list/cancel/resume calls cannot operate on that run

### Requirement: Agent-Backed Runner Execution
The Harness SHALL support an agent-backed runner as the default production execution path, keeping any reference/test runner out of the main product flow.

#### Scenario: Harness uses default agent-backed runner
- **WHEN** a caller starts a `Create Agent` run without explicitly selecting a test-only runner
- **THEN** the host executes the run through the default agent-backed runner
- **AND** the runner consumes approved skill-pack descriptors and host-managed capabilities
- **AND** the control plane keeps ownership of run state, policy, and observability

#### Scenario: Agent-backed runner uses Codex provider for Fork specialization
- **WHEN** Agent Cells starts a `Create Agent` run with the `session.tool-native-fork` specialization
- **THEN** the default agent-backed runner plans that bounded step through the Codex CLI provider
- **AND** the provider returns a structured capability decision instead of directly mutating tmux or files
- **AND** the resulting session/file side effects still execute through host-managed capabilities

### Requirement: Global Harness Provider Settings
The editor SHALL expose a global Harness provider settings surface for the default Codex provider instead of requiring users to rely on unrelated shell or personal Codex config state.

#### Scenario: User configures the global Codex provider
- **WHEN** a user opens the Harness provider settings UI
- **THEN** the product exposes global fields for `base_url`, `model`, and `OPENAI_API_KEY`
- **AND** it also supports optional `model_reasoning_effort`, `model_context_window`, and `model_auto_compact_token_limit`
- **AND** the resulting settings are persisted as Agency-owned global configuration

#### Scenario: Codex provider uses Agency-owned settings instead of ambient provider env
- **WHEN** the global Codex provider settings are complete
- **THEN** the `codex_cli` provider launches with Agency-owned provider overrides
- **AND** it does not depend on unrelated ambient provider env such as `PP_CODEX`
- **AND** missing required settings fail with a user-facing configuration error rather than an opaque provider startup error

### Requirement: Create Agent as Primary Child-Execution Semantic
The editor SHALL treat `Create Agent` as the primary product semantic for creating and coordinating child execution lanes.
This semantic SHALL remain distinct from `Create Cell`, which owns worktree-bound workspace creation.

#### Scenario: Create Agent for child execution
- **WHEN** the Harness or UI requests child execution
- **THEN** the product uses `Create Agent` semantics to create or prepare a child execution lane
- **AND** tool-native fork behavior remains an optional specialized capability, not the default meaning of child execution

#### Scenario: Agent Cells fork uses Create Agent specialization
- **WHEN** a caller invokes `Fork` from Agent Cells
- **THEN** the product starts a Harness run with `Create Agent` semantics
- **AND** any tool-native fork behavior is modeled as a specialization under that run rather than as the Harness core contract

#### Scenario: Fast terminal run completion still reconciles to the initiating UI request
- **WHEN** a renderer starts a `Create Agent` run and the run finishes before the renderer receives the final `runId`-based progress event
- **THEN** the initiating request still reconciles by a stable client request identity
- **AND** the renderer selects or surfaces the final child-session result without silently dropping completion
