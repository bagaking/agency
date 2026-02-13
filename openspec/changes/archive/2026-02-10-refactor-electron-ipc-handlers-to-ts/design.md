## Context
IPC handlers represent the contract edge between renderer and main process. Even with the Electron TS entry foundation, handlers still sit in JS, limiting type-guided refactors and making future API evolution riskier.

## Goals
- Move IPC handlers to TS with minimal behavior drift.
- Preserve existing channel names and initialization order.
- Keep migration incremental and compatible with existing JS service modules.

## Non-Goals
- Rewriting handler business logic semantics.
- Full strict-type modeling of every payload shape in this phase.

## Decisions

### Decision: File-level migration with behavior parity
- Rename handler files to `.ts` and preserve logic.
- Keep `require(...)` imports for JS service compatibility.

Rationale:
- Lowest risk path while still enforcing TS compilation over handler layer.

### Decision: Registration orchestration cleanup
- Replace repetitive direct setup calls with concise grouped orchestration in `ipcSetup`.

Rationale:
- Reduces edit surface for future handler additions and lowers structural complexity.

## Risks / Trade-offs
- TS with permissive settings does not fully type payloads yet.
  - Mitigation: future phase can tighten payload typing file-by-file.
- Handler count is large; accidental omission is possible.
  - Mitigation: maintain explicit setup arrays and run runtime build validations.
