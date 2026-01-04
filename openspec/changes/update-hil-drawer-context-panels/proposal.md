# Change: Contextualize HIL drawer panels

## Why
The right-side HIL drawer currently shows the same content across views, which duplicates Memo content and slows down Draft-focused workflows in Agent Cells. Promote also benefits from a sensible default session selection.

## What Changes
- Make the HIL drawer panel defaults view-specific (Agent Cells -> Drafts; Action Sheets/Explorer -> Comments) while preserving per-view user selection and keeping forced opens (comments/promote) from overwriting the preference.
- Add a Drafts panel to the drawer with lightweight draft listings and memo navigation.
- In Memo view, replace the Comments/Drafts tabs with Inbox shortcut actions (Flash, Screenshot) and an Open Inbox entry that navigates the main pane.
- Keep the Memo main Inbox inputs intact; drawer shortcuts are supplemental only.
- When Promote is opened from Agent Cells, default the selected session to the active session; other views fall back to last selection or first available session.

## Impact
- Affected specs: agency-editor
- Affected code: HIL drawer panel selection + UI state, Drafts panel, Promote modal session selection, Memo drawer content

## Non-Goals
- Voice input and append flows for Flash (follow-up change).
