## ADDED Requirements

### Requirement: Memo Voice Input
The Memo Flash capture UI SHALL provide a voice input control with explicit start and stop actions.
The control SHALL allow selecting a recognition language, defaulting to the browser language when set to Auto.
While recording, the UI SHALL show a recording state and a live transcript preview that includes interim speech and draft segments.
Finalized transcripts SHALL be appended to the Flash text field without discarding existing typed content.
If voice input is unsupported, blocked, or fails, the editor SHALL surface a non-blocking status message with the failure reason and keep manual input available.
When voice input fails to start or crashes, the editor SHALL log a runtime warning with diagnostic context.
On macOS, the editor SHALL prefer native speech recognition when available and fall back to Web Speech when native capture is unavailable.
When language is set to Auto, the editor SHALL surface draft transcripts in the live preview and only commit text after rescoring the full segment audio.
Rescoring SHALL NOT interrupt ongoing capture or prevent subsequent speech from appearing in the live preview.
If auto language detection is uncertain, the editor SHALL rescore using normalized, supported locale candidates before selecting the replacement text.
When voice capture is used to create a Flash memo, the editor SHALL save the original audio alongside the memo and expose playback controls.
The editor SHALL warm up the native speech helper in the background after app ready and log the warmup duration so first capture does not block on helper setup.
When voice capture starts, the editor SHALL emit timing diagnostics for permission checks and audio initialization.

#### Scenario: Capture flash text by voice
- **WHEN** a user starts voice input from the Flash capture UI
- **THEN** the editor records speech and shows transcription progress
- **AND** finalized transcription is appended to the Flash text field after rescore completes

#### Scenario: Stop recording and keep manual input
- **WHEN** a user stops voice input during Flash capture
- **THEN** the editor finalizes the transcript and returns to idle
- **AND** the Flash text field remains editable

#### Scenario: Select recognition language
- **WHEN** a user selects a recognition language in the Flash capture UI
- **THEN** subsequent voice capture uses the selected language
- **AND** the selected value is shown in the UI

#### Scenario: Use macOS native speech recognition
- **WHEN** the editor runs on macOS and native speech recognition is available
- **THEN** voice capture uses the native speech backend

#### Scenario: Auto language detection with rescore
- **WHEN** a user records a Flash memo with language set to Auto
- **THEN** the editor detects the spoken language per segment
- **AND** the editor rescans the full segment audio before committing text to the Flash input

#### Scenario: Rescore does not block live capture
- **WHEN** a user continues speaking while a prior segment is rescoring
- **THEN** the live transcript preview continues updating with new speech

#### Scenario: Save and play Flash audio
- **WHEN** a user saves a Flash memo recorded via voice input
- **THEN** the original audio is stored with the memo
- **AND** the memo UI provides playback controls

#### Scenario: Warm up native speech helper
- **WHEN** the editor finishes app startup on macOS
- **THEN** the speech helper is warmed in the background
- **AND** warmup timing is logged for diagnostics

#### Scenario: Log voice initialization timing
- **WHEN** a user starts voice capture
- **THEN** the editor logs permission and audio initialization timing

#### Scenario: Voice input unavailable
- **WHEN** speech recognition is unsupported, blocked, or errors
- **THEN** the editor shows a fallback status message without blocking the UI
- **AND** manual text input remains usable
