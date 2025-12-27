# Change: Render sessions as tabs with overflow menu

## Why
Sessions are currently listed vertically, which consumes space and makes active session switching slower.
Closed sessions should not occupy primary space and can be accessed via an overflow menu.

## What Changes
- Render sessions as horizontal tabs in the session header area
- Show closed sessions inside an overflow (three-dot) menu instead of inline
- Preserve existing session actions: select, close, resume

## Impact
- Affected specs: agency-editor
- Affected code: renderer session UI (EditorPane), session selection interactions
