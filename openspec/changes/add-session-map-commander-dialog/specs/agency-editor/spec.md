## ADDED Requirements

### Requirement: Session Map Commander Dialog
The editor SHALL provide a clickable Commander identity in docked Session Map that opens a Commander dialog as a popup over Session Map.

#### Scenario: Open commander dialog from commander identity
- **WHEN** a user clicks the Commander avatar or identity block in docked Session Map
- **THEN** the editor opens a Commander dialog as a separate popup over Session Map
- **AND** the user does not need to leave Session Map to access it

#### Scenario: Close commander dialog
- **WHEN** a user dismisses the Commander dialog
- **THEN** the popup closes without replacing or losing the underlying `Ops` panel context

### Requirement: Commander Dialog Context Binding
The Commander dialog SHALL bind to the current focused session and active Harness run when available.
The dialog SHALL present that context with concise session identity rather than redundant low-value metadata.

#### Scenario: Focused session shown in commander dialog
- **WHEN** a Session Map focus session exists
- **THEN** the Commander dialog shows the current session identity as part of its context header
- **AND** the dialog may use the session avatar as part of that identity

#### Scenario: Active harness run shown in commander dialog
- **WHEN** an active Harness run exists for the current project/window
- **THEN** the Commander dialog includes that run as part of its operational context
- **AND** the user can ask about the run without restating its identity manually

### Requirement: Commander Dialog Is Distinct From Session Reply
The Commander dialog SHALL remain a backend-facing orchestration and diagnostics surface.
It SHALL NOT be treated as the same interaction surface as Session Reply.

#### Scenario: Commander dialog does not reuse reply semantics
- **WHEN** a user opens the Commander dialog
- **THEN** the editor does not present it as a session-to-session reply workflow
- **AND** Commander interactions are not implicitly stored or dispatched as session reply memos

### Requirement: Commander Dialog Uses Bounded Operational Actions
The Commander dialog SHALL use current Harness/session evidence and approved host-managed capability paths for any imperative actions.

#### Scenario: Explain current run failure
- **WHEN** a user asks why the current run failed
- **THEN** the Commander dialog can answer using current Harness timeline, capability-call records, and latest operational evidence
- **AND** the answer does not require the user to inspect raw logs manually first

#### Scenario: Typed prompt stays bounded
- **WHEN** a user enters free-form text in the Commander dialog
- **THEN** the dialog answers within current session/run scope
- **AND** it does not behave like an unconstrained general-purpose chat assistant

#### Scenario: Invoke bounded commander action
- **WHEN** a user triggers an operational action from the Commander dialog such as inspect, retry, or cancel
- **THEN** the editor routes that action through approved host-managed capabilities or Harness lifecycle operations
- **AND** the dialog does not directly execute raw tmux/file/browser internals
