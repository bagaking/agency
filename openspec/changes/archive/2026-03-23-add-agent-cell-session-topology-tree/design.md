## Context
Agent Cells already moved sessions into the sidebar, but the current model is still a flat list per Cell. Upcoming `fork` and `sub terminal` flows need a durable parent-child topology inside a Cell, not just more sibling sessions.

At the same time, the project still treats `Cell` as the only git/worktree boundary. The new tree must therefore describe execution structure within a Cell, not a second git hierarchy.

## Goals / Non-Goals
- Goals:
  - Represent session relationships inside a Cell as a tree.
  - Support reordering and reparenting directly from the Agent Cells sidebar.
  - Persist topology across refresh and relaunch.
  - Keep future `fork` / `sub terminal` creation flows compatible with the same model.
  - Preserve current session lifecycle, recovery, and overflow behaviors.
- Non-Goals:
  - Creating new worktrees or branches from session tree actions in this change.
  - Replacing `Cell = worktree + branch` with nested Cells.
  - Redesigning Session Map in the same change.
  - Changing tmux session lifecycle or status semantics.

## Decisions
- Decision: Session topology is Cell-local only.
  - `Cell` remains the only git/worktree unit.
  - A session child node expresses execution lineage inside the same Cell, not a new git boundary.

- Decision: Persist topology in a flat registry v2 shape.
  - Keep `sessions: []` as the storage container.
  - Add fields per session:
    - `parentSessionId: string | null`
    - `order: number`
    - `nodeKind: root | sub_terminal | fork`
    - `sourceSessionId?: string`
  - Rationale: easier migration, simpler atomic updates, and compatible with existing flat lookup/update code.

- Decision: Migrate existing registries in place on read/write.
  - Legacy registries without hierarchy fields are treated as version 1.
  - Migration maps every session to a root node with preserved relative order.
  - Suggested initial order values use spaced integers (`1000`, `2000`, ...) so sibling insertion can happen without full rewrites in common cases.

- Decision: Validate and heal invalid topology on load.
  - Missing parent => promote session to root.
  - Cycle detected => break the invalid edge and promote the affected node to root.
  - Self-parenting => reject or repair as root.
  - Rationale: session recovery matters more than preserving a broken tree shape.

- Decision: Renderer builds the visible tree from flat sessions.
  - `listSessions` continues to return flat session records.
  - Tree assembly and visible-row flattening happen in renderer/hooks.
  - A dedicated move/reparent IPC path persists mutations.
  - Rationale: keeps host responsibilities on storage/lifecycle and renderer responsibilities on view projection.

- Decision: Drag-and-drop supports three core intents plus outdent.
  - `before`: reorder before target sibling
  - `after`: reorder after target sibling
  - `into`: become the target's child
  - `outdent`: promote the dragged node to become a sibling of a hovered ancestor
  - The UI must show explicit drop previews so users can see which intent will commit.

- Decision: Hidden ancestors do not make visible sessions disappear.
  - Closed sessions remain overflow-only.
  - Detached sessions remain overflow-only unless they are currently active.
  - The visible tree is projected from non-closed sessions.
  - If a visible session's persisted ancestor is hidden, the renderer promotes it to the nearest visible ancestor/root for display while keeping the stored topology intact.

- Decision: `nodeKind` is foundation first, workflow second.
  - This change stores and preserves `root`, `sub_terminal`, and `fork`.
  - Existing create flows can still create `root` sessions by default.
  - Future `sub terminal` and `fork` actions can opt into typed creation without another storage migration.

## Risks / Trade-offs
- Risk: Tree semantics could imply nested task ownership inside one Cell.
  - Mitigation: document that tree nodes describe execution structure only; `Cell` remains the only worktree/task boundary.

- Risk: Drag-and-drop may be too ambiguous or fragile.
  - Mitigation: add clear drop affordances and explicit outdent semantics tied to hovered ancestor rows so the committed intent remains visible.

- Risk: Persisted hidden-parent relationships may feel surprising when projected back into the visible tree.
  - Mitigation: make projection deterministic and keep restore/reopen flows attached to the stored topology.

- Risk: Registry migration bugs could orphan sessions.
  - Mitigation: add migration/repair tests and conservative healing rules that always keep sessions accessible.

## Migration Plan
1. Extend session registry read/write helpers to support version 2 session topology metadata.
2. Add topology validation/repair on registry load.
3. Add session move/reparent host APIs and bridge methods.
4. Replace the flat Agent Cells session list renderer with a visible tree projection + drag/reparent UI.
5. Keep create/rename/avatar/overflow flows working against the new topology model.
6. Update spec, README, and verification steps.

## Open Questions
- None.
