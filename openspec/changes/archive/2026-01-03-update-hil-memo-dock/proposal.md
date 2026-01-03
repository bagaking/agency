# Proposal: update-hil-memo-dock

## Summary
Add a left-side dock to the Memo (HIL) view so users can navigate between the Comment Inbox (Input Box) and Drafts in a consistent, split-layout experience.

## Motivation
The current Memo view is a single-column stream. A docked navigation panel improves scanability, aligns with other Agency panes, and makes it easier to jump between unprocessed comments and draft artifacts.

## Scope
- Introduce a left dock in Memo view.
- Dock entries include:
  - Comment Inbox (Input Box) with pending count.
  - Drafts list (all draft items) with status/metadata.
- Selecting a dock entry updates the main pane content.

## Non-Goals
- No new storage formats or schema migrations.
- No new IPC channels beyond existing HIL item queries.
- No cross-project aggregation.

## Risks
- Increased UI complexity if not visually aligned with existing Dock patterns.

## Success Criteria
- Memo view renders as split layout with a left dock.
- Comment Inbox and Drafts are both discoverable and selectable.
- Existing HIL item interactions (promote/update status) remain functional.
