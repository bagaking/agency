## 1. Contract & Architecture
- [x] 1.1 Finalize mode-aware IPC/service contract for `continueOnMobile` (`direct | hub`) with explicit response schema.
- [x] 1.2 Add tmux metadata write/read contract for Agency sessions and define fallback behavior for legacy sessions.
- [x] 1.3 Define Hub launcher artifact layout (catalog file + launcher script) and lifecycle (create/refresh/attach).

## 2. Backend Implementation
- [x] 2.1 Refactor `mobileSessionContinuation` into shared SSH readiness resolver + mode-specific command builders.
- [x] 2.2 Implement Hub command builder that creates/attaches deterministic hub tmux session per repo root.
- [x] 2.3 Implement Hub catalog generation grouped by Project -> Cell -> Session using tmux metadata as primary source.
- [x] 2.4 Add session lifecycle hooks to persist/update tmux metadata on create/restore/list refresh.
- [x] 2.5 Optimize terminal runtime write path with frame-level batching to improve xterm refresh smoothness under high output.

## 3. Renderer UX
- [x] 3.1 Update session context menu to expose both Direct and Hub continuation actions with clear labels.
- [x] 3.2 Update mobile continuation feedback modal/notification to show mode-specific diagnostics.
- [x] 3.3 Keep existing direct-flow affordance and copy-to-clipboard semantics unchanged.

## 4. Validation & Docs
- [x] 4.1 Add/extend unit tests for mode-aware command generation, hub bootstrap command, metadata fallback, and stale-session cases.
- [x] 4.2 Add renderer tests for Direct/Hub warning/success feedback and wiring.
- [x] 4.3 Update `docs/notes-session-management.md` and `docs/notes-reusable-items-coding.md` for the Hub mechanism.
- [x] 4.4 Run `openspec validate add-mobile-session-hub --strict`, typecheck, and targeted tests before merge.
