## ADDED Requirements

### Requirement: Session Auto Naming Rules
The editor SHALL allow configuring an auto-naming rule for new sessions using placeholder tokens.
The editor SHALL resolve session naming rules by Global -> Project -> Agent scope, with Agent overrides winning.
When a new session is created without an explicit name, the editor SHALL generate a name using the resolved rule.
The editor SHALL support time/date placeholders and sequence counters with optional zero-padding.
The editor SHALL support name lists for template substitution and allow user-defined lists in settings.
If the generated name conflicts with an existing session name in the same Cell, the editor SHALL append a numeric suffix until the name is unique.

#### Scenario: Generate name from rule
- **WHEN** a user creates a new session without providing a name
- **AND** the resolved rule is `"Session {seq:absolute:02} · {time:HHmm}"`
- **THEN** the editor creates a name like `"Session 03 · 1425"`

#### Scenario: Scope overrides
- **WHEN** Global and Project rules are configured
- **AND** the Project rule differs from Global
- **THEN** new sessions use the Project rule

#### Scenario: Name list substitution
- **WHEN** the resolved rule contains `{name:myth:absolute}`
- **THEN** the editor selects the myth name based on the absolute sequence index (wrapping as needed)

### Requirement: Terminal Selection Actions
The terminal view SHALL allow users to select text and keep the selection after mouse release.
When a selection exists, the editor SHALL allow copying the selection via `Cmd+C` on macOS.
When a selection exists, the editor SHALL show a floating action bar with Copy and Send-to-Session actions.
Send-to-Session SHALL dispatch the selected text to a user-chosen session without closing the current view.

#### Scenario: Selection persists
- **WHEN** a user drags to select terminal text and releases the mouse
- **THEN** the selection remains visible until cleared or replaced

#### Scenario: Copy selection
- **WHEN** a selection exists in the terminal
- **AND** the user presses `Cmd+C`
- **THEN** the selected text is copied to the system clipboard

#### Scenario: Send selection to another session
- **WHEN** a selection exists and the user chooses Send-to-Session
- **THEN** the selected text is sent to the chosen session
