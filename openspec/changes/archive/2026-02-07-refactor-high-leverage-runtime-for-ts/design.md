## Context
Large runtime files block safe migration and increase bug risk during feature changes. The project already identified these modules as high leverage in reusable-items documentation.

## Goals
- Reduce coupling and per-file complexity in high-leverage runtime modules.
- Introduce extraction seams that map cleanly to upcoming TS conversion.
- Preserve behavior and external API compatibility.

## Non-Goals
- Full TS migration of all renderer modules.
- Major UX redesign in this change.

## Decisions
- Decompose by responsibility boundaries first (layout orchestration vs leaf views, session helpers vs session lifecycle hook, voice utility logic vs state machine).
- Keep exports and call sites stable where feasible.
- Prefer pure helper extraction for deterministic behavior and easier unit testing in later phases.

## Risks / Trade-offs
- Refactors may move many lines without reducing runtime bugs immediately.
  - Mitigation: preserve signatures, run renderer build, and keep changes incremental.
