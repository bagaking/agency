# Change: Refine File-Surface Review Depth

## Why
Explorer and Workbench no longer overpromise obvious missing capabilities, but the remaining file-surface weak points are now about depth and hierarchy rather than outright absence.

Two areas still feel unfinished:
- Explorer content replace is safe, but review remains file-level and lacks stronger per-match confidence.
- Workbench review tooling exists, but its toolbar prominence still exceeds the depth of the underlying actions.

This change tightens those last-mile file-surface interactions so the product feels more deliberate and less baseline-only.

## What Changes
- Deepen Explorer content-search replace review beyond raw snippet evidence.
- Refine Workbench review tooling hierarchy so contextual review actions do not compete with navigation and file lifecycle controls.
- Update current spec/docs to record the reviewed boundaries and stronger review semantics.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/*`
  - `apps/editor/electron/services/explorer.ts`
  - `apps/editor/renderer/src/components/workbench/*`
  - related tests and file-surface docs
