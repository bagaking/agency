## 1. Spec and Contract
- [x] 1.1 Update `agency-editor` spec for the Main Agent Harness, Harness run lifecycle, and `Create Agent` semantics.
- [x] 1.2 Define the Harness run contract (run id, goal, constraints, capability calls, timeline, result, failure model).

## 2. Capability Plane
- [x] 2.1 Define a host-managed capability registry contract for Harness-visible capabilities.
- [x] 2.2 Register the session runtime gateway and file intent gateway as the first Harness-capable host-managed capabilities.
- [x] 2.3 Define the policy/authorization seam for future Harness capability calls.
- [x] 2.4 Separate transport-derived trust (`renderer_ipc`, `trusted_host_cli`, future provider lanes) from payload-declared caller metadata, and document the rule.

## 3. Harness Controller
- [x] 3.1 Implement a main-process Harness controller with `start`, `inspect`, `cancel`, and `resume` lifecycle operations.
- [x] 3.2 Persist Harness run state and step timeline in a resumable form.
- [x] 3.3 Emit structured progress events instead of relying on opaque logs only.
- [x] 3.4 Extract host-side dedupe keys and run ownership bookkeeping into explicit controller modules that can survive provider replacement.

## 4. Runner Adapters and Create Agent
- [x] 4.1 Define a runner adapter interface for tool-specific execution backends.
- [x] 4.2 Implement one transitional reference runner adapter shape using the current Codex-oriented stack.
- [x] 4.3 Add a Harness settings/provider registry layer with stable names (`runnerProviders/`, `settings.js`) and Codex as the first default provider path.
- [x] 4.4 Implement `agentBackedRunnerAdapter` and provider-shared decision/progress parsing modules.
- [x] 4.5 Implement `codexCliProvider` as the first production default provider, aligned with cclaw-style Codex usage but without adopting its container runtime.
- [x] 4.6 Convert the current runner skill packs into stable descriptors consumable by the agent-backed runner.
- [x] 4.7 Add `Create Agent` as the primary child-execution semantic, distinct from tool-native `Fork`.
- [x] 4.8 Keep tool-native `Fork` behind capability/driver support rather than making it the Harness default.
- [x] 4.9 Route Agent Cells `Fork` through the new default `agent_backed` runner instead of the transitional reference runner.
- [x] 4.10 Move the reference runner to a clearly non-default `testOnly/` or equivalent path and keep it only for tests/debugging.

## 5. Docs and Validation
- [x] 5.1 Update README/docs to describe Harness, host-managed capabilities, and `Create Agent` semantics.
- [x] 5.2 Add unit/integration coverage for Harness controller lifecycle and capability call recording.
- [x] 5.3 Add manual verification notes for starting, observing, and cancelling a Harness run.
- [x] 5.4 Document the default agent-backed runner/provider path, settings location, and directory split once the new path lands.
