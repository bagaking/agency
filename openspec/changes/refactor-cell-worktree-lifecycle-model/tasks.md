## 1. Domain Model And Storage

- [x] 1.1 Define the repo-owned Cell record schema, including separate lifecycle state and attachment state.
- [x] 1.2 Replace Cell discovery-by-worktree with Cell store hydration plus worktree reconciliation.
- [x] 1.3 Define repo-owned session registry storage under each Cell and plan migration from worktree-local registries.

## 2. Cell Attachment Lifecycle

- [x] 2.1 Add explicit `attached / detached / missing` attachment semantics for Cells.
- [x] 2.2 Define archive and delete behavior for detached or missing-worktree Cells.
- [x] 2.3 Ensure session/history/reply/run artifacts remain reachable when the worktree attachment disappears.

## 3. Scoped Configuration Normalization

- [x] 3.1 Standardize Project scope storage at repository-root `.agency/` across Quick Actions, Reply Quick Prompts, Session Naming, Terminus Settings, App Shortcuts, and Gates.
- [x] 3.2 Move Agent scope storage from worktree-local files to repo-owned Cell storage.
- [x] 3.3 Add read fallback and migration for legacy worktree-local scoped config files.

## 4. Workflow Tooling Simplification

- [x] 4.1 Remove automatic Turn / Gate Create artifact creation from default Cell creation.
- [x] 4.2 Keep Gate Create / Gate Execute as explicit, on-demand tooling for Cells that want formal workflow scaffolding.
- [x] 4.3 Clarify UI state and wording so workflow tooling is not confused with Cell existence or worktree attachment.

## 5. Renderer And IPC Updates

- [x] 5.1 Add Cell lifecycle operations for detached cleanup/archive/delete to IPC and renderer bridges.
- [x] 5.2 Update Agent Cells / EditorPane / Session Map to show attachment state separately from lifecycle state.
- [x] 5.3 Ensure project-scoped Hierarchy settings remain editable with a selected project even when no attached Cell is available.

## 6. Validation And Migration Safety

- [x] 6.1 Add migration tests covering legacy worktree-local lifecycle/session/config data import.
- [x] 6.2 Add regression tests for missing-worktree Cells, detached archive/delete flows, and project-scope config resolution.
- [x] 6.3 Add manual validation notes for session continuity, config continuity, and explicit Turn tooling behavior after worktree cleanup.

Manual validation notes:
- Session continuity: `pnpm -C apps/editor test:unit` and `apps/editor/electron/services/__tests__/mobileSessionContinuation.test.ts` verify detached/missing Cell sessions stay recoverable by `cellId + projectRoot` and continue-on-mobile no longer depends on a live worktree.
- Config continuity: `apps/editor/electron/services/__tests__/scopedConfigPaths.test.ts`, `sessionNaming.test.ts`, and `actionSheets.test.ts` verify repo-root Project scope and repo-owned Cell scope keep resolving after attachment churn.
- Explicit Turn tooling: `apps/editor/renderer/src/app/useActionSheetOrchestration.ts`, `apps/editor/electron/services/actionSheets.ts`, and the targeted tests above verify Gate / Action Sheet creation stays explicit and can run from repo-owned context without recreating a removed worktree.
- Final verification: `git diff --check`, `pnpm -C apps/editor typecheck`, `pnpm -C apps/editor test:unit`, `pnpm -C apps/editor exec tsx --test ../../pkg/agency-data/src/__tests__/hilRepository.test.ts ../../pkg/agency-data/src/__tests__/deliveryAuditRepository.test.ts ../../pkg/agency-data/src/__tests__/promoteSystem.test.ts`, and `pnpm dlx @fission-ai/openspec@1.2.0 validate --all --strict`.
