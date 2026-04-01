# Change: Align Browser Surface Docs and Validation

## Why
- The Workbench-bound web research tab is now the product's canonical browser surface for URL-driven workflows, and the documentation/validation still frames it as a sidebar affordance. Users and QA need clarity that the tab is a true page surface while remaining limited to the bounded product constraints (no general browser tabs, cookies, or auth state).
- Bridging this understanding requires spec authority, README/manual-test coverage, and the explorer/file interaction narratives to all agree on the same surface boundaries so the migration feels intentional rather than accidental.

## What Changes
- Update the `agency-editor` spec so the run-time requirement explicitly describes the Workbench tab as the canonical browser surface with live/reader modes, page-level actions, and bounded product limits.
- Refresh `apps/editor/README.md`, `apps/editor/docs/manual-test.md`, and the explorer/file interaction/reusable-items notes so the docs call out the Workbench browser surface and the systems it touches.
- Keep the specs/docs focused on the bounded constraints: only `http/https`, the system-browser escape hatch, and the existing save/cite/Explorer handoff flows.
- Regenerate the SOP catalogue since the touched docs include `sop` frontmatter and rerun the OpenSpec validation for the new change.

## Impact
- Affected specs: `agency-editor`
- Affected docs: `apps/editor/README.md`, `apps/editor/docs/manual-test.md`, `docs/notes-explorer-interaction-system.md`, `docs/notes-file-interaction-system.md`, `docs/notes-reusable-items-coding.md`
- Risks: Without alignment, teams may treat the hosted tab as a full browser product or forget to rerun validation.
- Mitigation: All documentation and validation points now describe the bounded browser surface with consistent language.
