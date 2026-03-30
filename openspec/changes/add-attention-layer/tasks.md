## 1. Spec
- [x] 1.1 Add `agency-editor` delta requirements for canonical attention ownership, state kinds, surfacing, and jump behavior.

## 2. Shared Model
- [x] 2.1 Add shared attention types and minimal window-shell summary contract.
- [x] 2.2 Build renderer attention-model helpers for local/window attention ordering and summaries.
- [x] 2.3 Track enough harness source refs to support deterministic run jump targets.

## 3. UI Integration
- [x] 3.1 Surface primary/global attention in shell chrome and window switching.
- [x] 3.2 Surface local attention queue and emphasis in Agent Cells.
- [x] 3.3 Surface local attention queue and emphasis in Session Map / Ops.
- [x] 3.4 Ensure attention items can jump to the owning object.

## 4. Verification
- [x] 4.1 Add regression tests for attention ordering, unread detection, return-required detection, and window summary normalization.
- [x] 4.2 Update docs/manual verification to prove failed runs, pending sessions, and running child execution remain visible.
