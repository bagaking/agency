## Context
Session Map already treats `Ops` and `Briefing` as part of the same conceptual station, but the dock layout still reserved separate right-edge structures. That mismatch produced both UI clutter and documentation drift.

## Goals / Non-Goals
- Goals:
  - Make the docked Session Map right side behave as one station.
  - Preserve the semantic split between `Ops` and `Briefing`.
  - Keep app-level `HIL Drawer` separate in ownership and state model.
- Non-Goals:
  - Replace Commander semantics with a generic drawer.
  - Change attention vocabulary or run lifecycle semantics.

## Decisions
- Decision: `Ops` and `Briefing` share one station column.
  - Why: users should read one right-edge surface with one active mode, not parse two parallel right-side blocks.
- Decision: `Commander` becomes an affordance inside the station instead of an always-reserved peer column.
  - Why: this preserves bounded semantics while reducing idle chrome.
- Decision: `HIL Drawer` stays separate.
  - Why: shared shell grammar is acceptable; shared state/ownership is not.

## Risks / Trade-offs
- Risk: switching to one station could break focus-return or `Esc` priority.
  - Mitigation: keep the existing `commanderBriefingOpen` owner in Session Map overlay and preserve close-first behavior.
- Risk: station mode switching might hide queue/evidence state.
  - Mitigation: returning from `Briefing` should re-show the same `Ops` content without resetting focus context.
