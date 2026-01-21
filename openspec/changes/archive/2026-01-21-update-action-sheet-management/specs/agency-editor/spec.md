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

### Requirement: Global Modal System
The editor SHALL provide a unified modal system for confirmations and notices.
New confirmation dialogs SHALL use the modal system instead of native dialogs.

#### Scenario: Confirm a destructive action
- **WHEN** a user initiates a destructive action
- **THEN** the modal system presents a confirm dialog with explicit cancel/confirm actions

### Requirement: Embedded Action Sheet Missing State
When an embedded Action Sheet reference no longer exists, the UI SHALL hide the embedded panel.

#### Scenario: Linked Action Sheet is deleted
- **WHEN** a linked Action Sheet is deleted
- **THEN** embedded Action Sheet panels disappear instead of showing stale data

### Requirement: Draft Lifecycle Actions
The Memo draft detail view SHALL allow archiving and deleting drafts.
Deleting a draft SHALL remove it from the HIL index and local draft artifacts.

#### Scenario: Archive a draft
- **WHEN** a user archives a draft
- **THEN** the draft status updates to archived

#### Scenario: Delete a draft
- **WHEN** a user confirms delete on a draft
- **THEN** the draft is removed from `.agency/hil/<worktree>/drafts/`
- **AND** the draft no longer appears in the dock
