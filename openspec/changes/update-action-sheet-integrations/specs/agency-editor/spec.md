## ADDED Requirements

### Requirement: Explorer Feed Action Sheet
The Explorer feed SHALL allow users to create an Action Sheet from selected files and a description.
The Action Sheet prompt SHALL include the selection tree as context.

#### Scenario: Create Action Sheet from Explorer selection
- **WHEN** a user selects multiple files and submits a feed description
- **THEN** the editor creates an Action Sheet with the selection tree in the prompt context
- **AND** dispatches the Action Sheet to the selected session

### Requirement: Promote Action Sheet Linkage
The Promote flow SHALL create or bind an Action Sheet and store its id on the promote draft metadata.
The Promote UI SHALL surface the linked Action Sheet state and provide a navigation entry to view it.

#### Scenario: Promote binds Action Sheet
- **WHEN** a user starts Promote with selected items
- **THEN** the editor creates an Action Sheet and stores its id on the draft metadata
- **AND** the Promote modal shows the Action Sheet state

## MODIFIED Requirements

### Requirement: Bulk Promote Pending Items
The Promote flow SHALL dispatch a structured prompt to the selected Agent session when started.
The editor SHALL focus the selected session and open the terminal/workbench so progress is visible.
The Promote modal SHALL surface execution status for the running promote workflow.
The Promote flow SHALL synchronize Action Sheet execution state with the promote gate.

#### Scenario: Start promote dispatch
- **WHEN** a user starts Promote with selected items and a target session
- **THEN** a structured prompt is sent to that session
- **AND** the UI focuses the session terminal
- **AND** the Promote modal shows the execution status
- **AND** the linked Action Sheet state updates with the promote gate
