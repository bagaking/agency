## Context
The project now has a TypeScript baseline for renderer and Electron runtime, but command tooling and configuration are split across JS and TS. This creates unnecessary context switches and uneven code standards.

## Goals
- Convert migratable JS files in `apps/editor` to TS/TSX.
- Keep runtime behavior, script semantics, and test behavior unchanged.
- Reduce remaining JS files to compatibility-only exceptions.

## Non-Goals
- Rewriting shared CJS interoperability module (`shared/sessionNamingCore.cjs`) in this phase.
- Replacing compatibility JS files that are required by third-party runtime hooks.

## Decisions

### Decision: TS runner for script execution
- Use `tsx` for TS script entrypoints in package commands.

Rationale:
- Keeps migration incremental without adding extra build step for dev scripts.

### Decision: compiled Electron entrypoint launch
- Remove source JS wrapper indirection (`electron/main.js` + `electron/preload.js`) and launch compiled `.electron-build/main.js` directly in dev/test/package workflows.

Rationale:
- Eliminates wrapper JS files while preserving the same runtime implementation source (`main.ts`/`preload.ts`).

### Decision: explicit compatibility exceptions
- Keep JS/CJS only where external tooling/runtime still expects non-TS files (for this phase):
  - `scripts/after-pack.js`
  - `scripts/cli_stub.js`
  - `postcss.config.js`
  - `shared/sessionNamingCore.cjs`

Rationale:
- Avoid brittle runtime hooks and keep migration risk low.

## Risks / Trade-offs
- Some tooling may implicitly assume `.js` paths.
  - Mitigation: update script/config references and run build/typecheck/e2e checks.
- `tsx` becomes a tooling dependency.
  - Mitigation: pin in `devDependencies` and validate all script entrypoints.
