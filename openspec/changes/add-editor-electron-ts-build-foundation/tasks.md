## 1. Implementation
- [x] 1.1 Add `tsconfig.electron.json` and Electron build script (`build:electron`).
- [x] 1.2 Migrate Electron entrypoints to TS source (`main.ts`, `preload.ts`) with runtime-compatible JS stubs.
- [x] 1.3 Refactor main entry architecture into focused modules (startup timeline / menu / IPC setup).
- [x] 1.4 Refactor preload IPC bridge with reusable invoke/send/subscribe helpers.
- [x] 1.5 Update dev/e2e/package scripts to prebuild Electron runtime.
- [x] 1.6 Ensure helper/runtime path assumptions remain valid under `.electron-build`.
- [x] 1.7 Update reusable-items coding catalog for the new Electron TS runtime mechanism.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor build:electron`.
- [x] 2.2 Run `pnpm -C apps/editor typecheck`.
- [x] 2.3 Run `pnpm -C apps/editor build:renderer`.
- [x] 2.4 Run equivalent launch wiring smoke (`ELECTRON_RENDERER_URL=http://localhost:5183 pnpm -C apps/editor exec playwright test --list`).
- [x] 2.5 Run `openspec validate add-editor-electron-ts-build-foundation --strict`.
