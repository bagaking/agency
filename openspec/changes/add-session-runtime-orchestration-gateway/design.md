## Context
Agency already has partial building blocks for host-owned session automation:
- tmux pane capture and key dispatch live in Electron services;
- programmatic session input dispatch already exists as a reusable primitive;
- child session creation and topology persistence are already owned by main-process services;
- file intent work proved that Agency can keep one host-owned contract and add thin IPC/CLI/tool wrappers on top.

What is missing is the orchestration seam between those pieces.

Today, `Fork` only creates a child session with `nodeKind=fork` and preserves the parent profile when available. That is intentionally minimal, but it leaves tool-specific fork workflows outside the product model.

For Codex, a useful fork flow is closer to:
1. inspect the source session and confirm it is still inside the Codex TUI and not actively working;
2. submit `/fork` inside the source TUI;
3. wait for a concrete fork acknowledgement and extract metadata such as `thread_id`;
4. create a child `fork` session;
5. render a launch template such as `codex --thread {thread_id}` for the child;
6. wait for the child TUI to be ready before reporting success.

That flow is too stateful and too tool-specific to live in renderer code, but it is also too deterministic to require a free-form agent. The right abstraction is a host-owned orchestration gateway with tool drivers.

## Goals / Non-Goals
- Goals:
  - ship a deterministic smart fork workflow for Codex;
  - create a reusable main-process session runtime gateway instead of a Fork-only special case;
  - identify and extract the highest-ROI atomic session capabilities already present in the codebase;
  - keep request/response contracts JSON-friendly so IPC, CLI, tools, and future harness callers can share one host path;
  - leave a clean seam for a future Main-as-Agent harness without requiring that harness to script tmux itself.
- Non-Goals:
  - do not implement a general autonomous main-process agent in this change;
  - do not build a user-programmable fork DSL for arbitrary tools in v1;
  - do not convert every existing session operation into a public gateway on day one;
  - do not replace current session creation / terminal attach behavior outside the new gateway-backed flows.

## Decisions

### Decision: Introduce a host-owned Session Runtime Gateway
The main process should own a new orchestration gateway for session runtime intents.

The gateway boundary should be coarse and JSON-friendly. Callers ask for intents; they do not compose tmux calls themselves.

Recommended external intents for the first slice:
- `inspect`
- `dispatch_input`
- `wait_condition`
- `create_child`
- `smart_fork`

Result shape should follow the same broad pattern Agency already uses for file intents:
- `success`
- `warnings`
- `failures`
- `data`
- optional progress/event payloads

Caller metadata should be preserved for future audit/policy decisions:
- `sourceSurface`
- `callerType`
- `callerId`
- `traceId`

### Decision: Extract high-ROI atomic capabilities before layering drivers
This change should not jump straight to Codex heuristics. First it should promote the most reusable session operations into bounded host primitives.

The highest-value atomicization targets are:
1. `inspectSessionPane`
   - wraps pane id resolution, pane metadata, recent output capture, and basic activity timestamps.
2. `resolveTerminalForegroundProcess`
   - resolves the actual foreground process for a pane from tmux metadata, tty/process-group inspection, and process-tree fallbacks.
3. `detectTerminalRuntime`
   - turns raw pane/process evidence into a higher-level runtime judgment such as `tool=codex`, `mode=tui`, `busy=true|false`, `readyForFork=true|false`.
4. `dispatchSessionInput`
   - already exists in spirit; it should become the canonical host primitive for text + confirm-key delivery.
5. `waitForSessionCondition`
   - reusable wait loop for pattern match, quiet window, command match, or driver-specific readiness predicates.
6. `createChildSession`
   - wraps topology-aware child creation without duplicating renderer logic.
7. `launchChildSession`
   - reusable “send launch input to child session and wait for ready” helper.

These are the most cost-effective conversions because they already exist as partial mechanisms in:
- `tmux.ts`
- `terminal.ts`
- `sessions.ts`
- renderer session command orchestration

They also unlock more than just smart fork. The same runtime blocks can later power structured resume flows, source-driven launch flows, and non-UI session automation.

### Decision: Split terminal runtime sensing into three host modules
The product should not collapse “what process is actually active in this terminal right now?” into one smart-fork-specific heuristic.

This change should define three reusable host layers:
1. `pane inspection`
   - tmux-facing facts only:
     - `pane_id`
     - `pane_pid`
     - `pane_tty`
     - `pane_current_command`
     - `pane_current_path`
     - `pane_in_mode`
     - `alternate_on`
     - recent captured output
     - last activity timestamp
2. `foreground process resolution`
   - answers “what process is actually in the foreground?” using:
     - tmux `pane_current_command` as a hint,
     - tty foreground process-group inspection,
     - process-tree inspection from `pane_pid`,
     - snapshot hints when process metadata is insufficient.
3. `terminal runtime detection`
   - answers “what tool/runtime is this session effectively running?” using:
     - process evidence,
     - pane state,
     - snapshot features,
     - tool-specific detectors (Codex first).

This split matters because:
- a session may be stored as `profileId=shell` while the actual foreground program is `codex`;
- multiple future features need the same sensing layer, not just smart fork;
- a future Main-as-Agent Harness should consume a stable runtime-detection result, not reimplement tmux/process heuristics.

### Decision: Keep tool-specific logic in drivers, not in renderer or raw config
The gateway should use driver adapters for tool-specific logic.

Driver responsibilities:
- source precondition checks;
- source command sequence;
- acknowledgement parsing;
- extraction of template values;
- child ready-state detection;
- structured failure reasons.

The renderer should not know these details. It should only request `smart_fork`.

Profile config should stay declarative and small. For example:

```yaml
profiles:
  - id: codex
    label: codex
    startCommand: codex
    fork:
      enabled: true
      driver: codex
      launchTemplate: "codex --thread {thread_id}"
      sourceIdleMs: 1500
      forkAckTimeoutMs: 15000
      childReadyTimeoutMs: 20000
```

### Decision: Codex is the first smart fork driver
The first driver should be `codex`.

The Codex workflow should be implemented as a host state machine:
1. inspect source pane:
   - confirm the effective terminal runtime still looks like Codex, even if the stored session profile is not `codex`;
   - confirm the source is not still actively working;
   - capture any needed source context.
2. dispatch `/fork` in the source pane.
3. wait for an acknowledgement pattern and extract `thread_id`.
4. create a `fork` child session under the source session.
5. render the launch template with extracted values.
6. dispatch child launch input.
7. wait for child ready-state.

The driver should fail fast with explicit codes when:
- source is not in Codex;
- source is still working/busy;
- fork acknowledgement times out;
- required fork metadata is missing;
- child ready-state times out.

The driver should not rely on `session.profileId` alone to decide whether a source session is effectively Codex.
It should consume `detectTerminalRuntime` and only fall back to profile metadata as a hint.

### Decision: Future Main-as-Agent Harness should call the gateway, not bypass it
This change should explicitly reserve a future where main hosts a “negotiator” or harness agent.

That future harness should:
- decide *whether* to fork or coordinate a workflow;
- call the same session runtime gateway intents used by UI/CLI callers;
- observe structured progress/error events;
- never script tmux directly as its primary integration path.

This keeps the harness replaceable and testable. The deterministic boundary stays in host services; the agent only supplies policy and planning.

### Decision: Adapters stay thin
Like file intents, the session runtime gateway should be wrapped by thin adapters:
- renderer IPC handlers;
- renderer service wrapper;
- CLI wrapper;
- future tool/harness wrapper.

The wrapper should add transport, not semantics.

## Risks / Trade-offs
- Risk: Codex TUI parsing is less stable than a formal API.
  - Mitigation: keep driver parsing fixture-driven and encode failure modes explicitly instead of hiding them behind retries.
- Risk: exposing too many low-level primitives publicly would freeze the wrong contract.
  - Mitigation: keep the stable public boundary at intent level; internal helpers stay private until they prove reusable.
- Risk: wait logic can become a pile of sleeps and string checks.
  - Mitigation: add reusable wait-condition helpers with explicit predicates, deadlines, and observed output snapshots.
- Risk: future harness work could overfit to Codex.
  - Mitigation: put Codex-specific rules only in the driver and keep the gateway/tool contract tool-agnostic.

## Migration Plan
1. Define the session runtime gateway contract and failure/progress shape.
2. Extract/normalize host primitives for pane inspection, foreground process resolution, runtime detection, dispatch, wait, and child creation.
3. Add Codex smart fork driver + Terminus profile fork settings.
4. Wire Agent Cells `Fork` to the new gateway path.
5. Add thin IPC + CLI wrappers.
6. Update docs and reusable-item catalog entries.

## Documentation Plan
This change should not rely on code comments alone.

Required documentation updates when implemented:
- `apps/editor/README.md`
  - explain the difference between plain typed child creation and smart fork orchestration;
  - document profile-scoped fork settings at a high level.
- `apps/editor/docs/manual-test.md`
  - add Codex smart fork verification, timeout/failure cases, and child-ready checks.
- `docs/notes-session-management.md`
  - describe the new host-owned session runtime/orchestration layer and its relationship to attach/preview/session lifecycle.
- `docs/notes-reusable-items-coding.md`
  - catalog the new gateway and promoted atomic primitives once they are real.
- optionally add a dedicated `docs/notes-session-runtime-gateway.md`
  - if the implementation grows beyond what `notes-session-management.md` can explain cleanly.

## Future Evolution Guardrails
To keep the Main-as-Agent Harness path open, the first implementation should reserve:
- stable operation ids for long-running orchestrations;
- structured step/progress events;
- caller metadata on every tool/CLI invocation;
- policy hooks for future capability gating;
- JSON-only request/response envelopes that can be forwarded across process boundaries unchanged.

Those reservations are cheap now and expensive later.
