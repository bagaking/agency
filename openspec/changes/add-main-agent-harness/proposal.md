# Change: Add Main Agent Harness

## Why
Agency now has the beginnings of a host-owned capability plane: file intents, session runtime orchestration, and tool-specific smart fork drivers are moving out of renderer-local ad hoc logic and into deterministic main-process services.

The next step is not "put a magic autonomous agent in Electron main". The next step is to define a proper Harness: a host-managed control plane that can accept a structured goal, choose and invoke approved host capabilities, coordinate tool/agent runners, and keep the whole run observable, auditable, retryable, and interruptible.

Without that boundary, future complex automations will either:
- stay trapped in brittle UI flows;
- leak tmux/file/browser details into prompts;
- or create an unbounded "main agent" that is impossible to reason about or recover safely.

## What Changes
- Introduce a Main Agent Harness as a host-managed control plane for complex tasks.
- Define a stable Harness run contract:
  - structured goal/request input;
  - operation identity and step timeline;
  - capability/tool invocation records;
  - structured result, warnings, failures, and resumable progress state.
- Define a host-managed capability registry/lane for Harness-visible capabilities instead of letting the Harness call arbitrary internals directly.
- Make `Create Agent` the primary product capability for creating/coordinating child sessions or tool workers; keep tool-native `Fork` as an optional specialized capability rather than the default semantic.
- Establish the first Harness dependency set around already-hosted capabilities:
  - session runtime gateway;
  - file intent gateway;
  - future browser / delivery / worktree capabilities as explicit follow-ons.
- Define the first runner/adaptor shape for tool-specific execution backends, with Codex as the initial reference adapter.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - new main-process harness controller / state model / IPC surface
  - capability registry and authorization/policy layer
  - existing host-managed capability gateways (session runtime, file intent) as Harness dependencies
  - future UI/API surfaces that need to start/observe/interrupt Harness runs
  - docs describing host-managed capabilities, runtime contracts, and product semantics
- Risks:
  - starting too broad will create an opaque "agent in main" blob instead of a maintainable control plane;
  - unclear boundaries between Harness, capability plane, and tool runners will cause duplication and hidden coupling;
  - using `Fork` as the core product primitive would entangle the Harness with tool-specific semantics too early.
- Mitigation:
  - keep v1 narrow: Harness controller + capability registry + run contract + one reference runner path;
  - make `Create Agent` the primary user-facing semantic;
  - require every Harness action to route through approved host-managed capabilities with explicit telemetry.
