## ADDED Requirements

### Requirement: Action Sheet Archive
The editor SHALL allow Action Sheets to be archived.
Archived Action Sheets SHALL be hidden from the default list and accessible via an archived filter.

#### Scenario: Archive an Action Sheet
- **WHEN** a user archives an Action Sheet
- **THEN** the Action Sheet status is marked archived
- **AND** it is hidden from the default Action Sheet list

#### Scenario: View archived Action Sheets
- **WHEN** a user enables the archived filter
- **THEN** archived Action Sheets appear in the list

### Requirement: Action Sheet Delete
The editor SHALL allow Action Sheets to be deleted with confirmation.
Deleting an Action Sheet SHALL remove its persisted data from disk and update the UI selection.

#### Scenario: Delete an Action Sheet
- **WHEN** a user confirms delete on an Action Sheet
- **THEN** the Action Sheet directory is removed
- **AND** the list refreshes and the selection is cleared if it pointed to the deleted sheet
