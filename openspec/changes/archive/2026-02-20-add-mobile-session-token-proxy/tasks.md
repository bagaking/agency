## 1. Contract & Spec
- [x] 1.1 Add `proxy` mode requirement deltas and update action-variant requirement in `agency-editor` spec.
- [x] 1.2 Validate change schema with `openspec validate add-mobile-session-token-proxy --strict`.

## 2. Backend Implementation
- [x] 2.1 Add `mobileSessionProxy` service (server lifecycle, token registry, handshake, tmux bridging).
- [x] 2.2 Extend `mobileSessionContinuation` to support `proxy` mode and return mode-aware diagnostics.
- [x] 2.3 Wire session lifecycle cleanup so proxy tokens are revoked when sessions end/recreate.
- [x] 2.4 Add/extend backend tests for proxy command payload and token lifecycle behavior.

## 3. Renderer UX
- [x] 3.1 Add Session menu entry for `Continue on Mobile (Proxy)`.
- [x] 3.2 Extend continuation feedback copy for proxy success/warning/error states.
- [x] 3.3 Add renderer tests for proxy feedback paths.

## 4. Docs & Verification
- [x] 4.1 Update `docs/notes-session-management.md` with proxy token workflow and constraints.
- [x] 4.2 Update `docs/notes-reusable-items-coding.md` reusable mechanism entries.
- [x] 4.3 Run targeted tests + typecheck and record completion by checking all tasks.
