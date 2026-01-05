## Context
Memo Flash capture has a placeholder voice action without functionality. We need a real voice input flow that keeps manual text entry intact and works within the renderer sandbox.

## Goals / Non-Goals
- Goals:
  - Provide speech-to-text capture for Flash notes.
  - Keep the feature self-contained as a reusable module.
  - Preserve existing typed text and avoid blocking manual input.
- Non-Goals:
  - No audio file storage or upload.
  - No external transcription service integration in this iteration.

## Decisions
- Use the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) from the renderer to avoid new backend dependencies.
- Encapsulate recognition logic in a dedicated hook/module that exposes `start`, `stop`, state, and transcript events.
- Insert finalized transcripts into the Flash input by appending text, keeping manual edits available.
- If speech recognition is unsupported or errors, show a non-blocking status and log a runtime warning.
- Provide a language selector with an Auto default that uses the browser language list.

## Risks / Trade-offs
- Web Speech API availability varies by platform; fallback is required.
- Transcription quality depends on OS/browser language settings.

## Migration Plan
- Add the voice capture module and wire it to Flash capture UI.
- Replace the demo voice button with functional controls.

## Open Questions
- None for this iteration.
