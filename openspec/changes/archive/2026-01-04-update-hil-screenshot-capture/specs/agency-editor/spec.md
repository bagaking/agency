## MODIFIED Requirements

### Requirement: Memo Capture Modes
The Memo view SHALL provide capture actions for Flash note, Excerpt, and Screenshot.
Captured items SHALL be stored as HIL `memo` entries with `meta.noteType` set to the capture type.
Screenshot capture SHALL open an in-app capture UI for region selection and annotation, followed by a routing panel.

#### Scenario: Capture a flash note
- **WHEN** a user selects Flash and submits text
- **THEN** the editor creates a `memo` item with `meta.noteType: flash`

#### Scenario: Capture an excerpt
- **WHEN** a user selects Excerpt from a file selection
- **THEN** the editor creates a `memo` item with `meta.noteType: excerpt`
- **AND** stores the excerpt source metadata

#### Scenario: Capture a screenshot via UI
- **WHEN** a user clicks Capture in the Screenshot section
- **THEN** the editor opens a capture overlay for region selection and annotation
- **AND** the editor shows a routing panel to save to HIL, clipboard, or both

### Requirement: Memo Assets Storage
Screenshot memo assets SHALL be stored as PNG under `.agency/hil/assets/<worktree>/` with a stable path recorded in the memo metadata.

#### Scenario: Persist screenshot asset
- **WHEN** a screenshot memo is created
- **THEN** the image asset is saved under the worktree assets directory as a PNG

## ADDED Requirements

### Requirement: Screenshot Routing After Capture
After capture, the editor SHALL present a routing panel that lets the user choose:
- Target project/worktree + Agent Cell (save to HIL)
- Clipboard-only
- Save to HIL and clipboard

#### Scenario: Route capture to HIL
- **WHEN** a user completes a capture and selects a target Agent Cell
- **THEN** the editor saves the screenshot to the selected worktree and creates a memo

#### Scenario: Route capture to clipboard only
- **WHEN** a user completes a capture and chooses clipboard-only
- **THEN** the editor copies the image to clipboard without creating a memo

### Requirement: Capture Window Visibility
The capture flow SHALL allow the user to choose whether Agency windows are visible in the screenshot.

#### Scenario: Hide Agency windows during capture
- **WHEN** a user starts a capture with Agency windows hidden
- **THEN** the overlay hides or minimizes Agency windows before capture

#### Scenario: Include Agency windows during capture
- **WHEN** a user starts a capture with Agency windows visible
- **THEN** the overlay keeps Agency windows visible in the screenshot

### Requirement: Screenshot Capture Session Management
The editor SHALL allow only one active capture session at a time.
The capture session SHALL be bound to the originating window and return the result to that window.

#### Scenario: Single active capture session
- **WHEN** a user starts a capture while another capture is active
- **THEN** the editor rejects or queues the new capture request

#### Scenario: Return capture to originating window
- **WHEN** a capture completes
- **THEN** the result is delivered to the window that initiated the capture
