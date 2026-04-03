# Change: Refactor worktree management core

## Why
Agency's core product value is increasingly its ability to manage repositories, worktrees, sessions, and bounded child execution. The current core still carries heavier default assumptions that are no longer aligned with that direction:

- live worktrees are effectively expected to be Cell-managed from the start;
- Cell records still read as lifecycle-state owners (`draft / active / archived`) instead of lightweight workspace records;
- default Gates and OpenSpec checks make Agency feel like it has already chosen the user's SPEC system;
- detached/missing Cell handling is still framed as lifecycle cleanup rather than worktree management.

That produces three kinds of friction:

1. users or agents may create worktrees outside Agency, but the product still centers tracked Cells rather than first-class worktree discovery and quick adoption;
2. repositories that do not use OpenSpec or any formal SPEC system receive product language and blocking behavior that imply they should;
3. the default mental model of Agency is heavier than necessary for teams that mainly want fast multi-worktree and multi-session control.

We need to simplify the core:
- make worktree discovery and management the primary workspace grammar;
- keep Cell as the repo-owned metadata/session anchor;
- stop making SPEC lifecycle and Gate workflows part of the default core path;
- leave room for a future optional SPEC suite instead of hard-coding one methodology into the base product.

## What Changes
- Reframe the core workspace model as worktree-first:
  - live worktrees may exist without a Cell;
  - unmanaged worktrees are surfaced explicitly and can be adopted with quick `Create Cell` / `Bind Cell` actions.
- Simplify the core Cell record:
  - keep repo-owned identity, attachment metadata, timestamps, avatar, and Cell-owned session/config anchors;
  - remove the default `draft / active / archived` lifecycle state machine from the core Cell contract.
- Replace lifecycle-first cleanup flows with worktree-management flows:
  - tracked attached Cells;
  - tracked detached/missing Cells;
  - unmanaged live worktrees.
- Remove default OpenSpec / SPEC assumptions from core workspace management:
  - no default spec-missing warnings;
  - no default gate checks for ordinary Cell/worktree creation, binding, reattachment, or session startup.
- Remove default Gate configuration from core navigation and dashboard grammar.
- Treat SPEC, Gate, and related workflow ceremony as a future optional suite layered on top of the core product instead of the core product itself.
- Clarify migration behavior for existing `state`-bearing Cell records and for existing advanced gated delivery features so this change does not leave the rollout ambiguous:
  - legacy `draft / active / archived` fields may remain in storage temporarily but stop driving the default core workspace routing;
  - existing advanced gated delivery modes remain optional advanced flows during this change, even while default Gate configuration and lifecycle gating leave the base workspace-management path.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - `apps/editor/electron/services/cells.ts`
  - `apps/editor/electron/services/cellStore.ts`
  - `apps/editor/electron/services/gates.ts`
  - `apps/editor/electron/services/sessionRegistry.ts`
  - `apps/editor/renderer/src/components/modals/CreateCellModal.tsx`
  - `apps/editor/renderer/src/components/agentCells/AgentCellsSessionsPanel.tsx`
  - `apps/editor/renderer/src/app/useCellLifecycleActions.ts`
  - `apps/editor/renderer/src/hooks/useGates.ts`
  - `apps/editor/renderer/src/components/ProjectSettingsView.tsx`
  - `apps/editor/renderer/src/app/buildAppLayoutProps.ts`
  - related tests and docs
- Affected docs:
  - `apps/editor/README.md`
  - `apps/editor/docs/manual-test.md`
  - `docs/notes-session-management.md`
- Risks:
  - removing lifecycle-first language may break existing UI assumptions around cleanup/archive flows;
  - deleting or hiding default Gate surfaces too abruptly may strand teams currently using them;
  - unmanaged worktree support can create duplicate/adoption edge cases if reconciliation rules are vague.
- Mitigation:
  - keep Cell as the stable repo-owned record so session/config/runtime anchors do not move;
  - treat Gate/SPEC behavior as optional overlay seams instead of hard-deleting every related implementation path in one pass;
  - define deterministic adoption, reattach, and delete semantics for unmanaged worktrees vs tracked Cells.
