## Context
Commander already exists as a bounded operational surface inside docked Session Map, but its current presentation is still a popup layered over the map. That shape is safe, yet it undersells the backend/operator role and makes the interaction feel transient.

At the same time, Agency already uses other right-side surfaces with strong semantics:
- HIL / Reply use the app-level right-side drawer;
- Session Map owns a dock-local right-side operational station;
- Commander should stay close to Session Map evidence instead of blending into general shell chrome.

## Goals / Non-Goals
- Goals:
  - make Commander easier to find and feel more intentional;
  - keep Commander visually attached to Session Map's right-side operational station;
  - improve perceived stability by using a drawer instead of a floating popup;
  - preserve current context binding and bounded actions.
- Non-Goals:
  - do not make Commander a global window-level assistant;
  - do not merge Commander with HIL / Reply drawer semantics;
  - do not redesign Session Map information architecture outside the right-side station.

## Decisions

### Decision: Commander entry moves to the far-right edge of the Session Map dock
The Commander avatar/identity should become the terminal anchor of the dock's right-side operational area.

Why:
- it reads as the backend/operator endpoint;
- it reduces the sense that Commander is just one more card in the middle of the dock;
- it gives the right rail a clearer directionality: cells -> ops evidence -> commander.

### Decision: Commander uses a Session Map-scoped right-edge drawer
Commander should open as a full-height drawer aligned to the right edge of the Session Map dock, not as a centered or floating popup.

Why:
- the interaction should feel inspectable and stable;
- a drawer better matches "briefing station" semantics than a floating card;
- it preserves locality to Session Map without escalating to app-shell scope.

Implications:
- the drawer opens within the Session Map overlay bounds;
- when closed, `Command Ops` remains visible and structurally unchanged underneath;
- the animation and layering should feel like a reveal from the same right-side station, not a detached modal.

### Decision: Commander remains Session Map-bound, not window-global
Even with a larger drawer form factor, Commander should continue to bind to Session Map focus context and should not appear when Session Map is closed.

Why:
- current evidence model is Session Map-centric;
- app-level right drawers are already semantically occupied;
- making Commander global would require a broader product decision about cross-view orchestration.

### Decision: Ops remains the persistent evidence layer
`Command Ops` stays visible as the durable operational evidence panel. Commander is a higher-level interpretation and action layer revealed from the same station.

Why:
- users still need a stable place for raw-ish evidence and lifecycle controls;
- Commander should not replace the evidence surface with conversational UI.

## Risks / Trade-offs
- Risk: the drawer may look like a second unrelated sidecar.
  - Mitigation: reuse Session Map visual language, edge anchoring, and right-station hierarchy.
- Risk: the entry relocation may weaken discoverability of `Command Ops`.
  - Mitigation: keep Ops title, strip, and primary actions visible even when Commander is closed.
- Risk: users interpret the wider drawer as a global assistant.
  - Mitigation: keep copy explicitly tied to Session Map, current session, and Harness evidence.

## Migration Plan
1. Update spec language to define right-edge entry and Session Map-scoped drawer presentation.
2. Move Commander trigger placement in dock layout.
3. Refactor popup layout into a right-edge drawer presentation within Session Map overlay.
4. Verify closed/open states preserve Ops continuity and focus/session/run rebinding.
