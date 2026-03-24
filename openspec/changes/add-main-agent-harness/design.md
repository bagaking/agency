## Context
Agency is converging on the right host architecture in pieces:
- file operations are moving behind a unified gateway;
- session automation is moving behind a session runtime gateway;
- terminal runtime sensing is being split into reusable host primitives;
- tool-specific logic is being isolated into drivers.

Those are prerequisites for a Harness, but they are not the Harness itself.

The reference direction in `cclaw` is useful here, especially:
- host-managed capabilities as a first-class product boundary;
- a scheduler/control-plane loop distinct from execution runners;
- tool-specific runners isolated from the control plane;
- structured run state, retry, and observability.

Agency should borrow those boundaries, not necessarily their concrete runtime stack.

## Goals / Non-Goals
- Goals:
  - define a maintainable Main Agent Harness architecture for Agency;
  - keep the Harness as a control plane, not a bag of direct tmux/file/browser hacks;
  - route Harness actions through host-managed capabilities with stable contracts;
  - make `Create Agent` the default product semantic for child task execution;
  - support future tool-specific enhancements such as true Codex fork without making them the Harness core;
  - make agent-backed execution the default destination quickly, so a transitional JS reference runner does not become architecture debt;
  - leave a clean seam for future runner agents to consume approved skill packs instead of improvising raw tmux/file operations.
- Non-Goals:
  - do not implement a fully autonomous open-ended planner in v1;
  - do not expose arbitrary unrestricted tool execution to the Harness;
  - do not collapse capability logic into the Harness controller;
  - do not make tool-native `Fork` the main product primitive.

## Decisions

### Decision: The Harness is a control plane, not a free-form runtime blob
The Main Agent Harness should own:
- run creation;
- step orchestration;
- capability selection/invocation;
- run progress and failure state;
- interruption / cancellation / retry boundaries;
- audit and observability.

It should not directly own:
- file mutation rules;
- tmux scripting;
- browser state details;
- tool-specific wire protocols.

Those belong to host-managed capabilities and runner adapters.

### Decision: Introduce a Host-Managed Capability Plane for Harness consumers
Agency should formalize a capability plane similar in spirit to `cclaw`'s host-managed capability boundary.

A capability visible to the Harness should have:
- a stable request/response contract;
- a runtime ownership boundary;
- auditable artifacts / side effects;
- explicit authorization/policy hooks;
- deterministic error codes.

Expected first Harness-visible capabilities:
- session runtime gateway
- file intent gateway
- future browser capability
- future delivery capability
- future worktree/cell lifecycle capability

The Harness should never reach under these capability seams to call raw tmux/file internals directly.

### Decision: Make `Create Agent` the primary product semantic
The Harness should treat `Create Agent` as the main child-execution primitive.

`Create Agent` means:
- create or select a child execution lane/session/runner;
- provide goal + constraints + handoff context;
- wait for the child to become ready;
- record the child relationship and execution evidence.

Tool-native `Fork` should remain an optional enhancement under the session runtime capability when a driver can prove true lineage semantics. It should not define the primary Harness model.

### Decision: Separate Harness controller from runner adapters
The Harness should have two distinct layers:

1. Harness controller
- plans the next step
- invokes approved capabilities
- coordinates retries/cancellation
- persists run timeline/state

2. Runner adapters
- know how to run Codex / future tool runners
- normalize tool-specific input/output/transcript/result semantics
- may consume host-managed capabilities, but are not the control plane themselves

This is the key lesson to borrow from `cclaw`: the scheduler/control plane and the execution runner should not be the same component.

### Decision: Reference runner is transitional only
The current `reference` runner is acceptable only as a checkpoint to prove:
- run lifecycle,
- capability registry contracts,
- timeline/progress persistence,
- `Create Agent` specialization wiring.

It must not become the long-term default execution path.

The production default should become an `agent-backed` runner as soon as the control-plane contracts are stable enough to support it.
Once that path lands:
- renderer/UI defaults should point to `agent_backed`;
- the existing reference runner should move to a clearly non-default location such as `testOnly/` or `legacy/`;
- no product semantics should depend on adding more logic to the reference runner.

### Decision: Adopt a provider-backed agent runner instead of embedding model logic in the controller
Agency does not currently have an in-process editor-side LLM runtime worth standardizing around.
The most practical first production path is:
- keep the Harness controller host-owned;
- add an `agent-backed` runner adapter;
- plug that runner into a small provider registry;
- use locally available agent runtimes as providers, starting with Codex.

For the first slice:
- `codex-cli` is the default provider path because the workstation already has a real `codex` binary with non-interactive interfaces (`exec --json`, `fork`, `resume`, `mcp-server`);
- `claude-cli` is a likely follow-on provider;
- provider transport must stay isolated behind one provider seam so Agency can later switch Codex transport from CLI-first to SDK-backed without rewriting the Harness controller.

### Decision: Runner skill packs become descriptors consumable by both JS and agent-backed paths
Skill packs should stop being thought of as “logic bags living only inside JS adapters”.

They should become stable descriptors with:
- id
- title
- allowed capabilities
- execution goal/prompt template
- expected decision/result schema
- optional provider hints

This lets the same skill-pack contract serve:
- the transitional JS path,
- the future agent-backed runner,
- later review/adjudication tools.

### Decision: Complex tool-native behaviors live in runner skill packs, not in the Harness core
Some behaviors are too stateful to express as one raw capability call but still should not turn into open-ended agent improvisation. Examples:
- inspect terminal runtime and confirm the source is still in the correct TUI;
- perform a tool-native fork command;
- wait for acknowledgement metadata;
- create the child lane/session;
- resume or reopen the child tool session.

For these cases, the Harness should support encapsulated runner skill packs:
- the Harness controller remains responsible for run state, authorization, timeline, and capability-call records;
- the runner adapter selects an approved skill pack;
- the skill pack can sequence multiple approved capabilities and runner-local logic;
- the skill pack never bypasses the capability registry to call raw tmux/file internals directly.

This keeps future agent runners honest: they can be given a bounded playbook/skill pack such as `session.tool-native-fork`, but the real side effects still flow through host-managed capabilities.

### Decision: Start with one structured run contract
The Harness should use one structured run contract across UI, IPC, CLI, and future internal callers.

Suggested shape:
- `runId`
- `goal`
- `constraints`
- `requestedCapabilities`
- `contextRefs`
- `status`
- `currentStep`
- `timeline[]`
- `artifacts[]`
- `warnings[]`
- `failures[]`
- `result`

This contract should be transport-neutral and JSON-friendly.

### Decision: Transport trust is host-derived, payload caller metadata is audit-only
The Harness must separate:
- transport-derived trust (`renderer_ipc`, `trusted_host_cli`, future provider lanes)
- payload caller metadata (`callerType`, `callerId`, `sourceSurface`, `traceId`)

The transport context decides:
- capability grants
- run visibility
- inspect/list/cancel/resume access

Payload caller metadata remains useful for:
- audit
- debugging
- timeline provenance

But it must never be a trust root.

### Decision: Renderer reconciliation needs a stable client request id
The run contract should carry both:
- `runId` as the Harness-owned persistent identity
- `clientRequestId` as the UI/request-owned correlation id

Why both are needed:
- `runId` is the source of truth after persistence
- `clientRequestId` closes the race where a run can finish before a renderer has registered its `runId`

This means:
- renderer-side pending state is keyed by `clientRequestId`
- progress events echo `clientRequestId`
- final UI reconciliation uses either `runId` or `clientRequestId`, not “whichever event happened to arrive in time”

### Decision: Keep first implementation intentionally narrow
v1 should prove the architecture, not solve every orchestration problem.

Recommended implementation scope from here:
- Harness run model and persistence
- Harness controller lifecycle (`start`, `inspect`, `cancel`, `resume`)
- capability registry for approved host-managed capabilities
- one agent-backed orchestration path using:
  - session runtime gateway
  - file intent gateway
- one provider registry with Codex as the first default provider
- one runner skill-pack registry for bounded specializations such as `session.tool-native-fork`
- Agent Cells `Fork` calling Harness `Create Agent` with a tool-native specialization instead of calling session runtime directly from renderer
- keep the existing reference runner only for tests/debugging until the agent-backed runner is stable

Deferred:
- richer planning strategies
- browser capability integration
- multi-agent negotiation loops
- automated policy learning / self-reflection

## Proposed Architecture

### 1) Harness Controller
- main-process service
- owns run state machine
- emits progress events
- stores step timeline

### 2) Capability Registry
- maps capability ids to host-managed capability implementations
- validates inputs and policy
- returns structured results only

### 3) Runner Adapter Layer
- `agentBackedRunnerAdapter`
- test-only `referenceRunnerAdapter`
- future `claudeRunnerAdapter`
- future `geminiRunnerAdapter`

### 3.5) Runner Skill Pack Layer
- `session.create-child`
- `session.tool-native-fork`
- future browser/auth/inspection playbooks

Skill packs are runner-facing playbooks, not a second capability plane. They orchestrate approved capabilities and may carry tool-specific heuristics, but they do not own persistence or authorization.

### 3.6) Provider Registry Layer
- `codexCliProvider`
- future `claudeCliProvider`
- future SDK-backed Codex provider

Provider responsibilities:
- run the chosen external agent runtime
- enforce provider-local argument/env policy
- stream structured events/results back into the Harness run
- never own product side effects directly

### Directory And Naming Plan
The Harness code should converge on this split:

```text
apps/editor/electron/services/mainAgentHarness/
  controller.js
  policy.js
  store.js
  settings.js
  capabilityRegistry.js
  dedupe.js
  eventBus.js
  runnerAdapters/
    agentBackedRunnerAdapter.js
  runnerProviders/
    index.js
    codexCliProvider.js
    claudeCliProvider.js
    shared/
      decisionSchema.js
      promptBuilder.js
      eventParser.js
      providerProcess.js
  skillPacks/
    index.js
    sessionCreateChild.js
    sessionToolNativeFork.js
  testOnly/
    referenceRunnerAdapter.js
```

Naming rules:
- `runnerAdapters/*Adapter.js` are Harness-facing execution lanes.
- `runnerProviders/*Provider.js` are concrete external-runtime bridges.
- `skillPacks/<name>.js` are stable descriptors/contracts, not ad-hoc host scripts.
- anything under `testOnly/` must never be the default renderer/UI runner.

### 4) Run Store / Timeline
- persistent run state
- resumable operations
- evidence-friendly timeline

### 5) Presentation / Transport
- IPC wrapper
- optional CLI wrapper
- future Harness UI panels

## Relationship to Existing Changes
- Depends on `add-session-runtime-orchestration-gateway`
  - the session runtime gateway becomes a first-class Harness capability
- Should align with `update-window-instance-strategy`
  - Harness run state must be window-safe and explicit about ownership

## Risks / Trade-offs
- Risk: The Harness becomes an opaque "smart box".
  - Mitigation: keep a strict step timeline and explicit capability call records.
- Risk: Capability boundaries remain leaky.
  - Mitigation: require Harness-visible capabilities to have stable contracts before use.
- Risk: Users misunderstand `Fork` vs `Create Agent`.
  - Mitigation: make `Create Agent` the default semantic in spec/UI docs and treat `Fork` as tool-native specialization.
- Risk: Runner adapters and Harness controller drift apart.
  - Mitigation: keep the adapter contract narrow and versioned.

## Migration Plan
1. Define the Harness run/state/timeline contract.
2. Define the capability registry contract.
3. Wire the Harness to existing host-managed gateways (`session runtime`, `file intent`).
4. Add Harness settings + provider registry.
5. Implement `agentBackedRunnerAdapter` with Codex as the first default provider.
6. Convert current skill packs into stable descriptors consumed by the agent-backed runner.
7. Route Agent Cells `Fork` through the new default `agent_backed` path.
8. Move the reference runner to a non-default test/debug path.
9. Add run inspection/cancel/resume surfaces.
10. Expand to more capabilities only after the first control plane is stable.

## Documentation Plan
Implementation should update:
- `docs/notes-session-management.md`
  - explain how the Harness depends on session runtime capability rather than raw tmux logic.
- `docs/notes-reusable-items-coding.md`
  - register the Harness controller, provider registry, and agent-backed runner modules if adopted.
- `apps/editor/README.md`
  - explain `Create Agent` as the main product semantic, position `Fork` as a specialized path, and document the default agent-backed runner/provider path.
- `apps/editor/docs/manual-test.md`
  - explain how Agent Cells `Fork` is now a Harness-driven `Create Agent` specialization via the default agent-backed runner, and how to inspect/cancel runs.
- optionally add `docs/architecture-main-agent-harness.md`
  - if the final implementation has enough independent architecture to warrant a dedicated doc.

## Reference Project Notes
Borrow from `cclaw`:
- host-managed capability lane
- scheduler/control plane separate from runner
- runner adapters with structured result objects
- explicit state/timeline for long-running runs
- skill/playbook boundaries that let complex flows stay reusable without promoting them into raw host internals
- Codex-backed execution as a real external agent runtime instead of a fake local “reference runner”

Do not blindly copy:
- container-heavy execution assumptions
- chat/channel-specific workflow semantics
- its exact runtime storage layout
