# Change: HIL Promote Execution Workflow

## Why
The current Promote flow only creates drafts and switches sessions. It does not dispatch structured instructions to the selected Agent session, nor does it surface execution progress in the UI. This makes the Promote workflow incomplete and hard to track.

## What Changes
- Add a Promote execution step that generates a structured prompt from selected items and the draft description.
- Dispatch the prompt to the chosen Agent session and focus the terminal/workbench to show progress.
- Surface execution state in the Promote modal (queued/running/complete/failed) and record execution metadata on the draft.

## Impact
- Affected spec: agency-editor
- Affected UI: HIL Promote modal, Agent session focus behavior
- Affected services: HIL draft metadata, session dispatch
