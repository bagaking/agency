## MODIFIED Requirements

### Requirement: Memo Voice Input
The Memo Flash capture UI SHALL provide a voice input control with explicit start and stop actions.
The control SHALL allow selecting a recognition language, defaulting to the browser language when set to Auto.
While recording, the UI SHALL show a recording state and a live transcript preview.
Finalized transcripts SHALL be appended to the Flash text field without discarding existing typed content.
If voice input is unsupported, blocked, or fails, the editor SHALL surface a non-blocking status message with the failure reason and keep manual input available.
When voice input fails to start or crashes, the editor SHALL log a runtime warning with diagnostic context.

#### Scenario: Capture flash text by voice
- **WHEN** a user starts voice input from the Flash capture UI
- **THEN** the editor records speech and shows transcription progress
- **AND** finalized transcription is appended to the Flash text field

#### Scenario: Stop recording and keep manual input
- **WHEN** a user stops voice input during Flash capture
- **THEN** the editor finalizes the transcript and returns to idle
- **AND** the Flash text field remains editable

#### Scenario: Select recognition language
- **WHEN** a user selects a recognition language in the Flash capture UI
- **THEN** subsequent voice capture uses the selected language
- **AND** the selected value is shown in the UI

#### Scenario: Voice input unavailable
- **WHEN** speech recognition is unsupported, blocked, or errors
- **THEN** the editor shows a fallback status message without blocking the UI
- **AND** manual text input remains usable
