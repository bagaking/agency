## 1. Spec And Design
- [x] 1.1 Add `agency-editor` requirements for a unified local control bus.
- [x] 1.2 Define the request/response envelope, object-reference model, trust model, and operation namespace.
- [x] 1.3 Align the change with the canonical object model and existing capability-owner seams.

## 2. Host Dispatcher
- [x] 2.1 Add one host-owned control-bus dispatcher/registry over existing capability owners.
- [x] 2.2 Define namespaced operations for the first slice:
  - window shell
  - file intent
  - session runtime
  - main agent harness
- [x] 2.3 Normalize result/error envelopes across routed operations.

## 3. Transports
- [x] 3.1 Add one unified CLI wrapper for the control bus.
- [x] 3.2 Add a local Unix domain socket transport for the same dispatcher on macOS-first builds.
- [x] 3.3 Keep transport-derived trust/access scope explicit and separate from caller-declared metadata.

## 4. Capability Routing
- [x] 4.1 Route file operations through File Intent without duplicating safety logic.
- [x] 4.2 Route session orchestration through Session Runtime without rebuilding ad hoc transport payloads.
- [x] 4.3 Route run control through Main Agent Harness without bypassing run ownership rules.
- [x] 4.4 Route window shell operations through Window Shell helpers with explicit window ownership targeting.

## 5. Validation And Docs
- [x] 5.1 Add unit coverage for dispatcher routing and normalized envelopes.
- [x] 5.2 Add transport tests for CLI and local socket request handling.
- [x] 5.3 Update README and design docs so the unified control bus becomes the canonical external automation surface.
- [x] 5.4 Document v1 non-goals explicitly: local-only, not a remote collaboration API, and not a renderer replacement.
