# Change: Add Electron TypeScript Build Foundation

## Why
Renderer is fully migrated to TypeScript, but Electron runtime still depends on JavaScript-only entry files. This creates an architectural split: TS quality gates stop at renderer, while main/preload runtime code cannot be migrated safely in small steps.

We need a migration-safe Electron TS build base that keeps existing runtime behavior stable, supports mixed JS/TS modules, and improves entrypoint structure complexity.

## What Changes
- Add a dedicated Electron TS build pipeline (`tsconfig.electron.json` + build script).
- Migrate Electron entrypoints (`main`, `preload`) to TS source while keeping runtime-compatible JS launch stubs.
- Compile Electron runtime artifacts into `.electron-build/` for dev/test/package execution.
- Introduce clearer entry architecture:
  - bootstrapped compiled-entry loaders,
  - focused main-process setup modules (startup timeline, menu, IPC registration),
  - preload IPC bridge helpers to reduce repetitive bindings.
- Update npm scripts so dev/e2e/package flows always build Electron runtime before launch.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/main.js`, `apps/editor/electron/preload.js`
  - `apps/editor/electron/main.ts`, `apps/editor/electron/preload.ts`
  - `apps/editor/electron/main/*`, `apps/editor/electron/preload/*`
  - `apps/editor/scripts/dev-main.js`, `apps/editor/scripts/run-e2e.js`, `apps/editor/scripts/build-electron.js`
  - `apps/editor/package.json`, `apps/editor/tsconfig.electron.json`
- Risk:
  - Runtime bootstrap mismatch in packaged app if build outputs are missing.
  - Path regressions due compiled output location.
- Mitigation:
  - JS entry stubs enforce compiled-entry existence with explicit error.
  - Script-level prebuild and validation in dev/e2e/package paths.
