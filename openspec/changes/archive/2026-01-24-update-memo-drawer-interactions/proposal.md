# Change: Update Memo drawer interaction rules

## Why
Memo drawer shortcut cards currently trigger left-panel navigation and collapse on click, which interrupts inline capture workflows. We need explicit controls for switching the main Memo view while keeping the drawer components interactive.

## What Changes
- Memo drawer shortcut cards stay interactive without switching the main Memo panel on click.
- Add explicit "View Records" actions to switch the main Memo inbox section.
- After a capture is confirmed and a memo record is created, the main Memo panel switches to the corresponding inbox section.

## Impact
- Affected spec: `openspec/specs/agency-editor/spec.md`
- Affected UI: Memo drawer shortcut cards, Memo inbox selection behavior
- Affected code: HIL drawer components and memo capture flow
