## 1. Specs
- [ ] 1.1 Modify `agency-editor` spec so the Workbench bounded web research tab is explicitly described as the browser surface for URL research while still obeying bounded product limits.

## 2. Documentation
- [ ] 2.1 Update `apps/editor/README.md` to describe the Workbench browser surface (Live/Reader modes, page-level actions, system-browser escape) and note it is still bounded.
- [ ] 2.2 Update `apps/editor/docs/manual-test.md` so checkboxes validate the true browser surface, its actions, and the escape path back to the system browser.
- [ ] 2.3 Update `docs/notes-explorer-interaction-system.md`, `docs/notes-file-interaction-system.md`, and `docs/notes-reusable-items-coding.md` so the notes/catalog emphasize the browser surface role and the bounded constraints.
- [ ] 2.4 Regenerate `docs/must-sop.md` after touching the `sop` docs.

## 3. Validation
- [ ] 3.1 Run `pnpm exec openspec validate update-workbench-browser-surface --strict`.
