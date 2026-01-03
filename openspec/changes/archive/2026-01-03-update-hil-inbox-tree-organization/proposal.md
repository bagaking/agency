# Change: HIL Inbox Tree Organization

## Why
The Memo/Inbox experience needs clearer structure: each capture type should have its own list and input surface, and Promote should reflect that hierarchy. Aligning storage with the UI tree improves traceability and future expansion.

## What Changes
- Add Inbox sections for each HIL input type (Comments, Flash, Excerpt, Screenshot), each with its own list and input surface where applicable.
- Update Promote UI to present a tree of items grouped by type and source, with node-level selection.
- Organize HIL storage under a tree-aligned directory structure while keeping an index for fast lookup.

## Impact
- Affected spec: agency-editor
- Affected UI: Memo/Inbox, Promote modal
- Affected storage: `.agency/hil/` layout and item referencing
