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

### Decision: Keep first implementation intentionally narrow
v1 should prove the architecture, not solve every orchestration problem.

Recommended v1 scope:
- Harness run model and persistence
- Harness controller lifecycle (`start`, `inspect`, `cancel`, `resume`)
- capability registry for approved host-managed capabilities
- one reference orchestration path using:
  - session runtime gateway
  - file intent gateway
- one reference runner adapter shape (Codex-oriented, but not Codex-only by contract)
- one runner skill-pack registry for bounded specializations such as `session.tool-native-fork`
- Agent Cells `Fork` calling Harness `Create Agent` with a tool-native specialization instead of calling session runtime directly from renderer

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
- `codexRunnerAdapter`
- future `claudeRunnerAdapter`
- future `geminiRunnerAdapter`

### 3.5) Runner Skill Pack Layer
- `session.create-child`
- `session.tool-native-fork`
- future browser/auth/inspection playbooks

Skill packs are runner-facing playbooks, not a second capability plane. They orchestrate approved capabilities and may carry tool-specific heuristics, but they do not own persistence or authorization.

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
4. Add one reference runner adapter shape and bounded runner skill-pack registry.
5. Route Agent Cells `Fork` through Harness `Create Agent` specialization.
6. Add run inspection/cancel/resume surfaces.
7. Expand to more capabilities only after the first control plane is stable.

## Documentation Plan
Implementation should update:
- `docs/notes-session-management.md`
  - explain how the Harness depends on session runtime capability rather than raw tmux logic.
- `docs/notes-reusable-items-coding.md`
  - register the Harness controller and capability registry if adopted.
- `apps/editor/README.md`
  - explain `Create Agent` as the main product semantic and position `Fork` as a specialized path.
- `apps/editor/docs/manual-test.md`
  - explain how Agent Cells `Fork` is now a Harness-driven `Create Agent` specialization and how to inspect/cancel runs.
- optionally add `docs/architecture-main-agent-harness.md`
  - if the final implementation has enough independent architecture to warrant a dedicated doc.

## Reference Project Notes
Borrow from `cclaw`:
- host-managed capability lane
- scheduler/control plane separate from runner
- runner adapters with structured result objects
- explicit state/timeline for long-running runs
- skill/playbook boundaries that let complex flows stay reusable without promoting them into raw host internals

Do not blindly copy:
- container-heavy execution assumptions
- chat/channel-specific workflow semantics
- its exact runtime storage layout
