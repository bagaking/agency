# Change: Add Unified Local Control Bus

## Why
Agency already has several strong host-owned seams:
- `file-intent` for filesystem-safe operations;
- `session-runtime` for tmux/session orchestration;
- `main-agent-harness` for bounded run control;
- `window-shell` for multi-window shell control.

Those seams are good individually, but they still read as separate products and separate entrypoints:
- they expose separate CLI wrappers;
- they use different top-level verbs and payload envelopes;
- they do not yet provide one stable automation surface over the canonical objects `Window / Project / Cell / Session / Run`.

After the canonical object model landed, Agency now has enough naming clarity to add one host-owned control bus without collapsing all capability owners into one monolith.

## What Changes
- Add one unified local control bus for Agency host automation.
- Define one shared request/response envelope that addresses canonical objects explicitly.
- Keep existing capability owners in place:
  - file operations still route through File Intent;
  - session orchestration still routes through Session Runtime;
  - run lifecycle still routes through Main Agent Harness;
  - window operations still route through Window Shell.
- Add a single local CLI wrapper for the unified bus instead of continuing to grow one CLI per host seam.
- Add a local socket transport for the same bus contract so external tools can automate the running app instance without reimplementing Electron IPC knowledge.
- Keep the bus local-only and host-owned in v1; do not introduce a remote multi-user API.

## Impact
- Affected specs:
  - `agency-editor`
- Affected code:
  - new host control-bus service and dispatcher under `apps/editor/electron/services/`
  - new CLI entry under `apps/editor/electron/cli/`
  - main-process startup/lifecycle for the local socket server
  - adapters over existing services such as:
    - `fileInteraction`
    - `sessionRuntime`
    - `mainAgentHarness`
    - `windowShell`
    - project/cell/session lookup helpers
  - related docs in `apps/editor/README.md`, `openspec/project.md`, and supporting notes
- Risks:
  - the bus could become an unbounded god-surface if it starts owning side effects directly;
  - local socket lifecycle and trust rules could become fragile if mixed with renderer IPC assumptions;
  - a broad first slice could slow delivery and create naming churn.
- Mitigation:
  - keep the dispatcher thin and capability-routed;
  - keep v1 local-only with explicit transport trust and structured caller metadata;
  - phase the first operation set around the already-shipped capability seams instead of exposing every host method at once.
