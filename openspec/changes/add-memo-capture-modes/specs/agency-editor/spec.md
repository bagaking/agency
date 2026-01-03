## ADDED Requirements

### Requirement: Memo Capture Modes
The Memo view SHALL provide capture actions for Flash note, Excerpt, and Screenshot.
Captured items SHALL be stored as HIL `memo` entries with `meta.noteType` set to the capture type.

#### Scenario: Capture a flash note
- **WHEN** a user selects Flash and submits text
- **THEN** the editor creates a `memo` item with `meta.noteType: flash`

#### Scenario: Capture an excerpt
- **WHEN** a user selects Excerpt from a file selection
- **THEN** the editor creates a `memo` item with `meta.noteType: excerpt`
- **AND** stores the excerpt source metadata

#### Scenario: Capture a screenshot
- **WHEN** a user captures or imports a screenshot in Memo
- **THEN** the editor creates a `memo` item with `meta.noteType: screenshot`
- **AND** stores an asset reference for the image

### Requirement: Memo Assets Storage
Screenshot memo assets SHALL be stored under `.agency/hil/assets/<worktree>/` with a stable path recorded in the memo metadata.

#### Scenario: Persist screenshot asset
- **WHEN** a screenshot memo is created
- **THEN** the image asset is saved under the worktree assets directory

### Requirement: Promote Memo Items into Drafts
Memo items SHALL be eligible for selection in the Promote flow and referenced by drafts.

#### Scenario: Promote memo item
- **WHEN** a user selects memo items during Promote
- **THEN** the draft references those memo item ids
