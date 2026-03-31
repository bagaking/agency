## 1. Spec And Docs
- [x] 1.1 Add an OpenSpec delta that defines bounded attention ownership by surface.
- [x] 1.2 Update session-management and product docs to describe Session Map `Ops` as the queue surface and Agent Cells as inline-only.
- [x] 1.3 Update reusable-item catalogs so attention components and interaction rules reflect the new hierarchy.

## 2. Implementation
- [x] 2.1 Remove the queue-style attention card from Agent Cells.
- [x] 2.2 Preserve clickable inline attention affordances on Cell and Session rows.
- [x] 2.3 Keep Session Map `Priority Queue`, Status Bar `Next`, and window-switcher attention behavior unchanged.
- [x] 2.4 Move the Agent Cells `Session Reply Relay` launcher onto the shared right-edge rail while keeping the relay surface session-bound and semantically distinct from `Attention` / `Commander`.

## 3. Verification
- [x] 3.1 Add or update unit coverage for Agent Cells attention rendering.
- [x] 3.2 Run targeted tests for attention rendering and interaction wiring.
- [x] 3.3 Add destination-aware `Next` tooltip coverage and update manual verification wording, including the evidence-path destination branch.
- [x] 3.4 Add reply-launcher coverage proving the shared rail can toggle `Session Reply Relay` without reintroducing a second right-edge launcher.
