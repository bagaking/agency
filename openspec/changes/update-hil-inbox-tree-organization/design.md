# Design: HIL Inbox Tree Organization

## UI Structure
- Inbox left dock shows sections per input type: Comments, Flash, Excerpt, Screenshot.
- Each section renders its own list of items. Comments remain read-only; memo types show their own lists.
- Input surfaces:
  - Flash: inline text input at the top of its section.
  - Excerpt: selection preview + optional note + save action.
  - Screenshot: capture button + preview + optional note + save action.
- A compact aggregate view (All) is optional; default view opens at Inbox.

## Promote Tree
- Promote modal lists items in a tree grouped by:
  1) Type (Comment/Memo types)
  2) Source (file path or Unlinked)
  3) Items
- Tree nodes support select all/none and partial states.
- Hover on item shows context preview (file snippet or memo text).

## Storage Layout
- Keep the HIL index as the source of truth for fast reads: `.agency/hil/index-<worktree>.yaml`.
- Store items in type-aligned directories for traceability:
  - `.agency/hil/<worktree>/items/comments/`
  - `.agency/hil/<worktree>/items/memos/`
  - `.agency/hil/<worktree>/drafts/`
  - `.agency/hil/<worktree>/assets/`
- Screenshot assets continue to live under the worktree assets directory, referenced by path in the index.

## Compatibility
- Do not require migration for existing items; older entries remain in the index.
- New writes create both index entries and the tree-organized file artifacts.
