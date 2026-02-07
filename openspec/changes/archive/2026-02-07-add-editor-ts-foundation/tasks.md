## 1. Implementation
- [x] 1.1 Add `apps/editor` TypeScript config files (base + root entrypoint for typecheck).
- [x] 1.2 Add `typecheck` script in `apps/editor/package.json`.
- [x] 1.3 Add required dev dependencies (`typescript`, baseline type packages) using pnpm.
- [x] 1.4 Add renderer ambient typings for `window.agency` and other runtime globals used by TS consumers.

## 2. Validation
- [x] 2.1 Run `pnpm -C apps/editor typecheck` successfully.
- [x] 2.2 Run `pnpm -C apps/editor build:renderer` successfully.
