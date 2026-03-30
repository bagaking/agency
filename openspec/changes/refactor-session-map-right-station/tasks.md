## 1. Spec And Docs
- [x] 1.1 Add a scoped OpenSpec delta for one Session Map right station with `Ops` and `Briefing` modes.
- [x] 1.2 Update canonical docs and verification text to remove the old separate commander-column model.

## 2. Implementation
- [x] 2.1 Refactor docked Session Map layout so the right side is one station column.
- [x] 2.2 Keep `Ops` as default mode and switch the same station to `Briefing` when commander opens.
- [x] 2.3 Preserve current priority queue, evidence, and commander capabilities without reusing HIL drawer semantics.

## 3. Verification
- [x] 3.1 Add or update tests for station mode switching and integrated commander affordance.
- [x] 3.2 Run targeted Session Map tests and renderer typecheck.
