## 1. Shared Reusable Modules
- [x] 1.1 Add shared path safety helpers (`normalizeRelPath`, `resolveSafePath`) for Electron services/preload.
- [x] 1.2 Add shared session naming core module and use it in both main and renderer naming flows.
- [x] 1.3 Add shared scoped settings state hook for Global/Project/Agent settings UX.

## 2. Low-Risk Refactors
- [x] 2.1 Refactor settings hooks (`useTerminusSettings`, `useSessionNamingSettings`, `useAppShortcuts`, `useQuickActions`) to reuse scoped settings state.
- [x] 2.2 Refactor Electron services/preload to reuse path safety helpers.
- [x] 2.3 Route gates hook calls through `agencyBridge` wrappers.

## 3. Validation and Documentation
- [x] 3.1 Verify renderer build succeeds after refactor.
- [x] 3.2 Run syntax checks for modified Electron-side files.
- [x] 3.3 Update reusable coding catalog with the new shared modules.

## 4. Follow-up (Next Iterations)
- [ ] 4.1 Refactor high-leverage hooks (`useSessions`, `useVoiceCapture`) into smaller composable modules.
- [ ] 4.2 Execute staged TypeScript migration (foundation → high-leverage modules → UI layers).
