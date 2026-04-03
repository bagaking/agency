## 1. Spec And Product Boundary
- [x] 1.1 Update `agency-editor` spec from lifecycle-first Cell management to worktree-first core management.
- [x] 1.2 Record that unmanaged worktrees are first-class discovery targets and may be adopted into Cells explicitly.
- [x] 1.3 Remove default OpenSpec / Gate assumptions from the core change set and document the future optional SPEC-suite boundary.
- [x] 1.4 Resolve or supersede stale active deltas that still describe the older lifecycle-first Cell model where necessary.

## 2. Core Data And Service Layer
- [x] 2.1 Simplify the core Cell record so lifecycle state is no longer required for ordinary Cell/worktree management.
- [x] 2.2 Add deterministic unmanaged-worktree discovery and reconciliation against repo-owned Cell records.
- [x] 2.3 Add explicit actions for:
  - create a Cell from an unmanaged worktree
  - bind an unmanaged worktree to an existing detached Cell
  - ignore an unmanaged worktree for now
- [x] 2.4 Define and implement deterministic compatibility rules for auto-suggested and manual `Bind To Existing Cell`.
- [x] 2.5 Persist ignored unmanaged-worktree state in a user-local, per-repo store and clear it when the worktree disappears or is adopted.
- [x] 2.6 Stop core Cell/worktree flows from surfacing default spec-missing warnings or default gate failures.
- [x] 2.7 Ensure deleting a tracked Cell record preserves live worktrees as unmanaged candidates by default.

## 3. Migration And Compatibility
- [x] 3.1 Define renderer behavior for legacy `state` values so old records still render consistently while routing moves to tracking/attachment state.
- [x] 3.2 Keep existing advanced gated delivery flows optional and non-blocking while removing default Gate/lifecycle assumptions from the base workspace-management path.

## 4. Renderer And UX
- [x] 4.1 Reframe Agent Cells around tracked workspaces, detached Cells, and unmanaged worktrees.
- [x] 4.2 Remove lifecycle-stepper-first UI and replace it with attachment/worktree management actions.
- [x] 4.3 Update the Create Cell flow so the copy and summaries read as worktree management rather than lifecycle ceremony.
- [x] 4.4 Remove Gates from default core navigation and default dashboard cards.
- [x] 4.5 Add explicit UX for legacy `archived` records, ignored unmanaged worktrees, and mismatch-confirmation during manual bind.

## 5. Validation And Docs
- [x] 5.1 Update README and manual test docs to match the worktree-first core model.
- [x] 5.2 Add regression coverage for unmanaged worktree discovery, ignore persistence, quick Cell creation, detached Cell reattachment, manual bind mismatch handling, and record deletion semantics.
- [x] 5.3 Validate that repositories without OpenSpec files can still create/bind/manage worktrees and start sessions without core warnings or gate failures.
