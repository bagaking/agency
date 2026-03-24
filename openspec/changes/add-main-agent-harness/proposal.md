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
- Introduce an agent-backed runner layer for tool-specific execution backends, with Codex as the first default provider path.
- Keep the current reference runner only as a short-lived transitional/test path, not the long-term product default.
- Introduce encapsulated runner skill packs for complex tool-native specializations so future agent runners can consume approved playbooks without bypassing host-managed capabilities.
- Route the Agent Cells `Fork` entry through Harness `Create Agent` semantics, where `Fork` is modeled as a tool-native specialization instead of the Harness core concept.
- Add a dedicated Harness settings/provider registry layer so runner selection and provider-specific knobs do not leak into Terminus profile settings or renderer-local code.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - new main-process harness controller / state model / IPC surface
  - capability registry and authorization/policy layer
  - new agent-backed runner/provider registry and settings layer
  - existing host-managed capability gateways (session runtime, file intent) as Harness dependencies
  - future UI/API surfaces that need to start/observe/interrupt Harness runs
  - Agent Cells child-session creation paths that should hand off specialized flows to Harness
  - docs describing host-managed capabilities, runtime contracts, and product semantics
- Risks:
  - starting too broad will create an opaque "agent in main" blob instead of a maintainable control plane;
  - unclear boundaries between Harness, capability plane, and tool runners will cause duplication and hidden coupling;
  - using `Fork` as the core product primitive would entangle the Harness with tool-specific semantics too early.
- Mitigation:
  - keep v1 narrow: Harness controller + capability registry + run contract + one bounded agent-backed provider path;
  - switch to an agent-backed runner as early as possible so the transitional reference runner does not become product debt;
  - make `Create Agent` the primary user-facing semantic;
  - require every Harness action to route through approved host-managed capabilities with explicit telemetry;
  - derive trust from host transport context and keep payload caller metadata audit-only.
