## 1. Object Boundary And Guardrails
- [x] 1.1 Remove the fake Cell/session path from no-project windows and stop session IPC from loading against virtual owners.
- [x] 1.2 Add focused regression coverage for empty windows so `sessions:list` is never triggered without a project-backed Cell.

## 2. Window-Owned Home Shell
- [x] 2.1 Add a host-owned home-shell capability scoped to the current window, rooted at the user home directory, and separate from Cell/session registries.
- [x] 2.2 Wire preload/renderer bridge and a renderer terminal pane for the home shell without backdooring it through Cell/session contracts.
- [x] 2.3 Add focused verification for home-shell create/write/resize/dispose behavior.

## 3. Project Home UX
- [x] 3.1 Replace fragmented no-project sidebars with one shared Project Home sidebar grammar (`Open Project`, `Start Home Shell`, recent projects).
- [x] 3.2 Add a crafted Project Home main surface with recent-project cards as the primary center-stage content and an integrated home-shell state.
- [x] 3.3 Align secondary no-project empty states with the new craft language and remove placeholder/marketing copy that does not serve the workflow.

## 4. Docs, Specs, And Validation
- [x] 4.1 Update the `agency-editor` spec to record the no-project home and window-owned shell boundaries.
- [x] 4.2 Update README, manual-test guidance, and reusable-item catalogs.
- [x] 4.3 Run focused tests and record the results.
