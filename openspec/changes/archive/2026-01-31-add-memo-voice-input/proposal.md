# Change: Add Memo voice input capture

## Why
The Memo drawer currently shows a demo voice button that does not record or transcribe speech. Web Speech works in Chrome but fails in Electron for our environment, so we need a macOS-native capture path to make voice input reliable.

## What Changes
- Add a macOS speech capture backend using the native Speech framework via a helper process.
- Run rescore in an isolated helper process so live capture continues uninterrupted.
- Add IPC wiring so the renderer can start/stop speech capture and receive transcript events.
- Keep Web Speech as a fallback when native capture is unavailable.
- Surface recording state, errors, and diagnostics in the UI and runtime logs.
- Warm up the native speech helper at startup and log initialization timing to reduce first-capture latency.
- Show a live transcript stream with explicit rescore status, and only commit text after rescore completes.
- Tune auto language detection with an early probe and rescore pass before committing text.
- Save original voice audio with Flash memos and offer playback controls.

## Impact
- Affected spec: `openspec/specs/agency-editor/spec.md`
- Affected UI: Memo drawer Flash shortcut, Memo Inbox Flash section
- Affected code: renderer hooks/components, preload IPC, main process services
