# Change: Add agency-data package and promote-system foundation

## Why
Current delivery-related logic is spread across renderer flow code and Electron services. Even though `.agency` is already the storage-of-truth, domain logic is not packaged as a reusable core. This makes cross-surface unification (Promote, Explorer send, future Reply) expensive and inconsistent.

## What Changes
- Add a root-level package `pkg/agency-data` with TypeScript source and independent build output.
- Add `promote-system` as a subpath export of the same package.
- Move Agency data-domain logic into package-level repositories and use-cases:
  - HIL repository (`.agency/hil/*`)
  - Action Sheet repository (`.agency/action-sheets/*`)
  - Delivery audit log repository (`.agency/delivery/events-<worktree>.jsonl`)
- Define a host adapter contract so main process can inject session-dispatch capability while keeping facades thin.
- Keep existing file layout and metadata backward compatible.
- Keep Electron as the execution host and UI as integration layer; renderer does not access package storage directly.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/electron/services/hil.ts`
  - `apps/editor/electron/services/actionSheets.ts`
  - `apps/editor/electron/ipc/handlers/*`
  - `apps/editor/electron/preload.ts`
  - `apps/editor/renderer/src/services/agencyBridge.ts`
  - `pkg/agency-data/**` (new)
  - root workspace files (new)
- Behavioral impact:
  - Domain behavior is centralized behind package APIs.
  - Main-process service files become thin facades.
- Risk:
  - Package extraction may regress edge-case compatibility in legacy `.agency` data.
- Mitigation:
  - Keep compatibility-first schema policy and add regression tests with real fixture files.
