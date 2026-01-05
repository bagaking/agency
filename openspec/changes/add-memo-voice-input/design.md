## Context
Memo Flash capture has a placeholder voice action without functionality. Web Speech works in Chrome but fails in our Electron environment, so we need a reliable macOS-native path while keeping manual input intact.

## Goals / Non-Goals
- Goals:
  - Provide speech-to-text capture for Flash notes.
  - Keep the feature self-contained as a reusable module.
  - Preserve existing typed text and avoid blocking manual input.
- Non-Goals:
  - No audio file storage or upload.
  - No external transcription service integration in this iteration.

## Decisions
- Use a macOS Speech helper process (Swift) to capture microphone audio and stream transcripts.
- Expose start/stop and stream events over IPC; keep all renderer access through `agencyBridge`.
- Keep the existing Web Speech module as a fallback when native capture is unavailable or fails.
- Encapsulate recognition logic in a dedicated hook/module that exposes `start`, `stop`, state, and transcript events.
- Insert finalized transcripts into the Flash input by appending text, keeping manual edits available.
- If speech recognition is unsupported or errors, show a non-blocking status and log a runtime warning.
- Provide a language selector with an Auto default that uses the browser language list.

## Risks / Trade-offs
- Requires macOS permissions (microphone + speech recognition) and packaging metadata.
- Helper process adds native build complexity and macOS-only behavior.
- Transcription quality depends on OS language settings and model availability.

## Migration Plan
- Add the macOS helper process and IPC wiring.
- Update the voice capture hook to prefer native capture and fallback to Web Speech.
- Replace the demo voice button with functional controls.

## Open Questions
- None for this iteration.
