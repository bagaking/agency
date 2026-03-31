# Change: clarify explorer row state hierarchy

## Why
- The Explorer left-tree list needs a clear behavioral contract so row state reasoning stays consistent across filters, commands, and workflow handoff.
- We currently lack spec language that ties ignored entries and visibility toggles to the row state hierarchy described in `docs/notes-explorer-interaction-system.md`.

## What Changes
- Refine Explorer left-tree row state language so ignored entries remain legible, hover/focus/selection layers are easier to parse, and file names stay primary.
- Calm the Explorer header so it supports the list instead of competing with it.
- Document the row-state hierarchy and ignored-entry treatment in `docs/notes-explorer-interaction-system.md`.
- Add a dedicated `Explorer Row State Hierarchy` requirement to the `agency-editor` spec so the behavior lives in the canonical requirements.

## Impact
- Affected specs: `agency-editor`
- Affected docs: `docs/notes-explorer-interaction-system.md`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/ExplorerItem.tsx`
  - `apps/editor/renderer/src/components/explorer/ExplorerHeader.tsx`
  - Explorer renderer tests
