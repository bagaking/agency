# Change: Draft Detail Actions

## Why
Draft archive/delete actions lack confirmation, and drafts without Action Sheets have no path to create one, leaving the flow incomplete.

## What Changes
- Require confirmation for Draft archive/delete actions using the modal system.
- Add “Create Action Sheet” in Draft detail when no sheet is linked.
- Bind newly created Action Sheets to the Draft metadata and surface the status panel.

## Impact
- Affected specs: agency-editor
- Affected UI: Memo Draft detail, modal system
- Affected services: HIL update + Action Sheet create/bind
