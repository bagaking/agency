## Context
Agency already exposes runtime evidence through Session Map `Ops` and `Commander / Briefing`, and it already maintains window-local project context plus session/run ownership. What is missing is a routing layer that answers one product question quickly: "what should I handle next?"

Attention must remain a state layer over canonical objects. It must not become:
- a new product root competing with `Window / Cell / Session / Run`
- a toast feed
- a global chat surface
- an Explorer/control-bus rewrite

## Goals
- Model attention over canonical objects: `Window`, `Cell`, `Session`, `Run`.
- Use one shared vocabulary for attention states across shell chrome, Agent Cells, and Session Map.
- Keep jump actions explicit and bounded.
- Preserve current Commander / Ops boundaries.

## Non-Goals
- Replacing `Ops` with a generic inbox
- Extending Explorer platform semantics
- Adding new external automation surfaces
- Building a stack of transient notices

## Decisions

### Decision: Attention is a canonical state layer, not a surface-local ornament
The renderer computes one attention model from existing state:
- window shell summaries
- cell lifecycle confirmation state
- session activity vs visited state
- harness run status and tracked source refs

Surfaces consume that model and render the same labels and severity semantics.

### Decision: Cross-window attention uses a minimal persisted summary
The current window writes a compact `attentionSummary` into its window UI state. Window shell listing reads that summary and rebroadcasts it through existing window-shell update paths.

This keeps the host-facing contract minimal:
- no new control bus family
- no new persistent store
- no new background process

### Decision: Jump behavior follows object ownership
- `Window` attention focuses the target window.
- `Session` unread / return-required attention focuses the session in Agent Cells.
- `Run` failed / running attention opens Session Map and selects the relevant session when known.
- `Cell` pending-confirmation attention returns focus to that cell while preserving existing lifecycle modal ownership.

### Decision: Attention respects existing Commander / Ops boundaries
Attention may route users into Session Map `Ops`, but it does not make `Commander` a window-global inbox. `Briefing` remains a bounded operator explanation surface, not the owner of attention state.

## Implementation Notes
- Introduce shared attention types in `apps/editor/shared/attention.ts`.
- Build pure attention-model helpers in renderer for sorting, grouping, and summary generation.
- Annotate tracked harness runs with source `cellId/sessionId` so run attention has deterministic jump targets.
- Surface local attention in:
  - Status bar primary item
  - Agent Cells queue + row/cell emphasis
  - Session Map Ops queue + token/card emphasis
- Surface cross-window attention in:
  - window switcher rows
  - status bar primary item when another window is more urgent than the current one
