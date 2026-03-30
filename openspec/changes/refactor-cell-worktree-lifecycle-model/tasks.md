## 1. Domain Model And Storage

- [ ] 1.1 Define the repo-owned Cell record schema, including separate lifecycle state and attachment state.
- [ ] 1.2 Replace Cell discovery-by-worktree with Cell store hydration plus worktree reconciliation.
- [ ] 1.3 Define repo-owned session registry storage under each Cell and plan migration from worktree-local registries.

## 2. Cell Attachment Lifecycle

- [ ] 2.1 Add explicit `attached / detached / missing` attachment semantics for Cells.
- [ ] 2.2 Define archive and delete behavior for detached or missing-worktree Cells.
- [ ] 2.3 Ensure session/history/reply/run artifacts remain reachable when the worktree attachment disappears.

## 3. Scoped Configuration Normalization

- [ ] 3.1 Standardize Project scope storage at repository-root `.agency/` across Quick Actions, Reply Quick Prompts, Session Naming, Terminus Settings, App Shortcuts, and Gates.
- [ ] 3.2 Move Agent scope storage from worktree-local files to repo-owned Cell storage.
- [ ] 3.3 Add read fallback and migration for legacy worktree-local scoped config files.

## 4. Workflow Tooling Simplification

- [ ] 4.1 Remove automatic Turn / Gate Create artifact creation from default Cell creation.
- [ ] 4.2 Keep Gate Create / Gate Execute as explicit, on-demand tooling for Cells that want formal workflow scaffolding.
- [ ] 4.3 Clarify UI state and wording so workflow tooling is not confused with Cell existence or worktree attachment.

## 5. Renderer And IPC Updates

- [ ] 5.1 Add Cell lifecycle operations for detached cleanup/archive/delete to IPC and renderer bridges.
- [ ] 5.2 Update Agent Cells / EditorPane / Session Map to show attachment state separately from lifecycle state.
- [ ] 5.3 Ensure project-scoped Hierarchy settings remain editable with a selected project even when no attached Cell is available.

## 6. Validation And Migration Safety

- [ ] 6.1 Add migration tests covering legacy worktree-local lifecycle/session/config data import.
- [ ] 6.2 Add regression tests for missing-worktree Cells, detached archive/delete flows, and project-scope config resolution.
- [ ] 6.3 Add manual validation notes for session continuity, config continuity, and explicit Turn tooling behavior after worktree cleanup.
