## Context
Memo Flash capture has a placeholder voice action without functionality. Web Speech works in Chrome but fails in our Electron environment, so we need a reliable macOS-native path while keeping manual input intact.

## Goals / Non-Goals
- Goals:
  - Provide speech-to-text capture for Flash notes.
  - Keep the feature self-contained as a reusable module.
  - Preserve existing typed text and avoid blocking manual input.
  - Store original voice audio alongside Flash memos with in-app playback.
  - Improve recognition quality with automatic language detection and a rescore pass when needed.
- Non-Goals:
  - No external transcription service integration in this iteration.

## Decisions
- Use a macOS Speech helper process (Swift) to capture microphone audio and stream transcripts.
- Run rescore jobs in a separate helper process to avoid interrupting live capture.
- Expose start/stop and stream events over IPC; keep all renderer access through `agencyBridge`.
- Keep the existing Web Speech module as a fallback when native capture is unavailable or fails.
- Encapsulate recognition logic in a dedicated hook/module that exposes `start`, `stop`, state, and transcript events.
- Show a live transcript stream that includes interim text and draft segments while recording.
- Commit rescore-completed text into the Flash input, keeping manual edits available.
- Record audio during voice capture and save a copy under `.agency/hil/assets` when a Flash memo is saved.
- Provide a lightweight audio playback affordance for Flash memos that include audio.
- When language is set to Auto, perform a quick early language probe and a slower, higher-confidence switch window.
- On Auto, surface a draft transcript in the live preview and rescore the full segment audio using detected/current/preferred locales before committing text.
- If speech recognition is unsupported or errors, show a non-blocking status and log a runtime warning.
- Provide a language selector with an Auto default that uses the browser language list.
- Normalize locale identifiers and rescore candidates to a consistent set of supported locales.
- Warm up the native speech helper at app ready so first capture avoids on-demand build or Info.plist patch delays.
- Use permission fast-path checks to skip redundant authorization requests when already granted.
- Emit timing diagnostics for warmup, permission checks, and audio engine startup to trace slow starts.

## Risks / Trade-offs
- Requires macOS permissions (microphone + speech recognition) and packaging metadata.
- Helper process adds native build complexity and macOS-only behavior.
- Rescore isolation adds a second native process and temporary segment audio files.
- Transcription quality depends on OS language settings and model availability.
- Audio capture adds storage overhead and lifecycle management for temporary files.

## Migration Plan
- Add the macOS helper process and IPC wiring.
- Update the voice capture hook to prefer native capture and fallback to Web Speech.
- Replace the demo voice button with functional controls.

## Open Questions
- None for this iteration.
