## Context
Session Map dock already has a right-side operational cluster:
- `Commander` shows backend identity and coarse status.
- `Command Ops` shows active run timeline, error text, and quick actions.

This gives Agency a strong visual affordance for a backend/operator relationship, but the interaction model stops at observation. Users still need to manually infer:
- why a run failed;
- whether the focused session and the active run are related;
- what the next best action is.

The product opportunity is to turn `Commander` from a passive emblem into an interactive, bounded diagnostic/orchestration surface without collapsing into a generic chat product.

## Goals / Non-Goals
- Goals:
  - let users open a Commander dialog directly from the Session Map `Commander` identity;
  - keep the dialog grounded in current focus session and active Harness run;
  - preserve the Host-managed Capability Plane and Harness control-plane boundaries;
  - make the right rail clearer rather than more fragmented.
- Non-Goals:
  - do not build a general-purpose unconstrained chat assistant in v1;
  - do not duplicate Session Reply semantics or storage;
  - do not let Commander dialog directly own tmux/file/browser side effects outside approved host-managed capabilities.

## Decisions

### Decision: Commander dialog is a right-rail operational surface, not a separate global chat window
The dialog should live in the same right-side operational area as `Command Ops`.

Why:
- the user intent is tied to current session/run operations;
- moving elsewhere would dilute context and add navigation cost;
- the right rail already carries the mental model of “backend/operator station”.

Implication:
- clicking `Commander` opens a separate popup over Session Map;
- the underlying `Ops` rail remains structurally stable instead of being replaced by chat content.

### Decision: Commander dialog is context-bound by default
Commander dialog should automatically bind to:
- current focused session in Session Map, if any;
- active Harness run in that project/window, if any;
- latest visible session error / operational evidence when relevant.

The user should not need to manually restate “which run” or “which session” for common questions.

Implication:
- the dialog header should emphasize session identity and backend relationship;
- low-value repeated text such as `MAIN · DRAFT` should not dominate the presentation;
- responses should prefer current run/session facts before generic prose.

### Decision: Commander dialog remains distinct from Session Reply
Session Reply is a memo-backed relay for sending content to sessions.
Commander dialog is a backend-facing operational interaction.

Implication:
- no reuse of Reply storage semantics as the primary mental model;
- no automatic treatment of Commander messages as reply memos;
- the UX should visually read as “talk to backend/operator”, not “send a message to a session”.

### Decision: Commander actions must stay capability-bounded
Any imperative action surfaced in the dialog must route through approved host-managed capabilities and Harness seams.

Examples:
- explain current run/failure using run timeline/capability-call records;
- inspect more detail for current run;
- cancel or retry through existing Harness lifecycle operations;
- future follow-ons may call other approved capabilities, but not raw tmux/file internals.

### Decision: v1 should prioritize interpretability over autonomy
The first Commander dialog slice should be optimized for:
- explanation,
- recommendation,
- safe bounded operational actions.

It should not attempt to be an open-ended agent that improvises invisible side effects.

## Proposed UX Shape

### Entry
- Click `Commander` avatar/card in docked Session Map.

### Right Rail Layout
- Commander dialog opens as a popup over Session Map, visually adjacent to the right-side operational area.
- `Ops` remains the stable underlying evidence rail for timeline/error inspection.
- Closing the popup should reveal the same `Ops` state and context without re-layout surprises.

### Dialog Content
- Header:
  - commander avatar
  - focused session identity
  - active run summary when present
- Body:
  - conversation history
  - compact assistant/backend messages
  - evidence-backed summaries
- Footer:
  - bounded prompt composer
  - quick prompts such as:
    - `What is the run doing?`
    - `Why did Fork fail?`
    - `What should I do next?`
    - `Retry this run`

## Risks / Trade-offs
- Risk: the rail becomes cluttered.
  - Mitigation: keep one operational rail; avoid introducing a second independent right-side system.
- Risk: users over-trust free-form chat behavior.
  - Mitigation: bias v1 toward evidence-backed summaries and explicit bounded actions.
- Risk: scope creeps into “general main agent chat”.
  - Mitigation: keep the proposal anchored to Session Map, focused session, and active Harness run.

## Migration Plan
1. Add spec language for Commander dialog capability.
2. Implement renderer entrypoint and right-rail layout state.
3. Add bounded backend context contract.
4. Add manual verification and docs.

## Resolved v1 Choices
- Commander dialog is a popup, while `Ops` remains a persistent underlying rail.
- Commander message history is ephemeral to the current Session Map lifecycle and rebinds as context changes.
- v1 supports both quick prompts and typed input, but the response model remains bounded to current session/run evidence and approved actions.
