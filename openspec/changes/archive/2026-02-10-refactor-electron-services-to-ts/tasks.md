## 1. Implementation
- [x] 1.1 Migrate service modules under `apps/editor/electron/services/` from `.js` to `.ts`.
- [x] 1.2 Migrate capture overlay Electron window modules under `apps/editor/electron/windows/captureOverlay/` from `.js` to `.ts`.
- [x] 1.3 Keep existing service logic and public API names unchanged.
- [x] 1.4 Ensure service exports/imports remain compatible with mixed JS/TS runtime consumers.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor build:electron`.
- [x] 2.2 Run `pnpm -C apps/editor typecheck`.
- [x] 2.3 Run `pnpm -C apps/editor build:renderer`.
- [x] 2.4 Run `openspec validate refactor-electron-services-to-ts --strict`.
