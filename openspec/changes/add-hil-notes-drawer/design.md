# Design: HIL Notes Drawer and Memo Center

## Scope
- Consolidate HIL artifacts (comments, memos, drafts) into a worktree-scoped index.
- Provide a global, reusable right-side drawer for HIL panels.
- Add a Memo navigation entry for centralized HIL browsing and conversion workflows.

## Data Model
Single index file per worktree:

Path:
- `.agency/hil/index-<worktree>.yaml`

Schema (v1):
- `version`: number
- `items`: array

Item fields (minimum):
- `id`: stable id
- `kind`: `comment` | `memo` | `draft`
- `status`: `open` | `resolved` | `archived`
- `author`: `{ type, label }` (optional)
- `createdAt`: ISO timestamp
- `updatedAt`: ISO timestamp (optional)
- `body`: string (markdown-supported)
- `anchor`: `{ file, line, column, cellId }` (optional)
- `references`: array of `{ system, id, path }` (optional)
- `meta`: object for forward compatibility
- `meta.processed`: boolean, defaults to `false`

## UI/UX
- Global right-side drawer, fixed width, collapsible, default collapsed.
- Drawer auto-opens when a comment is added or when HIL actions are triggered.
- Drawer contains a tabbed panel (initially `Comments`, future tabs for `Memos` and `Drafts`).
- Memo entry in the left activity bar opens the HIL list view for the current worktree.
- Comments panel exposes a bulk promote flow that gathers pending comments into a single draft with a required description.

## Migration
- On first access per worktree, if legacy `.agency/comments-<worktree>.yaml` exists, import as `kind: comment` items into the HIL index.
- Migration is non-destructive (legacy file retained).
- Duplicates are avoided by stable id mapping and content hash fallback.

## Integrity Rules
- HIL index file is mergeable YAML; items are append-only unless explicitly resolved or archived.
- Promoting a comment to a `draft` creates a new HIL item; it does not edit spec files or external systems.
- New HIL items MUST default `meta.processed` to `false` unless explicitly set.
- Promoting the same comment multiple times MUST reuse the existing draft.
- Bulk promote SHALL mark selected comments as `meta.processed: true` after draft creation.
- Single-item promote SHALL also mark the source comment as `meta.processed: true`.

## Validation
- Create a comment on a file with legacy `.agency/comments-<worktree>.yaml`, then confirm items appear in `.agency/hil/index-<worktree>.yaml` without deleting the legacy file.
- Trigger a line comment action and verify the right-side HIL drawer auto-opens to the Comments panel.
- Open bulk promote and verify pending comments list with hover context preview, and that promoted comments are marked processed.
