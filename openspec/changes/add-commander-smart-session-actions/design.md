> Superseded by `refactor-commander-unified-station`.
>
> Keep this file only as historical context for the earlier smart-action slice.
>
> The detailed body below is historical only and MUST NOT be treated as the current Commander source of truth.

## Context
Agency already has:
- a host-owned Main Agent Harness;
- a Commander product surface inside Session Map;
- deterministic session auto-naming rules for new sessions;
- a Harness-backed `Fork` specialization.

What is missing is a clean session-row action model for Commander-backed operations.
Today the menu exposes `Fork` as if it were a normal always-available local action, and there is no small Commander-backed flow that lets the user validate "is the Harness path healthy right now?" without starting a deeper session orchestration.

## Goals / Non-Goals
- Goals:
  - expose Commander-backed smart actions directly from the session context menu;
  - make Commander ownership explicit in the labels;
  - hide Commander-backed actions when Commander is not ready;
  - add a bounded `Smart Name` flow that exercises the Harness/provider path with low operational risk;
  - keep local/manual session actions available independently of Commander state.
- Non-Goals:
  - do not turn the session context menu into a generic chat launcher;
  - do not make local rename depend on Commander;
  - do not replace existing deterministic auto-naming rules for new sessions;
  - do not introduce open-ended multi-step planning for naming.

## Decisions

### Decision: Split local actions from Commander-backed actions in the session context menu
The menu should distinguish:
- local actions that execute immediately in existing renderer/main flows; and
- Commander-backed actions that require Harness/provider readiness.

Commander-backed actions must include the label suffix `[by commander]`.

### Decision: Define one shared Commander readiness gate
`Smart Fork [by commander]` and `Smart Name [by commander]` should use the same readiness source.

For this change, Commander is considered ready only when:
- required Harness provider settings are complete; and
- a lightweight provider/backend reachability probe succeeds.

If the gate is false, these actions are hidden instead of shown disabled.

### Decision: Keep Smart Fork as a Commander-backed specialization
`Smart Fork [by commander]` should remain the session-row entry that starts the existing Harness `Create Agent` specialization.

It should also require a per-session suitability gate in addition to Commander readiness.
At minimum, the menu should not expose `Smart Fork [by commander]` when the current source session lacks both:
- a proven true smart-fork path; and
- a concrete child launch path.

### Decision: Smart Name is a bounded Commander-backed rename suggestion flow
`Smart Name [by commander]` should:
- gather bounded current-session context, such as session identity, cell/project metadata, recent visible output/preview summary, and current naming config;
- ask Commander for 1-3 short candidate names;
- let the user pick one candidate;
- apply the result through the existing session rename path.

The first slice should not auto-apply without confirmation.

### Decision: Smart Name should reuse existing naming primitives where possible
The existing deterministic naming system remains the source of:
- naming vocabulary/settings storage;
- scope resolution;
- renderer preview affordances where relevant.

Commander smart naming is an additive suggestion layer, not a replacement for deterministic rule-based auto naming.

## Risks / Trade-offs
- Risk: readiness probe adds latency before menu actions appear.
  - Mitigation: cache the last successful probe for a short TTL and refresh asynchronously.
- Risk: provider-reachable today does not guarantee a later long-running Harness action will succeed.
  - Mitigation: treat readiness as a menu-visibility gate, not a success guarantee.
- Risk: Smart Name can produce vague or unstable suggestions.
  - Mitigation: keep output schema tight and require short candidate names only.

## Migration Plan
1. Add spec language for Commander-backed session actions and readiness gating.
2. Add a lightweight Commander readiness service/state surface.
3. Add a session suitability check for Commander smart fork.
4. Update session context menu rendering and labels.
5. Wire smart fork to the gated Commander entry.
6. Add the bounded smart naming flow.
7. Add manual verification covering both visible and hidden menu states.

## Open Questions
- Whether the old generic `Create Fork` label should be fully replaced by `Smart Fork [by commander]` in the same change, or briefly coexist behind different readiness semantics.
