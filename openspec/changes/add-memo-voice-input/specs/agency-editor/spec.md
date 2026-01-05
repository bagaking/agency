## ADDED Requirements

### Requirement: Memo Voice Input
The Memo Flash capture UI SHALL provide a voice input control with explicit start and stop actions.
While recording, the UI SHALL show a recording state and a live transcript preview.
Finalized transcripts SHALL be appended to the Flash text field without discarding existing typed content.
If voice input is unsupported, blocked, or fails, the editor SHALL surface a non-blocking status message and keep manual input available.

#### Scenario: Capture flash text by voice
- **WHEN** a user starts voice input from the Flash capture UI
- **THEN** the editor records speech and shows transcription progress
- **AND** finalized transcription is appended to the Flash text field

#### Scenario: Stop recording and keep manual input
- **WHEN** a user stops voice input during Flash capture
- **THEN** the editor finalizes the transcript and returns to idle
- **AND** the Flash text field remains editable

#### Scenario: Voice input unavailable
- **WHEN** speech recognition is unsupported, blocked, or errors
- **THEN** the editor shows a fallback status message without blocking the UI
- **AND** manual text input remains usable
