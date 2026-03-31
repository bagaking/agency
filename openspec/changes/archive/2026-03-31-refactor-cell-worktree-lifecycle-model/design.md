## Context

The current model treats a Cell as a thin projection of `git worktree list` plus a lifecycle file stored inside that worktree.

That implementation leaks through the whole product:
- Cell lifecycle metadata lives in `worktree/.agency/cell-<worktree>.yaml`;
- session registries live in `worktree/.agency/sessions-<worktree>.yaml`;
- several "project-scoped" settings services also read and write under `worktree/.agency/...`;
- Cell update paths resolve the Cell by first rediscovering the worktree.

As a result, worktree cleanup and Cell lifecycle are not independent operations.

The user-visible failure mode is consistent:
- external or session-driven worktree cleanup removes the storage anchor for Cell/session state;
- detached Cells cannot be archived as durable evidence objects;
- project scope configuration disappears or changes with Cell/worktree churn;
- Gate Create / Gate Execute scaffolding behaves like mandatory lifecycle shell instead of optional workflow tooling.

## Goals

- Make `Cell` a durable repo-owned product object instead of a live-worktree projection.
- Separate Cell lifecycle state from worktree attachment state.
- Preserve sessions, replies, runs, and workflow artifacts even when the worktree is missing.
- Normalize Project scope to repository-root storage and Agent scope to repo-owned Cell storage.
- Make Turn tooling explicit and opt-in.
- Provide a migration path from legacy worktree-local metadata without dropping evidence.

## Non-Goals

- Do not change the canonical `Create Cell` / `Create Agent` vocabulary.
- Do not redesign Gate or Action Sheet UI in this change beyond changing when they are created by default.
- Do not replace tmux-based session runtime semantics.
- Do not redesign Explorer's root-selection UX in detail here; only ensure detached Cells no longer break the model.

## Decisions

### Decision: Cell identity becomes repo-owned durable storage

Each Cell will have a repo-owned record under:

```text
<repo>/.agency/cells/<cell-id>/cell.yaml
```

This record owns:
- Cell identity;
- lifecycle state (`draft / active / archived / paused` as applicable);
- attachment metadata;
- timestamps and durable metadata.

Cell existence must no longer depend on the current worktree list.

### Decision: Worktree attachment is a separate runtime seam

The model will separate:
- lifecycle state: the domain/workflow state of the Cell;
- attachment state: whether the Cell currently has a live worktree attachment.

Recommended attachment states:
- `attached`
- `detached`
- `missing`

Losing a worktree must not erase the Cell.

### Decision: Session persistence moves under the Cell store

Session registries will move from worktree-local storage to repo-owned Cell storage:

```text
<repo>/.agency/cells/<cell-id>/sessions.yaml
```

That keeps:
- session topology;
- recoverable session metadata;
- stale/offline session evidence

independent from the current worktree attachment.

### Decision: Agent-scoped config becomes Cell-owned, Project-scoped config becomes repo-root owned

Project scope will always resolve from repository-root `.agency/`.

Agent scope will move under the Cell store, for example:

```text
<repo>/.agency/cells/<cell-id>/gates.yaml
<repo>/.agency/cells/<cell-id>/quick-actions.yaml
<repo>/.agency/cells/<cell-id>/terminus-settings.yaml
<repo>/.agency/cells/<cell-id>/app-shortcuts.yaml
<repo>/.agency/cells/<cell-id>/reply-quick-prompts.yaml
<repo>/.agency/cells/<cell-id>/session-naming.yaml
```

This avoids path semantics like `gates-<worktree-name>.yaml`, which only work while Cell identity is still derived from the attachment.

### Decision: Detached Cell cleanup is a first-class lifecycle path

If a worktree is removed externally or from inside a session:
- the editor reconciles the Cell into `attachmentState=missing` or `detached`;
- the Cell remains selectable;
- the user can archive or delete the Cell without recreating the old worktree.

Archive/delete flows for detached Cells will be explicit and attachment-aware.

### Decision: Turn tooling is explicit, not default Cell ceremony

Gate Create / Gate Execute / Action Sheet scaffolding remains supported, but:
- creating a Cell must not auto-create workflow artifacts by default;
- users should invoke Turn tooling only when they want formal pre/post development workflow control.

This keeps workflow tools powerful without making every Cell creation feel like opening a process template.

### Decision: Migration is additive and fallback-safe

Migration should proceed in this order:
1. load repo-owned Cell records if present;
2. reconcile current git worktree attachments;
3. import legacy lifecycle/session/config data from worktree-local `.agency/` files when missing in the new store;
4. keep legacy read fallback until migration is proven stable;
5. only then remove legacy assumptions from runtime code.

No migration step should silently discard session or workflow evidence.

## Proposed Storage Layout

```text
<repo>/.agency/
  cells/
    <cell-id>/
      cell.yaml
      sessions.yaml
      gates.yaml
      quick-actions.yaml
      terminus-settings.yaml
      app-shortcuts.yaml
      reply-quick-prompts.yaml
      session-naming.yaml
  gates.yaml
  quick-actions.yaml
  terminus-settings.yaml
  app-shortcuts.yaml
  reply-quick-prompts.yaml
  session-naming.yaml
  worktree-links.yaml
```

Notes:
- `worktree-links.yaml` remains repo-root owned because it is already project-scoped.
- legacy worktree-local files can be imported from `worktree/.agency/` during migration, but they stop being source-of-truth.

## Migration / Rollout Plan

### Phase 1: Repo-owned Cell store
- introduce Cell store read/write service;
- reconcile Cell records against current `git worktree list`;
- expose attachment state separately in IPC payloads.

### Phase 2: Session registry migration
- read/write sessions from repo-owned Cell storage;
- import legacy worktree-local registries;
- preserve stale/offline sessions when attachments disappear.

### Phase 3: Scoped config normalization
- move Project scope reads/writes to repository root for all Hierarchy features;
- move Agent scope reads/writes to repo-owned Cell storage;
- keep legacy read fallback for per-worktree files during migration.

### Phase 4: UI and workflow cleanup
- surface detached/missing attachment states in Agent Cells and related surfaces;
- allow archive/delete for detached Cells;
- remove default Gate Create bootstrap on Cell creation;
- keep explicit Turn tooling entry points.

## Risks / Trade-offs

- Repo-owned Cell storage introduces a second reconciliation source next to git worktrees.
  - Mitigation: make git worktrees attachment evidence, not Cell identity.

- Migration bugs could duplicate or orphan legacy per-worktree state.
  - Mitigation: add deterministic import markers and non-destructive fallback reads.

- Existing users may depend on auto-start Turn behavior.
  - Mitigation: keep the action available, but make it explicit rather than automatic.

## Engineer Handoff

Treat this as a domain-boundary refactor, not a UI patch set.

The hard requirement is:
- `Cell` must survive attachment loss;
- `Session` must belong to `Cell`, not to `worktreePath`;
- `Project` scope must mean repository root everywhere;
- workflow tooling must stop pretending to be the Cell's identity.
