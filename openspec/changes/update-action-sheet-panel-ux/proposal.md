# Change: Action Sheet Panel UX

## Why
Action Sheets should be visible alongside Agent Cells with consistent navigation, and reusable as an embeddable panel in other flows (Explorer feed, Promote). The current placement under Hierarchy is not discoverable enough for execution monitoring.

## What Changes
- Add a dedicated Action Sheets entry in the left activity bar directly under Agent Cells.
- Render Action Sheets using the standard left/right panel layout (sidebar list + detail pane).
- Make the Action Sheet panel embeddable so other flows (Promote) can show a condensed status view and session jump.

## Impact
- Affected spec: agency-editor
- Affected UI: Activity bar, AppLayout, Promote modal
- Affected components: ActionSheetsView (refactor into reusable panel)
