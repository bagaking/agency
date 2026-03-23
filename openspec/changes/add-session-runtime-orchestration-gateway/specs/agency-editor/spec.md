## MODIFIED Requirements

### Requirement: Typed Child Session Creation
The editor SHALL allow users to create typed child sessions from an existing session in Agent Cells, and `Fork` child creation SHALL be able to invoke a resolved profile-specific orchestration workflow before the child session is considered ready.

#### Scenario: Create sub terminal child
- **WHEN** a user invokes `Sub Terminal` from a session row action menu
- **THEN** the editor creates a child session under that session with `nodeKind=sub_terminal`
- **AND** the child uses the shell baseline profile

#### Scenario: Create plain fork child
- **WHEN** a user invokes `Fork` from a session row action menu and the resolved profile does not enable a smart fork driver
- **THEN** the editor creates a child session under that session with `nodeKind=fork`
- **AND** the child preserves the parent session profile when available

#### Scenario: Create smart fork child
- **WHEN** a user invokes `Fork` from a session row action menu and the resolved profile enables a smart fork driver
- **THEN** the editor routes the request through the host-owned smart fork orchestration workflow
- **AND** the child session is not reported ready until that workflow succeeds

## ADDED Requirements

### Requirement: Session Runtime Orchestration Gateway
The editor SHALL provide a main-process-owned session runtime gateway for deterministic session inspection, input dispatch, wait conditions, and higher-level session orchestration intents.

#### Scenario: Gateway hides tmux details from callers
- **WHEN** a renderer surface, CLI wrapper, or future tool caller requests a session runtime intent
- **THEN** the main process executes the request through one JSON-friendly contract
- **AND** the caller does not need to script tmux directly
- **AND** the result includes structured `success`, `warnings`, `failures`, and operation data

#### Scenario: Gateway preserves caller metadata
- **WHEN** a non-UI caller invokes the session runtime gateway
- **THEN** the request carries caller metadata such as source surface, caller id, and trace id
- **AND** the host can preserve that metadata for audit or policy decisions without changing orchestration semantics

### Requirement: Driver-Based Smart Fork Orchestration
The editor SHALL let resolved Terminus profiles declare a smart fork driver and launch template for tools that require source-side fork coordination before opening the child session.

#### Scenario: Codex smart fork completes
- **WHEN** the resolved profile uses the `codex` smart fork driver and the source session is ready to fork
- **THEN** the host validates the source pane state
- **AND** submits the fork command in the source session
- **AND** waits for fork acknowledgement and extracts the needed fork data
- **AND** creates a `fork` child session
- **AND** renders the configured launch template with extracted values such as `{thread_id}`
- **AND** waits for the child session to reach its ready condition before reporting success

#### Scenario: Smart fork source precondition fails
- **WHEN** the source session is still working, is not in the expected tool TUI, or does not emit the expected fork acknowledgement within timeout
- **THEN** the host aborts the smart fork workflow
- **AND** the editor returns a structured failure explaining the failed precondition or timeout
