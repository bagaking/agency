# Change: HIL Screenshot Capture UI

## Why
Clipboard-only screenshot capture is fragile and opaque. A dedicated capture UI (region select + annotation) gives users reliable, explicit screenshots and better context for memos.

## What Changes
- Replace clipboard-driven screenshot capture with an in-app capture flow: region select, annotate, confirm.
- Persist the captured image into the HIL assets directory and store metadata on the memo item.
- Keep the existing memo data model; only the capture pipeline changes.

## Impact
- Affected spec: agency-editor
- Affected UI: Memo Inbox Screenshot section
- Affected services: screenshot capture, asset storage
