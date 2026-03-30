# Change: Refactor Cell / Worktree Lifecycle Model

## Why
Agency currently couples four concerns too tightly:
- durable Cell identity;
- live git worktree attachment;
- per-Cell session persistence;
- Turn / Gate / Action Sheet workflow scaffolding.

That coupling creates user-visible breakage:
- when a worktree disappears, the Cell and its sessions effectively lose their storage anchor;
- detached or externally cleaned worktrees cannot be archived or deleted cleanly as Cells;
- Project scope configuration drifts because several "project" settings are actually stored under the selected Cell worktree;
- Gate Create / Gate Execute tooling behaves like mandatory Cell ceremony even when users drive the real lifecycle from inside a session.

We need to separate domain identity from runtime attachment and from optional workflow tooling.

## What Changes
- **BREAKING**: redefine `Cell` as a durable repo-owned object that may attach to a git worktree, instead of treating the Cell as a direct projection of the current worktree list.
- Introduce an explicit Cell attachment lifecycle so a Cell can survive missing, detached, or replaced worktrees.
- Move Cell lifecycle records, session registries, and Agent-scoped configuration into repo-owned Cell storage.
- Standardize Project-scoped configuration on repository-root `.agency/` files across Hierarchy features.
- Allow detached or missing-worktree Cells to be archived or deleted without requiring the old worktree path to still exist.
- Make Gate Create / Gate Execute / Action Sheet scaffolding explicit opt-in workflow tooling instead of default Cell creation ceremony.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/electron/services/cells.ts`
  - `apps/editor/electron/services/sessionRegistry.ts`
  - `apps/editor/electron/services/sessions.ts`
  - `apps/editor/electron/services/{quickActions,terminusSettings,appShortcuts,replyQuickPrompts,sessionNaming,gates}.ts`
  - `apps/editor/electron/ipc/handlers/cells.ts`
  - `apps/editor/renderer/src/app/useCellLifecycleActions.ts`
  - `apps/editor/renderer/src/app/useHierarchyConfigState.ts`
  - `apps/editor/renderer/src/hooks/*`
  - `apps/editor/renderer/src/components/{EditorPane,modals/CreateCellModal}.tsx`
  - Agent Cells / Session Map surfaces that assume `Cell === live worktree`
- Risks:
  - migration can strand legacy session registries or agent-scoped config if reconciliation is incomplete;
  - changing Cell identity semantics will break assumptions in UI selection, session attach, and control-bus lookup paths;
  - making Turn tooling optional can regress existing "start Turn automatically" expectations if not communicated clearly.
- Mitigation:
  - land the change behind repo-owned storage reconciliation with read fallback from legacy worktree-local files;
  - keep lifecycle state and attachment state as separate fields instead of overloading one `state`;
  - add explicit migration and validation tasks before removing legacy read paths.
