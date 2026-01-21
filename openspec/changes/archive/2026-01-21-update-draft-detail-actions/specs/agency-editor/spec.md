## ADDED Requirements

### Requirement: Create Action Sheet from Draft
The Draft detail view SHALL allow users to create an Action Sheet when none is linked.
The editor SHALL store the created Action Sheet id on the Draft metadata.

#### Scenario: Create Action Sheet from Draft detail
- **WHEN** a user selects Create Action Sheet in Draft detail with no linked sheet
- **THEN** the editor creates an Action Sheet for the Draft
- **AND** stores the Action Sheet id in the Draft metadata
- **AND** the Draft detail shows the Action Sheet status panel

## MODIFIED Requirements

### Requirement: Draft Lifecycle Actions
The Memo draft detail view SHALL allow archiving and deleting drafts.
Destructive actions SHALL require confirmation via the modal system.

#### Scenario: Confirm Draft archive
- **WHEN** a user archives a Draft
- **THEN** the modal system asks for confirmation
- **AND** the Draft status updates only after confirmation

#### Scenario: Confirm Draft delete
- **WHEN** a user deletes a Draft
- **THEN** the modal system asks for confirmation
- **AND** the Draft is removed only after confirmation
