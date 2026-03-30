## 1. Planning

- [x] 1.1 Reconcile this change with existing Explorer requirements in `openspec/specs/agency-editor/spec.md` and eliminate overlaps before implementation starts.
- [x] 1.2 Confirm implementation phase boundaries and decide whether the work should land as one umbrella branch or multiple child changes/PRs.
- [x] 1.3 Align `docs/notes-explorer-interaction-system.md` with any spec wording refinements made during implementation kickoff.

## 2. Phase 1: Capability Architecture

- [x] 2.1 Introduce a filter descriptor model for built-in Explorer filters (`visibility`, `status`, `semantic`) without regressing persisted user preferences.
- [x] 2.2 Define the Explorer search capability split between `path/name search` and `content search`, including result model, UX boundary, and performance constraints.
- [x] 2.3 Define workspace/directory/file-scoped content replace semantics, including preview, confirmation, and failure behavior.
- [x] 2.4 Introduce an Explorer command registry that can describe header actions and context menu actions with grouping and visibility predicates.
- [x] 2.5 Migrate existing header actions and context menu actions to the command registry without changing underlying file intent behavior.
- [x] 2.6 Add tests covering descriptor serialization, command visibility, and parity with current Explorer behavior.

## 3. Phase 2: Working-Set Views

- [x] 3.1 Define a working-set view model and promote `Changed Files` into the first registered working-set view.
- [x] 3.2 Align working-set row action grammar with the main Explorer tree so the views feel like one family.
- [x] 3.3 Add room for future working-set members (`semantic`, `recent`, `session-relevant`, etc.) without implementing them all immediately.
- [x] 3.4 Add tests or scripted verification for switching between tree and working-set views.
- [x] 3.5 Ensure file and folder operations such as copy, duplicate, move, rename, and clipboard flows retain behavioral parity while the working-set/view grammar evolves.

## 4. Phase 3: Project Policy and Presets

- [x] 4.1 Define a project-level Explorer policy format for default filters, working-set presets, and future action visibility policy.
- [x] 4.2 Decide whether project policy should also express default content-search presets or saved queries.
- [x] 4.3 Wire project policy loading into Explorer state initialization without breaking per-user persisted preferences.
- [x] 4.4 Document override and precedence rules between built-in defaults, project policy, and user-local UI state.

## 5. Phase 4: Bounded URL / Browser Research Lane

- [x] 5.1 Define the bounded browser/research lane surface and lifecycle, including system-browser escape hatch.
- [x] 5.2 Define URL -> reader/preview -> save/import/cite workflows and how they connect back to Explorer or workflow artifacts.
- [x] 5.3 Reuse existing file intent and delivery primitives wherever possible instead of inventing a parallel intake path.
- [x] 5.4 Add explicit security and scope constraints so the feature remains a research lane rather than a general browser.

## 6. Validation And Rollout

- [x] 6.1 Add regression coverage for command registry behavior, working-set switching, and project-policy loading.
- [x] 6.2 Add validation notes for bounded browser/research workflows once phase 4 starts.
- [x] 6.3 Update README/design docs/manual verification once the first implementation phase lands.
