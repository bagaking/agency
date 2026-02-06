# Change: Update selection actions menu and idle tracking

## Why
The current selection action bar is basic and includes Copy, but the desired workflow is to route selections to other sessions or capture memos. Idle activity also refreshes too easily (e.g., on session switch), so it does not reflect true inactivity.

## What Changes
- Redesign the selection action UI to be more advanced and workflow-focused.
- Remove Copy from the floating menu; primary actions become Send-to-Session and Create Memo.
- Add a Create Memo action that stores selection text into the memo inbox.
- Redefine idle activity to update only when session output changes by more than a character threshold.
- Align renderer and backend activity tracking with the new threshold.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: terminal selection UI, memo capture flow, session activity tracking, session map config/docs.
