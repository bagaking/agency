## 1. Implementation
- [x] 1.1 Extract session runtime helper utilities from `useSessions` into dedicated modules and wire existing hook to them.
- [x] 1.2 Extract reusable voice-capture utility logic from `useVoiceCapture` into dedicated modules and keep behavior unchanged.
- [x] 1.3 Split `AppLayout` large view orchestration into composable subcomponents with stable props.
- [x] 1.4 Keep integration entrypoints stable in `App.jsx` call sites.
- [x] 1.5 Update reusable-items coding catalog with newly extracted high-leverage reusable modules.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor build:renderer` successfully.
- [x] 2.2 Verify no functional regression in compile-time wiring for Agent Cells / Hierarchy / Action Sheets views.
