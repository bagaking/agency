# Design: HIL Promote Workflow with Session Gates

## Promote Flow (Global)
- A single Promote entry lives in the HIL drawer (global scope).
- Selecting Promote opens a modal that:
  - Shows pending comments list and required draft description.
  - Requires the user to select a target Agent session (or create a temporary session).
  - Displays gate status for the session (waiting/ready/failed).

## Draft Completion Gate
- Draft completion is detected by watching the HIL draft item in `.agency/hil/index-<worktree>.yaml`.
- The modal stays in a waiting state until the draft is marked complete (e.g. `meta.promoted: true` and all draft TODOs checked).
- Only when the draft is complete does the modal enable the confirm action.

## Consumption Rules
- Confirming Promote:
  - Marks selected comments as `meta.processed: true`.
  - Records a reference from each comment to the draft (e.g. `meta.promotedDraftId`).
  - Records the draft id in the promote event metadata for traceability.

## Session Handling
- The modal requires a session selection:
  - Default: current active session if available.
  - Option to create a new temporary session.
- The UI must surface session name and status, and show a waiting gate while the session completes the draft work.

## UI Responsibilities
- Remove per-comment Promote actions.
- Comment rows show only local actions (resolve/reopen, todo flag).
- Promote entry and modal are globally scoped in the HIL drawer.
