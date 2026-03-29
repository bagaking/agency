## 1. Spec and Contract
- [x] 1.1 Update `agency-editor` spec for smart fork orchestration, session runtime gateway behavior, and CLI/tool-compatible contracts.
- [x] 1.2 Define the gateway request/result/progress contract, including caller metadata and structured failure codes.

## 2. Main-Process Atomic Capabilities
- [x] 2.1 Extract a bounded session inspection primitive from existing tmux/session helpers (`inspectSessionPane` or equivalent).
- [x] 2.2 Extract a dedicated foreground-process resolver for terminal panes (`resolveTerminalForegroundProcess` or equivalent) so the host can identify the actual active process even when stored profile metadata is stale or generic.
- [x] 2.3 Extract a dedicated terminal runtime detector (`detectTerminalRuntime` or equivalent) that combines pane/process evidence into higher-level judgments such as tool kind, TUI mode, busy/idle, and fork readiness.
- [x] 2.4 Promote programmatic session input delivery into one canonical host primitive (`dispatchSessionInput`-style contract) and stop duplicating ad hoc launch logic.
- [x] 2.5 Add reusable wait-condition helpers for output pattern, quiet window, and ready-state checks.
- [x] 2.6 Add a host-owned child-session creation/launch helper so higher-level orchestration does not rebuild topology + launch steps in renderer code.

## 3. Smart Fork v1
- [x] 3.1 Extend Terminus profile settings with optional fork orchestration config (`driver`, `launchTemplate`, timeouts).
- [x] 3.2 Implement the `codex` smart fork driver:
  - source readiness checks;
  - `/fork` dispatch;
  - fork acknowledgement parsing + metadata extraction;
  - child session creation;
  - launch template rendering;
  - child ready wait.
- [x] 3.3 Update the `codex` smart fork driver to use terminal runtime detection instead of relying on stored `profileId` plus `pane_current_command` only.
- [x] 3.4 Wire Agent Cells `Fork` action to the new gateway-backed path and preserve clear fallback/error behavior.

## 4. Thin Adapters and Future Harness Seam
- [x] 4.1 Add IPC handlers + renderer bridge wrappers for session runtime intents without pushing orchestration logic back into renderer.
- [x] 4.2 Add a thin JSON-in / JSON-out CLI wrapper for the session runtime gateway, mirroring the file-intent wrapper style.
- [x] 4.3 Reserve operation/progress metadata needed for future Main-as-Agent Harness callers without implementing the harness itself.

## 5. Docs and Validation
- [x] 5.1 Update `apps/editor/README.md` and `apps/editor/docs/manual-test.md` to explain smart fork behavior and verification.
- [x] 5.2 Update `docs/notes-session-management.md` and, if warranted, add `docs/notes-session-runtime-gateway.md` for the host runtime/orchestration model.
- [x] 5.3 Update `docs/notes-reusable-items-coding.md` to record the adopted gateway and reusable primitives.
- [x] 5.4 Add unit/integration coverage for gateway primitives, Codex parsing fixtures, and smart fork success/failure cases.
