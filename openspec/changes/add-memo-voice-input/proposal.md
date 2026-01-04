# Change: Add Memo voice input capture

## Why
The Memo drawer currently shows a demo voice button that does not record or transcribe speech. Voice input should be a real capture path to speed up Flash notes without leaving the Memo workflow.

## What Changes
- Add a dedicated voice capture module in the renderer for speech-to-text.
- Integrate voice controls into the Flash capture UI to insert transcribed text.
- Surface recording state and fallback messaging when voice input is unavailable.

## Impact
- Affected spec: `openspec/specs/agency-editor/spec.md`
- Affected UI: Memo drawer Flash shortcut, Memo Inbox Flash section
- Affected code: renderer hooks/components for capture modules
