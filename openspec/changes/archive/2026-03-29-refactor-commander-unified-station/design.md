## Context
Agency already has the raw ingredients for a serious Commander capability:
- Session Map owns a dock-local right-side operational station
- `Command Ops` already acts as the persistent evidence rail
- `Briefing` already acts as a bounded higher-level interpretation/action layer
- Agent Cells already has Commander-backed session actions
- Main Agent Harness already provides the control-plane seam for bounded execution

The problem is not missing capability. The problem is fragmentation.

Current fragmentation shows up in three ways:
1. product language drift
- some docs and older specs still describe Commander as a popup
- newer docs describe a right-edge panel / station model

2. model drift
- Session Map surfaces each derive their own run/status/context slices
- readiness for Commander-backed actions lives on a separate path
- Commander-owned task flows do not yet read as one surface family

3. visual drift
- the Commander entry, Briefing panel, Ops rail, session-menu affordances, and task sheets do not yet clearly read as one cohesive subsystem

This change also assumes the canonical object split:
- `Commander` is a surface/capability;
- `Run` is the orchestration object;
- `Session` remains the execution-lane object that Commander inspects or targets.

## Goals / Non-Goals
- Goals:
  - define Commander as one bounded product capability instead of several adjacent micro-features
  - preserve the existing Harness and capability-plane boundaries
  - unify Commander context, readiness, and action ownership behind one model
  - unify Commander visual language across all Commander-owned surfaces
  - reduce overlapping Commander OpenSpec changes to one canonical plan
- Non-Goals:
  - do not turn Commander into a generic window-global assistant
  - do not merge Commander semantics with Session Reply or HIL
  - do not move raw tmux/file/browser side effects into renderer-facing Commander UI code
  - do not force every Commander interaction to require a provider round-trip when local evidence is sufficient

## Decisions

### Decision: Commander is one product package, not a pile of slices
Commander should be treated as one operator-station package:
- one product identity
- one context model
- one ownership model
- one visual family
- multiple entry surfaces

Why:
- users should not need to infer whether they are dealing with "the Session Map commander", "the smart fork commander", or "the naming commander"
- the product should read as one coherent operator system

### Decision: Commander keeps two execution modes under one brand
Commander should support two explicit execution modes:
- `evidence` mode:
  - deterministic, local, evidence-backed explanation from current session/run/error facts
  - used for briefing/status/failure/next-step interpretation when a provider round-trip is unnecessary
- `agent` mode:
  - provider-backed, Harness-routed execution for bounded actions such as smart fork and smart name
  - may produce long-running runs, structured failures, or user-confirmed choices

Why:
- current product already mixes these two behaviors
- hiding the difference causes conceptual drift and implementation confusion
- forcing everything through the provider would make the station slower and less reliable for basic explanation

Implication:
- the UI should present one Commander family while the model tracks which execution mode produced a given response or action

### Decision: Commander model is shared, surfaces are adapters
The canonical Commander state should be represented by shared concepts rather than recomputed independently per surface:
- `CommanderContext`
  - focused session
  - relevant run
  - visible operational error
  - latest evidence summary
- `CommanderReadiness`
  - provider settings completeness
  - command availability
  - lightweight provider/backend reachability
  - per-action suitability when relevant
- `CommanderActionCatalog`
  - inspect
  - cancel
  - retry
  - smart fork
  - smart name
- `CommanderPresentation`
  - status labels
  - ownership labels
  - copy/tone mapping

Why:
- Session Map Ops, Briefing, Agent Cells menu items, and task sheets should not all derive run identity/status differently

### Decision: One visual system, multiple surfaces
Commander surfaces should share one visual design language:
- same avatar identity
- same status pill logic
- same ownership badge language
- same context-strip hierarchy
- same action chip/button family
- same motion and reveal semantics where feasible

Surface mapping:
- Session Map right-edge station:
  - `Ops` remains the persistent evidence layer
  - `Briefing` remains the reveal panel for interpretation and bounded actions
- Agent Cells session menu:
  - Commander-backed actions remain menu items, not a second station
  - they still use clear Commander ownership cues from the same visual family
- Commander task sheet:
  - should feel like a specialized Commander workflow, not a random modal with unrelated styling

### Decision: Commander stays Session Map-bound as a station, but not Session Map-only as a capability
Commander as a station remains Session Map-scoped.
Commander as a capability may surface Commander-owned actions elsewhere, such as Agent Cells.

Why:
- this preserves the strong Session Map mental model for the main station
- it still allows Agent Cells to invoke Commander-backed actions without inventing a second product

Implication:
- Agent Cells should be treated as an entry surface into the Commander capability, not as a second independent Commander station

### Decision: Older Commander changes become historical slices, not parallel plans
The existing Commander changes should be marked as superseded by this change:
- `add-session-map-commander-dialog`
- `update-session-map-commander-drawer`
- `add-commander-smart-session-actions`

Why:
- they overlap in capability scope and language
- leaving them active in parallel encourages future drift and duplicate implementation

## Architecture Shape

### Shared
- `shared/commander/*`
  - Commander types
  - action ids and ownership metadata
  - status/tone/copy contracts

### Electron / Host
- `electron/services/commander/*`
  - readiness probing
  - Commander action facade
  - Harness-facing execution routing
  - provider-backed action preparation and result normalization

### Renderer
- `renderer/features/commander/*`
  - `useCommanderContext`
  - `useCommanderStation`
  - shared Commander UI primitives
  - station shell and sub-panels

### Surface adapters
- Session Map uses the Commander station shell
- Agent Cells uses Commander action adapters
- Commander task sheet uses Commander task presentation primitives

## Risks / Trade-offs
- Risk: package thinking becomes a giant module with poor boundaries.
  - Mitigation: unify the product model, not the process boundaries; keep shared/electron/renderer split explicit.
- Risk: a unified visual language becomes repetitive or over-branded.
  - Mitigation: reuse family traits without forcing identical layouts on menu items, panels, and task sheets.
- Risk: older active changes remain partially referenced after the new change lands.
  - Mitigation: add explicit superseded notes immediately and point future work to this change only.

## Migration Plan
1. Mark overlapping Commander changes as superseded.
2. Add one canonical Commander delta under `agency-editor`.
3. Introduce shared Commander model/types and one readiness/action facade.
4. Migrate Session Map station surfaces to the shared model.
5. Migrate Agent Cells Commander-owned actions and task sheets to the same family.
6. Update docs/reusable-item references to point at the unified Commander station package.
