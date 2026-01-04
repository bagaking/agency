## ADDED Requirements

### Requirement: Memo Voice Input
The Memo Flash capture UI SHALL provide a voice input control that records speech and converts it to text.
Finalized transcripts SHALL be inserted into the Flash text field without discarding existing typed content.
If voice input is unsupported or fails, the editor SHALL surface a non-blocking status message and keep manual input available.

#### Scenario: Capture flash text by voice
- **WHEN** a user starts voice input from the Flash capture UI
- **THEN** the editor records speech and shows transcription progress
- **AND** finalized transcription is inserted into the Flash text field

#### Scenario: Voice input unavailable
- **WHEN** speech recognition is unsupported or errors
- **THEN** the editor shows a fallback status message
- **AND** manual text input remains usable
