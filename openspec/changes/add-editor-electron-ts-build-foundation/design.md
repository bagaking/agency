## Context
Electron currently starts from `electron/main.js` and `electron/preload.js` source files directly. Renderer TS migration is complete, but Electron has no equivalent TS build boundary.

## Goals
- Provide a dedicated Electron TS compile target that supports mixed JS/TS modules.
- Keep launch paths stable for existing scripts/tests while enabling TS entrypoints.
- Reduce entrypoint complexity with clearer module boundaries.

## Non-Goals
- Full Electron services migration to TS in this change.
- Strict-mode rollout (`strict: true`) across Electron modules.

## Decisions

### Decision: Use compiled runtime directory `.electron-build/`
- Compile Electron runtime TS entrypoints and required JS modules into `.electron-build/`.
- Keep `electron/main.js` and `electron/preload.js` as tiny runtime stubs that load compiled entries.

Rationale:
- Stable launch target path remains unchanged for scripts/tools (`electron/main.js`).
- Mixed JS/TS imports work during migration.

### Decision: Add dedicated Electron tsconfig
- Introduce `tsconfig.electron.json` with CommonJS emit and Node resolution.
- Keep renderer tsconfig and typecheck flow separate.

Rationale:
- Electron runtime constraints differ from renderer bundling constraints.

### Decision: Prebuild Electron in all runtime launch flows
- `dev:main`, `test:e2e`, and packaging scripts run Electron build first.

Rationale:
- Avoid missing-build runtime failures and keep behavior deterministic.

### Decision: Decompose entrypoint responsibilities
- Main process entry split into focused modules:
  - startup timeline lifecycle,
  - menu construction,
  - IPC setup orchestrator.
- Preload bridge uses helper factories for invoke/send/subscribe patterns.

Rationale:
- Lower cognitive load and easier incremental TS migration.

## Risks / Trade-offs
- Additional build step increases startup latency for dev/test.
  - Mitigation: build scope constrained to Electron entry/runtime.
- Build artifacts may drift if stale.
  - Mitigation: clean `.electron-build/` before compile.
