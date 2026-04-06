## Context

Agency has already done the hard part of separating repo-owned Cell storage from live worktree attachment. Cell records, session registries, and agent-scoped configuration increasingly survive worktree churn.

But the product grammar still reflects the older lifecycle-first model:
- Cell records still normalize around `state`;
- detached/missing Cells still route through cleanup/archive lifecycle framing;
- default Gate logic still checks OpenSpec files and checklist completion;
- navigation still presents Gates as part of the base product;
- repositories and worktrees created outside Agency still read like edge cases instead of normal first-class inputs.

The result is architectural mismatch:
- storage/runtime seams are becoming lighter and more general;
- product language and validation are still heavier and more methodology-specific.

This change aligns the product grammar with the direction the storage/runtime model is already taking.

## Goals

- Make worktree management the primary core grammar for workspace setup and recovery.
- Allow live repo worktrees to exist without an immediate Cell record.
- Let Agency quickly create or bind Cells from unmanaged worktrees when the user wants tracking/session/config anchoring.
- Keep Cell as the stable repo-owned anchor for sessions, replies, runs, and agent-scoped settings.
- Remove default OpenSpec / SPEC assumptions from the core workspace path.
- Remove default Cell lifecycle/Gate requirements from the base product.
- Preserve a clean path for a future optional SPEC suite.

## Non-Goals

- Do not redesign session runtime, tmux recovery, or Main Agent Harness semantics.
- Do not remove Cell-owned session/reply/config storage.
- Do not redesign Memo / HIL draft systems in this change.
- Do not fully delete every Gate-related code path if an internal seam is still useful for a future optional suite.
- Do not force a new canonical top-level object named `Worktree`; this change is about product grammar and core behavior, not a sweeping rename campaign.

## Decisions

### Decision: Core becomes worktree-first, not lifecycle-first

The default core question is:
- what worktrees exist for this repo,
- which are already tracked by Agency,
- which need reattachment,
- which should get a new Cell record,
- which sessions/runs belong to tracked workspace records.

The default core question is no longer:
- what lifecycle state is this Cell in,
- whether the user's spec proposal/checklist has reached a target stage.

### Decision: Live worktrees may be unmanaged

An unmanaged worktree is a real, normal repository condition.
It is not an error and does not require a synthetic Cell.

Agency must be able to:
- discover unmanaged worktrees from the repository worktree list;
- surface them in the UI as explicit candidates;
- offer quick actions such as:
  - `Create Cell`
  - `Bind To Existing Cell`
  - `Ignore For Now`

Agency must not auto-create tracked Cells just because a worktree exists.

### Decision: `Ignore For Now` is user-local, per-repo, and reversible

`Ignore For Now` is a noise-reduction affordance, not a repo policy.

Therefore ignore state should be:
- user-local rather than repo-owned;
- scoped to the current repository;
- keyed by canonical live worktree path;
- cleared automatically when:
  - the worktree disappears,
  - the worktree is adopted into a Cell,
  - the user explicitly resets ignored unmanaged worktrees.

This avoids committing host-local worktree bookkeeping into repo-owned `.agency/` storage.

### Decision: Cell remains the stable repo-owned record

We are not removing Cell.

Cell remains the right place to anchor:
- durable workspace identity;
- attachment metadata;
- timestamps and avatar/label metadata;
- session registry;
- reply/run/config ownership.

But the default core Cell record no longer requires a lifecycle state machine.

Recommended core record fields:
- `id`
- `name`
- `branch`
- `attachmentState`
- `worktreePath`
- `lastKnownWorktreePath`
- `createdAt`
- `updatedAt`
- `avatar`

Existing `state` fields may be preserved during migration for compatibility, but they stop driving the default core UX and validation model.

Migration rule:
- legacy `draft` and `active` values become informational only;
- legacy `archived` remains preserved in storage but no longer owns a special default core route;
- default core routing is based on tracking + attachment state, not lifecycle state;
- the UI may show a low-emphasis compatibility badge such as `Legacy Archived` while migration is in progress, but must not route the record into a separate lifecycle rail by default.

### Decision: Compatibility rules for `Bind To Existing Cell` must be deterministic

Automatic or suggested binding must follow this order:
1. exact `lastKnownWorktreePath` match;
2. otherwise unique branch match against a detached Cell;
3. otherwise no automatic match.

If step 3 is reached:
- the product may still offer manual `Bind To Existing Cell`;
- manual binding requires explicit user choice from detached Cells;
- if branch/path signals disagree, the UI must surface that mismatch before confirmation;
- the editor must never silently create duplicate tracked Cells from the same unmanaged worktree.

### Decision: Attachment state replaces lifecycle state in core triage

The default worktree-management sections should be driven by attachment/tracking status:

1. `Tracked Workspaces`
- Cells with live attached worktrees.

2. `Detached Or Missing Cells`
- repo-owned Cell records whose last known worktree is missing or intentionally detached;
- evidence remains accessible;
- primary actions are reattach, inspect, or remove record.

3. `Unmanaged Worktrees`
- live repo worktrees without a matching Cell record;
- primary actions are create/bind/ignore.

This replaces the current lifecycle-first `Needs Cleanup` and `Archived` framing for the base product.

### Decision: Removing a tracked Cell record does not imply deleting a live worktree

If a user deletes a tracked Cell record while its worktree still exists:
- the repo-owned Cell record and Cell-owned artifacts are removed;
- the live worktree remains on disk unless the user explicitly chooses a destructive worktree deletion flow;
- the worktree returns to the `Unmanaged Worktrees` list.

This keeps worktree management honest and reversible.

### Decision: Core is SPEC-agnostic

The base Agency core must not assume:
- OpenSpec exists;
- a proposal/checklist workflow exists;
- a repo without those files is incomplete.

Therefore:
- no default spec-missing warnings in Cell/worktree management;
- no default gate checks for create/bind/reattach/start-session flows;
- no default core Settings/Hierarchy emphasis on Gates.

### Decision: Gates and related workflow ceremony move behind an optional suite boundary

This change does not need to fully implement the future suite.
It only needs to establish the boundary clearly:

- core worktree/session management is always available;
- workflow suites are optional overlays;
- suites may add:
  - workflow checks,
  - lifecycle state,
  - gate configuration pages,
  - suite-specific action sheets,
  - spec validation.

Core product surfaces must not imply that those overlays are mandatory.

Scope clarification for this change:
- remove default Gate/lifecycle assumptions from core workspace management, default navigation, and default dashboard grammar;
- do not require the immediate removal of existing advanced gated delivery behaviors inside Promote / Explorer / Action Sheet domains;
- those advanced modes remain optional and non-blocking during this change, and may later be moved fully behind a suite boundary in a follow-up change.

### Decision: Existing Turn and workflow code may survive as dormant seams during migration

This change should not require deleting all workflow code immediately.
A safer rollout is:
- remove default surfacing and default blocking behavior first;
- preserve internal seams where useful;
- let a future SPEC-suite change decide what becomes suite-owned and how it is reintroduced.

## UX Shape

### Agent Cells

Agent Cells becomes the default workspace management surface with three explicit sections:

1. `Tracked Workspaces`
- normal Cells with live worktrees and session trees.

2. `Detached Cells`
- Cells with missing or detached attachments;
- compact rows/cards;
- actions:
  - `Reattach`
  - `View Details`
  - `Remove Record`

3. `Unmanaged Worktrees`
- live worktrees found in the repo but not tracked by a Cell;
- actions:
  - `Create Cell`
  - `Bind To Existing Cell`
  - `Ignore`

`Create Cell` remains the action name for tracking a workspace context, but the UI copy around it should read as worktree adoption/management rather than lifecycle ceremony.

### Create Cell / Add Worktree Modal

The creation flow should remain one bounded modal or command family, but its grammar becomes explicitly worktree-first:
- create new branch + worktree;
- track existing worktree;
- bind existing branch;
- reattach detached Cell to a discovered worktree.

`Bind Existing Branch` is not a hidden `create worktree` shortcut. It first analyzes whether the branch already has a live workspace, including the repo-root primary worktree. If yes, the flow binds that existing workspace. If no, the flow creates a branch-only Cell. Any later worktree materialization must happen through an explicit `Create Worktree Attachment` action.

The modal must avoid suggesting that the user is starting a workflow template or lifecycle journey.

### Settings / Hierarchy

Default core navigation should no longer present Gates as a base product capability.
Core settings/dashboard cards should emphasize:
- Actions
- Softlinks
- other always-on runtime/config capabilities

If a future workflow suite is enabled, it can register additional entries such as Gates.

## Migration / Rollout

### Phase 1: Spec and product-language cleanup
- update spec/proposal/docs so core is clearly worktree-first;
- remove default OpenSpec assumptions from validation copy;
- remove default Gate references from primary navigation language.

### Phase 2: Service-layer simplification
- make core Cell record lifecycle-neutral;
- stop core create/bind/reattach paths from running default gate checks;
- add unmanaged-worktree discovery + adoption actions.
- add user-local ignored-unmanaged-worktree persistence.

### Phase 3: Renderer surface shift
- replace lifecycle-first cleanup/archive sections with tracked/branch-only/detached/unmanaged sections;
- remove lifecycle-stepper primary UI from Agent Cells;
- tighten Create Cell copy around worktree management.

### Phase 4: Optional workflow-suite preparation
- preserve dormant seams where useful;
- document a future suite boundary instead of continuing to imply that the suite already exists in core.

## Risks / Trade-offs

- Some teams may miss default Gate visibility.
  - Trade-off accepted: core simplicity and methodology neutrality are more important.
  - Mitigation: optional suite path later.

- A worktree-first UI can create duplicate adoption states.
  - Mitigation: deterministic reconciliation rules:
    - match by attached path first;
    - offer bind-to-detached-cell when branch/path strongly match;
    - never silently create a duplicate Cell from an unmanaged worktree.

- Removing archive-state language may unsettle existing cleanup UX.
  - Mitigation: keep detached Cell evidence accessible, route by attachment/tracking state, and treat legacy `archived` as compatibility metadata rather than a default core rail.

## Engineer Handoff

Use this rule when implementation decisions get muddy:

If a behavior is about:
- git worktree discovery,
- workspace adoption,
- session/runtime anchoring,
- attachment recovery,

it belongs to core.

If a behavior is about:
- spec completeness,
- lifecycle stage,
- gate passing,
- prescribed workflow ceremony,

it belongs to an optional suite, not the default core product.
