# Change: Refactor Remaining Editor JS Files to TypeScript

## Why
Core renderer and Electron runtime modules are already TypeScript-first, but a tail of JS-only scripts/config/tests still creates inconsistency in developer workflows and migration standards.

Moving the remaining migratable files to TS improves maintainability and keeps future refactors on one language baseline.

## What Changes
- Migrate remaining migratable files in `apps/editor` from JS to TS (scripts, supported configs, tests).
- Standardize script execution through TS-native runner commands.
- Remove source-level Electron JS bootstrap wrappers by launching compiled Electron entrypoints directly.
- Keep only required JS/CJS exceptions where ecosystem/runtime compatibility requires it.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/scripts/*`
  - `apps/editor/tests/e2e/*`
  - `apps/editor/electron/services/__tests__/*`
  - `apps/editor/vite.config.ts`, `apps/editor/playwright.config.ts`, `apps/editor/tailwind.config.ts`
  - `apps/editor/package.json`
- Risk:
  - Dev/test tooling regressions if script command wiring changes incorrectly.
- Mitigation:
  - Keep script semantics unchanged.
  - Validate with build/typecheck/e2e discovery and OpenSpec strict validation.
