## ADDED Requirements

### Requirement: Action Sheet Storage
The editor SHALL persist Action Sheets under `.agency/action-sheets/<id>/`.
Each Action Sheet SHALL include a plan, prompt bundle, gate/check status, and execution status.

#### Scenario: Create an Action Sheet
- **WHEN** a user starts a new Action Sheet
- **THEN** the editor creates `.agency/action-sheets/<id>/plan.md`
- **AND** writes `prompt.json`, `checks.json`, and `status.json` for the Action Sheet

### Requirement: Action Sheet Prompt Format
The Action Sheet prompt SHALL be assembled with tagged sections for `requirements`, `context`, `checks`, and `done`.

#### Scenario: Assemble Action Sheet prompt
- **WHEN** an Action Sheet is dispatched
- **THEN** the prompt contains `<requirements>`, `<context>`, `<checks>`, and `<done>` sections

### Requirement: Action Sheet Execution and Session Binding
The editor SHALL dispatch Action Sheet prompts to a selected session and record the session binding.
The UI SHALL surface the Action Sheet execution state and allow jumping to the linked session terminal.

#### Scenario: Run an Action Sheet
- **WHEN** a user starts an Action Sheet and selects a session
- **THEN** the editor sends the prompt to that session
- **AND** records the session binding in Action Sheet status
- **AND** the UI shows execution state with a jump-to-terminal control

### Requirement: Action Sheet Conditional Plugin
The Action Sheet runner SHALL support conditional rules to run follow-up actions or repeat until checks pass.
Loops SHALL be bounded by a retry limit and optional cooldown.

#### Scenario: Repeat until checks pass
- **WHEN** a conditional rule evaluates to retry and checks are not passing
- **THEN** the runner waits for the cooldown and re-runs the Action Sheet
- **AND** stops retrying after the configured maximum attempts

### Requirement: Action Sheet Gate Tracking
The editor SHALL update Action Sheet status when checks change and reflect gate results in the UI.

#### Scenario: Gate status updates
- **WHEN** an Action Sheet check transitions to passed or failed
- **THEN** the UI updates the Action Sheet status to reflect the gate results

### Requirement: Promote Draft Execution Visibility
The Memo draft detail view SHALL surface execution status for promoted drafts, including session binding.

#### Scenario: View promote execution status in draft detail
- **WHEN** a user opens a draft created by Promote
- **THEN** the draft detail view shows execution status and the linked session id
