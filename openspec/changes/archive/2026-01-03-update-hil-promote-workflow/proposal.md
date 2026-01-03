# Change: HIL Promote Workflow with Session Gates

## Why
Current comment-level promote actions feel too granular and lack a clear workflow boundary. Promote should be a global flow that assigns an agent session, waits for draft completion, and only then consumes comments.

## What Changes
- Replace per-comment promote with a global Promote action.
- Add a Promote modal that selects/creates a session and shows gate status.
- Gate the confirmation on draft completion (draft marked promoted/complete in `.agency`).
- On confirmation, consume selected comments into the draft and record the draft reference.

## Impact
- Affected spec: agency-editor
- Affected UI areas: HIL drawer, comments panel, memo view
- Affected data storage: `.agency/hil/index-<worktree>.yaml`
