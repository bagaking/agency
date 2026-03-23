## 1. Spec and Contract
- [x] 1.1 Update `agency-editor` spec for the Main Agent Harness, Harness run lifecycle, and `Create Agent` semantics.
- [x] 1.2 Define the Harness run contract (run id, goal, constraints, capability calls, timeline, result, failure model).

## 2. Capability Plane
- [x] 2.1 Define a host-managed capability registry contract for Harness-visible capabilities.
- [x] 2.2 Register the session runtime gateway and file intent gateway as the first Harness-capable host-managed capabilities.
- [x] 2.3 Define the policy/authorization seam for future Harness capability calls.

## 3. Harness Controller
- [x] 3.1 Implement a main-process Harness controller with `start`, `inspect`, `cancel`, and `resume` lifecycle operations.
- [x] 3.2 Persist Harness run state and step timeline in a resumable form.
- [x] 3.3 Emit structured progress events instead of relying on opaque logs only.

## 4. Runner Adapters and Create Agent
- [x] 4.1 Define a runner adapter interface for tool-specific execution backends.
- [x] 4.2 Implement one reference runner adapter shape using the current Codex-oriented stack.
- [x] 4.3 Define a bounded runner skill-pack registry for complex specializations such as `session.tool-native-fork`.
- [x] 4.4 Add `Create Agent` as the primary child-execution semantic, distinct from tool-native `Fork`.
- [x] 4.5 Keep tool-native `Fork` behind capability/driver support rather than making it the Harness default.
- [x] 4.6 Route Agent Cells `Fork` through Harness `Create Agent` specialization instead of calling session runtime directly from renderer.

## 5. Docs and Validation
- [x] 5.1 Update README/docs to describe Harness, host-managed capabilities, and `Create Agent` semantics.
- [x] 5.2 Add unit/integration coverage for Harness controller lifecycle and capability call recording.
- [x] 5.3 Add manual verification notes for starting, observing, and cancelling a Harness run.
