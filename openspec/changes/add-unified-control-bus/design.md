## Context
Agency now has a stable canonical object model:
- `App -> Window -> Project -> Cell -> Session -> Run`

It also already has several host-owned capability seams:
- File Intent Gateway
- Session Runtime Gateway
- Main Agent Harness
- Window Shell

The problem is not the absence of host control points. The problem is fragmentation:
- each seam has its own top-level transport shape;
- each seam has its own CLI wrapper;
- external callers must know Agency internals instead of talking to one stable local automation surface;
- the canonical object model is not yet reflected in one bus-level contract.

This change is about adding one host-owned control bus over existing capability owners, not replacing those owners.

## Goals / Non-Goals
- Goals:
  - provide one local automation/control surface over the canonical product objects;
  - unify CLI and socket callers behind one request/response contract;
  - keep current capability owners as the real side-effect owners;
  - make external automation independent from renderer IPC implementation details;
  - keep transport trust, caller metadata, and access scope explicit.
- Non-Goals:
  - do not replace preload IPC with the control bus in this change;
  - do not make the control bus a remote multi-user API;
  - do not collapse File Intent, Session Runtime, Harness, and Window Shell into one service implementation;
  - do not expose every existing host method in v1.

## Decisions

### Decision: The control bus is host-owned and capability-routed
The unified control bus should be a thin host dispatcher.

It should:
- accept one normalized request envelope;
- resolve object references and trust/access metadata;
- dispatch the operation to the existing host capability owner;
- normalize the result/error shape.

It should not:
- directly own raw filesystem, tmux, or provider side effects;
- bypass existing gateway rules or permission seams.

### Decision: Canonical object references are first-class in the request envelope
The bus contract should make canonical object references explicit instead of hiding them inside ad hoc payloads.

At minimum v1 should support:
- `windowStateId`
- `projectRoot`
- `cellId`
- `sessionId`
- `runId`

This keeps the control surface aligned with the canonical object model and avoids transport-specific payload drift.

### Decision: CLI and local socket share the exact same operation envelope
Agency should stop growing separate ad hoc CLI surfaces for every host seam.

The control bus should define one envelope such as:
- `op`
- `refs`
- `args`
- `caller`

The same envelope should be accepted by:
- one local CLI wrapper;
- one local socket transport attached to the running app instance.

This keeps the transports thin and makes future tooling independent from Electron-specific knowledge.

### Decision: v1 stays local-only and process-trust aware
The first slice should be local-only:
- CLI callers run as trusted local host callers;
- socket callers connect through a local Unix domain socket on macOS first;
- renderer IPC remains a separate transport and should not be replaced immediately.

Trust metadata should remain explicit:
- `transportTrust`
- `accessScope`
- payload-declared caller metadata

The bus should preserve the existing distinction between transport-derived trust and caller-declared identity.

### Decision: v1 operation set should wrap the already-shipped capability seams
The first useful slice should target operations that already have strong host semantics:
- window shell:
  - list
  - new
  - focus
- file intent:
  - user/tool file intents
  - semantic classify
- session runtime:
  - inspect
  - smart fork / child session orchestration
- harness:
  - start
  - inspect
  - cancel
  - resume
  - list

Optional v1 read-side operations may also include:
- project context inspection
- cell/session listing

This gives Agency one real control surface quickly without boiling the ocean.

### Decision: Renderer migration is follow-up, not part of the first slice
The renderer should continue using the preload bridge and existing wrappers in this change.

The unified bus is primarily for:
- host CLI tooling;
- local automation clients;
- future external operators or test harnesses.

If Agency later wants the renderer to consume the same dispatcher core, that should happen behind existing renderer service wrappers rather than by exposing raw bus details to React code.

## Proposed Contract Shape

Example request envelope:

```json
{
  "op": "run.start",
  "refs": {
    "windowStateId": "window-1",
    "projectRoot": "/repo",
    "cellId": "cell-main",
    "sessionId": "session-ui"
  },
  "args": {
    "goal": {
      "type": "create_agent"
    }
  },
  "caller": {
    "callerType": "tool",
    "callerId": "agency-script",
    "traceId": "trace-1"
  }
}
```

Example response envelope:

```json
{
  "success": true,
  "op": "run.start",
  "warnings": [],
  "failures": [],
  "data": {
    "runId": "run-123"
  }
}
```

## Risks / Trade-offs
- Risk: too many operations ship under one vague surface.
  - Mitigation: use strict namespaced operations and capability-owned routing.
- Risk: socket transport creates lifecycle edge cases with app startup/shutdown.
  - Mitigation: keep the socket server attached to main-process lifecycle and fail explicitly when the bus is unavailable.
- Risk: users confuse this with a network API or collaboration backend.
  - Mitigation: keep v1 explicitly local-only and document that clearly.

## Migration Plan
1. Define the canonical control-bus request/response envelope.
2. Add one host dispatcher and operation registry over existing capability owners.
3. Add a unified CLI wrapper for the dispatcher.
4. Add a local Unix domain socket transport that reuses the same dispatcher.
5. Route the first operation set through the bus.
6. Document trust, refs, and capability ownership rules.

## Open Questions
- Should v1 include subscription/streaming operations, or stay request/response only?
- Should project/cell/session listing be part of the first operation set, or only file/runtime/run/window controls?
- Should the socket path live under app `userData`, repo-local runtime state, or a dedicated temp/runtime directory?
