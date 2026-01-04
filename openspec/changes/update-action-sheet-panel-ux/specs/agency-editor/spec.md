## ADDED Requirements

### Requirement: Action Sheet Activity Bar Entry
The editor SHALL provide an Action Sheets entry in the activity bar directly below Agent Cells.

#### Scenario: Open Action Sheets from activity bar
- **WHEN** a user selects Action Sheets in the activity bar
- **THEN** the editor shows the Action Sheets panel

### Requirement: Action Sheet Panel Layout
The Action Sheets view SHALL use the standard left/right layout with a list panel and detail panel.

#### Scenario: View Action Sheet list and details
- **WHEN** the Action Sheets view is active
- **THEN** the left panel lists Action Sheets
- **AND** the right panel shows details for the selected Action Sheet

### Requirement: Action Sheet Panel Embedding
The Action Sheet panel SHALL be embeddable in other flows to display status, retry, and session jump controls.

#### Scenario: Show Action Sheet status in Promote
- **WHEN** the Promote modal is open with a linked Action Sheet
- **THEN** a compact Action Sheet status panel is shown
- **AND** users can jump to the linked session terminal

#### Scenario: Show Action Sheet status in Draft detail
- **WHEN** a draft detail view is open with a linked Action Sheet
- **THEN** a compact Action Sheet status panel is shown
- **AND** users can retry the Action Sheet or jump to the linked session terminal
