## MODIFIED Requirements

### Requirement: Screenshot Memo Capture in Inbox
The Screenshot section SHALL open an in-app capture UI for region selection and annotation.
The capture result SHALL be saved as a PNG asset and recorded on the memo item.

#### Scenario: Capture screenshot memo via UI
- **WHEN** a user clicks Capture in the Screenshot section
- **THEN** the editor opens a capture overlay for region selection and annotation
- **AND** saves the PNG under `.agency/hil/assets/<worktree>/`
- **AND** records the asset metadata on the memo item
