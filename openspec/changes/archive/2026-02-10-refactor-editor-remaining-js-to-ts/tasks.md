## 1. Implementation
- [x] 1.1 Migrate JS script entrypoints under `apps/editor/scripts/` (except compatibility exceptions) to `.ts`.
- [x] 1.2 Migrate supported config files (`vite`, `playwright`, `tailwind`) and tests to TypeScript.
- [x] 1.3 Update `apps/editor/package.json` scripts and references to execute TS entrypoints consistently.
- [x] 1.4 Remove Electron source JS bootstrap wrappers by using compiled entrypoint paths directly in dev/test/package flows.
- [x] 1.5 Document remaining JS/CJS compatibility exceptions and rationale.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor build:electron`.
- [x] 2.2 Run `pnpm -C apps/editor typecheck`.
- [x] 2.3 Run `pnpm -C apps/editor build:renderer`.
- [x] 2.4 Run `pnpm -C apps/editor exec playwright test --list`.
- [x] 2.5 Run `openspec validate refactor-editor-remaining-js-to-ts --strict`.
