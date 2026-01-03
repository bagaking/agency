# agency-editor Specification (Delta)

## ADDED Requirements

### Requirement: Memo Dock Navigation
The editor SHALL render the Memo (HIL) view as a split layout with a left dock.
The dock SHALL list a Comment Inbox (Input Box) entry and Draft entries for all HIL drafts.

#### Scenario: View Memo dock
- **WHEN** a user opens the Memo view
- **THEN** the left dock shows Comment Inbox and Drafts
- **AND** the main pane displays the selected dock content

#### Scenario: Switch dock entries
- **WHEN** a user selects a Draft entry from the dock
- **THEN** the main pane shows that Draft's details

#### Scenario: Comment Inbox entry
- **WHEN** a user selects Comment Inbox
- **THEN** the main pane shows pending comment items
