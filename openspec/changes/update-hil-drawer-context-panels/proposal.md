# Change: Contextualize HIL drawer panels

## Why
The right-side HIL drawer currently shows the same content across views, which duplicates Memo content and slows down Draft-focused workflows in Agent Cells. Promote also benefits from a sensible default session selection.

## What Changes
- Make the HIL drawer default panel view-specific (Agent Cells -> Drafts; Action Sheets/Explorer -> Comments).
- In Memo view, replace the Comments/Drafts tabs with Inbox shortcut actions (Flash, Screenshot) and an Open Inbox entry.
- Keep the Memo main Inbox inputs intact; drawer shortcuts are supplemental.
- When Promote is opened from Agent Cells, default the selected session to the active session when available.

## Impact
- Affected specs: agency-editor
- Affected code: HIL drawer panel selection, Promote modal session selection, Memo drawer content

## Non-Goals
- Voice input and append flows for Flash (follow-up change).
