## MODIFIED Requirements

### Requirement: Bulk Promote Pending Items
The Promote flow SHALL dispatch a structured prompt to the selected Agent session when started.
The editor SHALL focus the selected session and open the terminal/workbench so progress is visible.
The Promote modal SHALL surface execution status for the running promote workflow.

#### Scenario: Start promote dispatch
- **WHEN** a user starts Promote with selected items and a target session
- **THEN** a structured prompt is sent to that session
- **AND** the UI focuses the session terminal
- **AND** the Promote modal shows the execution status

## ADDED Requirements

### Requirement: Promote Execution Status Tracking
The editor SHALL record promote execution status on the draft metadata.
Completion gating SHALL require `meta.promoted: true` AND `meta.executionStatus: complete` before enabling confirmation.

#### Scenario: Gate waits for execution completion
- **WHEN** the promote workflow is running
- **THEN** the confirm action remains disabled until execution status is complete

### Requirement: Promote Prompt Bundle
The editor SHALL generate a prompt bundle that includes the draft description, selected item references, and file anchors.
The prompt bundle SHALL be stored alongside the draft metadata for auditability.

#### Scenario: Prompt bundle stored
- **WHEN** Promote starts
- **THEN** the draft metadata stores the prompt bundle that was dispatched
