## Context
Promote currently has strict workflow logic, and Explorer send currently routes through an Action Sheet-heavy path. Both are “send selected content to Agent” interactions and should use one protocol.

## Goals / Non-Goals
- Goals:
  - Unify Promote + Explorer into one delivery interaction model.
  - Keep quick default and optional gated strictness.
  - Keep source/mode visible and auditable.
- Non-Goals:
  - Migrate Reply UI in this change.
  - Remove Action Sheet functionality.

## Decisions
- Decision: Treat Promote and Explorer as source adapters of one send system.
  - Rationale: Unified user mental model and shared logic.
- Decision: Default mode is quick across both sources.
  - Rationale: Match expected “send-like” interaction.
- Decision: Quick mode consumes source items immediately after ACK.
  - Rationale: Keep default flow minimal and deterministic.
- Decision: Delivery payload carries source/mode tags.
  - Rationale: Maintain auditability while unifying user-facing verbs.
- Decision: Keep gated mode optional and Action Sheet-linked.
  - Rationale: Preserve stricter control for high-risk workflows.

## Interaction Model
1. Collect (source adapter: promote or explorer)
2. Compose (delivery envelope with source/mode)
3. Dispatch (quick default, gated optional)
4. Track (shared status labels)
5. Audit (timeline + per-entry summary)

## Migration Plan
1. Promote modal switches to unified delivery API and mode controls.
2. Explorer footer send switches from Action Sheet-first flow to delivery quick default.
3. Advanced entry allows Explorer to run gated mode when needed.
4. Status surfaces and badges use one mapping utility.
5. Old drafts/history remain visible through backward-compatible field mapping.
