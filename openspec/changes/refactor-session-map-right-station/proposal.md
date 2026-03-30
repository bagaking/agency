# Change: Refactor Session Map right station

## Why
The docked Session Map right side still carried legacy mental models from an `Ops rail` plus a separate commander column.
That split weakened hierarchy, duplicated right-side chrome, and made the user parse multiple competing right-edge surfaces instead of one bounded station.

## What Changes
- Refactor the docked Session Map right side into one `Right Station`.
- Keep `Ops` as the default mode and `Briefing` as the reveal mode inside the same station.
- Preserve bounded Commander semantics and explicitly keep app-level `HIL Drawer` semantics separate.
- Update docs and verification checklists to remove the old “independent commander column” language.

## Impact
- Affected specs: `agency-editor`
- Affected code: `apps/editor/renderer/src/components/sessionMap/**`
- Affected docs: `docs/notes-session-management.md`, `apps/editor/README.md`, `apps/editor/docs/manual-test.md`
