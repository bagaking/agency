## ADDED Requirements
### Requirement: Contextual HIL Drawer Panels
The editor SHALL adjust the right-side HIL drawer content based on the active view.

#### Scenario: Agent Cells default Drafts
- **WHEN** the user is in Agent Cells and opens the HIL drawer
- **THEN** Drafts is the default panel
- **AND** Comments remains available for selection

#### Scenario: Action Sheets and Explorer default Comments
- **WHEN** the user is in Action Sheets or Explorer and opens the HIL drawer
- **THEN** Comments is the default panel
- **AND** Drafts remains available for selection

#### Scenario: Memo view shows Inbox shortcuts
- **WHEN** the user is in Memo and opens the HIL drawer
- **THEN** the drawer hides the Comments and Drafts tabs
- **AND** the drawer shows Inbox shortcuts for Flash notes and Screenshot capture
- **AND** the drawer provides an Open Inbox entry
- **AND** the Memo main Inbox sections remain available in the main pane

### Requirement: Promote Default Session Selection
The editor SHALL default the Promote session selection to the active session when Promote is opened from Agent Cells.

#### Scenario: Promote uses active session
- **WHEN** the user opens Promote from Agent Cells with an active session
- **THEN** the Promote modal selects that session by default

### Requirement: Drafts Drawer Action Sheet Status
The editor SHALL surface Action Sheet execution status for drafts in the HIL drawer.

#### Scenario: Draft Action Sheet running
- **WHEN** a draft has a linked Action Sheet that is running or waiting for a gate in a session
- **THEN** the draft row shows the running state and session label
- **AND** selecting the draft jumps to that session

#### Scenario: Draft Action Sheet idle
- **WHEN** a draft has no linked Action Sheet or its Action Sheet is not running
- **THEN** the draft row indicates no active session
- **AND** selecting the draft opens Memo with that draft selected
- **AND** the drawer offers a run-in-active-session control for that draft

#### Scenario: Quick run in active session
- **WHEN** the user triggers run in active session for a draft
- **THEN** the system creates a default Action Sheet if none is linked
- **AND** the Action Sheet dispatches immediately to the active session without additional confirmation

#### Scenario: No active session available
- **WHEN** there is no active session
- **THEN** the run-in-active-session control is disabled and indicates a session is required
