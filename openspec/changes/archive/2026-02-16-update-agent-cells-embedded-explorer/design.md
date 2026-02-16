# Design: Agent Cells Embedded Explorer Evolution

## Context
Agent Cells already exposes an Explorer-adjacent file dashboard, but UX cohesion and data semantics lag behind user expectations:
- Users expect a bottom-context panel aligned with selected Cell actions.
- Users expect Cell-level "modified files" (git reality) with explicit `Changes` vs `All` affordances.
- Users need consistent drag/drop workflows across Agent Cells and Explorer.

## Goals / Non-Goals
- Goals:
  - Align panel placement and interaction flow with Agent Cells context.
  - Clarify filter semantics (`Changes` vs `All`) while keeping Cell/worktree as the only granularity.
  - Keep unified file-intent routing and import safety rules.
  - Preserve Flat/Tree discoverability patterns.
- Non-Goals:
  - Per-session file-change attribution inside the embedded Explorer panel (too ambiguous without explicit instrumentation).
  - Full file CRUD inside Agent Cells panel (rename/move/delete remains Explorer-owned).
  - Replacing main Explorer tree.
  - New filesystem mutation semantics outside `import_copy`/`open`/`reveal` contracts.

## Decisions

### Decision: Placement and Information Architecture
Render the Agent Cells embedded Explorer as a bottom-anchored section in the sidebar, after Cell structures, with a collapsed bottom bar and default half-height expansion. This keeps file context in-place without jumping to top controls while preserving resizable split ergonomics.

### Decision: Cell-Scoped Data Contract
- The embedded Explorer panel is Cell/worktree scoped only.
- It provides `Changes` and `All` filters:
  - `Changes` derives from canonical Explorer status data (git-modified/untracked/etc. under selected worktree) and excludes ignored entries by default.
  - `All` combines tracked+untracked file listing with status overlays where available.

This avoids ambiguous per-session attribution while keeping the panel useful as a worktree-aware navigation surface.

### Decision: Interaction Contract
- File row `open` / `reveal` continue to route through unified file intents.
- Drag-out continues to use unified `text/plain` absolute-path payload helper.
- Drop-in accepts external file payloads and routes to unified `import_copy` with existing conflict-safe/path-safe behavior.

### Decision: Performance Guardrails
- Reuse existing status caching where possible.
- Keep refresh cadence bounded and avoid unbounded scans in sidebar render cycles.
- Maintain deterministic ordering for stable virtualized rendering and keyboard navigation expectations.

## Risks / Trade-offs
- Additional status reads may impact sidebar performance on large repos.
  - Mitigation: status cache reuse + throttled refresh.
- Filter semantics (`Changes` vs `All`) can confuse users.
  - Mitigation: explicit labels, helper text, and clear empty states.
- Drop-in import can increase accidental filesystem writes.
  - Mitigation: selected-cell root targeting + existing `import_copy` safety checks and conflict handling.

## Migration Plan
1. Introduce Cell-scoped data adapters for `Changes` and `All` views.
2. Move UI container to bottom section while preserving existing controls.
3. Wire drop-in import path through unified file intent.
4. Add test coverage and manual verification checklist.
5. Update docs and release notes.

## Open Questions
- Should drop-in behavior support a target subfolder selection inside Agent Cells panel, or remain root-only in this phase?
