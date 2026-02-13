## 1. Implementation
- [x] 1.1 Migrate all files in `apps/editor/electron/ipc/handlers/` from `.js` to `.ts`.
- [x] 1.2 Keep existing IPC channel names and runtime logic unchanged.
- [x] 1.3 Refine `apps/editor/electron/main/ipcSetup.ts` registration structure for lower repetition and clearer grouping.
- [x] 1.4 Ensure imports/exports remain compatible with mixed JS service modules.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor build:electron`.
- [x] 2.2 Run `pnpm -C apps/editor typecheck`.
- [x] 2.3 Run `pnpm -C apps/editor build:renderer`.
- [x] 2.4 Run `openspec validate refactor-electron-ipc-handlers-to-ts --strict`.
