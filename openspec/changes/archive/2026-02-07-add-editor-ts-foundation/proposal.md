# Change: Add Editor TypeScript Foundation

## Why
The editor now has reusable shared modules, but there is still no project-level TypeScript foundation (tsconfig layout, typecheck script, and ambient runtime typings). Without this baseline, TS migration work is fragmented and difficult to validate in CI/local workflows.

## What Changes
- Add TypeScript project configuration for `apps/editor` (base + workspace tsconfig entrypoint).
- Add a `typecheck` script to run `tsc --noEmit` consistently.
- Add ambient typings for renderer runtime globals (e.g. `window.agency`) and core module declarations.
- Keep runtime behavior unchanged; this change only establishes the typed foundation.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/package.json`
  - `apps/editor/tsconfig*.json`
  - `apps/editor/renderer/src/types/*.d.ts`
- Risk: Low (tooling-only, no runtime behavior change).
