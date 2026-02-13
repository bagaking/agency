# Change: Refactor Electron Services to TypeScript

## Why
After migrating Electron runtime entrypoints and IPC handlers to TypeScript, the Electron service layer remains the largest JS-only surface in main-process runtime. That layer carries most IO/session/process logic and is high-touch for feature work.

Migrating services to TS improves maintainability and prepares stricter typing in later phases, while keeping current runtime behavior stable.

## What Changes
- Migrate Electron service modules under `apps/editor/electron/services/` from `.js` to `.ts`.
- Migrate capture overlay window modules under `apps/editor/electron/windows/captureOverlay/` from `.js` to `.ts`.
- Preserve existing runtime behavior, channel semantics, and service APIs.
- Keep compatibility with mixed TS/JS consumers during incremental migration.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/**/*.ts`
  - `apps/editor/electron/windows/captureOverlay/*.ts`
- Risk:
  - Behavior regressions if exports drift or runtime initialization order changes.
- Mitigation:
  - Preserve service function logic and public names.
  - Validate with Electron build + typecheck + renderer build + OpenSpec validation.
