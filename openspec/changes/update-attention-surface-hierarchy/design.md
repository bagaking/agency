## Context
Agency already treats attention as a shared layer over canonical objects. The problem is not the model; it is surface ownership. A full queue in Agent Cells makes the sidebar compete with itself: one part tries to be the workspace manager, another part tries to be the triage console.

## Goals / Non-Goals
- Goals:
  - Keep one shared attention model and vocabulary.
  - Make surface roles explicit enough that future changes do not reintroduce a second queue surface.
  - Preserve fast navigation from all surviving attention affordances.
- Non-Goals:
  - Redesign the attention model itself.
  - Add new attention kinds or severities.
  - Invent another dashboard, drawer, or summary strip in Agent Cells.

## Decisions
- Decision: Session Map `Ops` is the only queue-style triage surface for current-window attention.
  - Why: `Ops` already owns run evidence, jump actions, and intervention workflows. A queue belongs next to those capabilities.
- Decision: shell chrome stays compact.
  - Why: the Status Bar and window switcher must keep urgency visible without turning shell chrome into a second dashboard.
- Decision: Agent Cells uses inline/local attention only.
  - Why: Agent Cells is first a Cell/Session management surface. Inline pills on the owning Cell / Session preserve context without displacing the list.
- Decision: Keep the shared attention layer untouched.
  - Why: the bug is surface composition, not data ownership. Replacing shared attention with per-surface heuristics would be easier short-term and wrong long-term.

## Alternatives Considered
- Keep the Agent Cells queue and make it smaller.
  - Rejected because it keeps the same ownership mistake in a slightly shorter box.
- Move a full queue into the Agent Cells header.
  - Rejected because it still makes Agent Cells carry a second triage station.
- Duplicate full queues in both Agent Cells and Session Map.
  - Rejected because it creates two “current window priority” authorities and invites drift.

## Risks / Trade-offs
- Risk: removing the queue could make background attention feel less discoverable inside Agent Cells.
  - Mitigation: keep clickable inline Cell / Session pills and retain Status Bar `Next` plus Session Map `Priority Queue`.
- Risk: docs drift could reintroduce the removed queue later.
  - Mitigation: update spec delta, session-management notes, README verification, manual test checklist, and reusable-item catalogs in the same change.

## Migration Plan
1. Write the OpenSpec delta and doc updates.
2. Remove Agent Cells queue rendering.
3. Keep inline pills and existing jump behavior.
4. Add a unit test asserting Agent Cells no longer renders a queue card while inline attention remains visible.

## Open Questions
- None for this scope.
