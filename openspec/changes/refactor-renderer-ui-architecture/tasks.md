## 1. Implementation
- [x] 1.1 Add typed renderer contracts for layout handoff and screen/view-model composition.
- [x] 1.2 Introduce shared in-app prompt/confirmation helpers and migrate browser-native dialog call sites in Explorer, Workbench, and Action Sheets.
- [x] 1.3 Add renderer service wrappers for capture/overlay preload access and remove direct view-layer `window` usage where applicable.
- [x] 1.4 Extract `App.tsx` screen orchestration into clearer screen/controller modules while preserving current routing and state ownership.
- [x] 1.5 Split oversized renderer hooks/components by responsibility, starting with Sessions, Explorer, and Workbench.
- [x] 1.6 Replace high-leverage `any` seams in the refactored paths with explicit types and self-describing names.

## 2. Validation
- [x] 2.1 `pnpm -C apps/editor run typecheck:renderer`
- [x] 2.2 `pnpm -C apps/editor run typecheck:electron`
- [x] 2.3 Add or update renderer tests for extracted layout/view-model contracts.
- [x] 2.4 Verify core UI flows still work: Agent Cells shell, Explorer file actions, Workbench save/save-as, HIL sidecar routing, Session Reply compose.
- [x] 2.5 Verify prompt/confirmation interactions stay app-native and keyboard-accessible.
