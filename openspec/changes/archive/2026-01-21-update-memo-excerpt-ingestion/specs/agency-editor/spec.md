## MODIFIED Requirements
### Requirement: Memo Capture Modes
The Memo view SHALL provide capture actions for Flash note, Excerpt, and Screenshot.
Captured items SHALL be stored as HIL `memo` entries with `meta.noteType` set to the capture type.
Excerpt capture SHALL accept URL input and fetch remote content for extraction.
Excerpt capture SHALL enforce size/time limits and surface failures without creating a memo item.
Screenshot capture SHALL open an in-app capture UI for region selection and annotation, followed by a routing panel.

#### Scenario: Capture a flash note
- **WHEN** a user selects Flash and submits text
- **THEN** the editor creates a `memo` item with `meta.noteType: flash`

#### Scenario: Capture an excerpt from URL
- **WHEN** a user enters a valid URL and starts Excerpt capture
- **THEN** the editor fetches and extracts readable content
- **AND** the editor creates a `memo` item with `meta.noteType: excerpt`
- **AND** the memo metadata includes source URL, title, extracted excerpt summary, word/char counts, and fetch timestamp

#### Scenario: Excerpt fetch fails
- **WHEN** the URL is invalid or fetch/parse fails
- **THEN** the editor reports the error
- **AND** no Excerpt memo is created

#### Scenario: Capture a screenshot via UI
- **WHEN** a user clicks Capture in the Screenshot section
- **THEN** the editor opens a capture overlay for region selection and annotation
- **AND** the editor shows a routing panel to save to HIL, clipboard, or both
