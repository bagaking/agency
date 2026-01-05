# Change: Add Memo voice input capture

## Why
The Memo drawer currently shows a demo voice button that does not record or transcribe speech. Web Speech works in Chrome but fails in Electron for our environment, so we need a macOS-native capture path to make voice input reliable.

## What Changes
- Add a macOS speech capture backend using the native Speech framework via a helper process.
- Add IPC wiring so the renderer can start/stop speech capture and receive transcript events.
- Keep Web Speech as a fallback when native capture is unavailable.
- Surface recording state, errors, and diagnostics in the UI and runtime logs.

## Impact
- Affected spec: `openspec/specs/agency-editor/spec.md`
- Affected UI: Memo drawer Flash shortcut, Memo Inbox Flash section
- Affected code: renderer hooks/components, preload IPC, main process services
