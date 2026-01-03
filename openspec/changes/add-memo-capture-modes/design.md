# Design: Memo Capture Modes

## Data Model
HIL memo items remain `kind: memo` with `meta.noteType`:
- `flash`: quick freeform note
- `excerpt`: captured text with source reference
- `screenshot`: image asset reference

Suggested fields:
- `meta.noteType`: `flash|excerpt|screenshot`
- `meta.source`: `{ file, startLine, endLine, selection }` for excerpts
- `meta.asset`: `{ path, mime, width, height }` for screenshots

Assets are stored under:
- `.agency/hil/assets/<worktree>/...`

## UI/UX
- Memo view provides capture actions: Flash, Excerpt, Screenshot.
- Flash opens a compact input.
- Excerpt captures current selection (file/lines) and previews the snippet.
- Screenshot captures or imports an image, saves it to assets, and previews it.
- All memo items can be included in Promote selection and referenced by drafts.

## Promote Integration
- Memo items appear in Promote selection alongside comments.
- Draft references include memo ids with `system: hil` and `kind: memo`.
