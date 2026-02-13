## Context
Electron services are the core operational layer for session lifecycle, terminal control, project/explorer IO, and memo/workbench data access. Keeping this layer in JS while surrounding runtime is TS increases refactor friction and review risk.

## Goals
- Move service modules to TS with behavior parity.
- Preserve existing function names and call paths used by IPC handlers.
- Keep migration incremental without forcing full strict typing.

## Non-Goals
- Changing service business logic semantics.
- Enabling strict TS across all Electron runtime in this phase.

## Decisions

### Decision: file-level TS migration with export parity
- Rename service files to `.ts`.
- Replace `module.exports` object exports with named `export { ... }` for stable TS module boundaries.

Rationale:
- Avoids script-scope collisions in TS compile.
- Keeps consumer call sites compatible through CommonJS emit.

### Decision: preserve mixed-module compatibility
- Continue using existing `require(...)` imports where that keeps changes low-risk.
- Avoid broad import-style rewrites in this phase.

Rationale:
- Minimizes blast radius and keeps behavior regression risk low.

## Risks / Trade-offs
- Loose typing still allows some unsafe payload shapes.
  - Mitigation: follow-up phase can add explicit service-level interfaces.
- Large migration surface can miss an export edge case.
  - Mitigation: run full Electron/renderer build and typecheck gates.
