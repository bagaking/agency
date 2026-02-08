## ADDED Requirements

### Requirement: Typed Electron Service Layer
The editor SHALL compile Electron service modules from TypeScript source to improve maintainability of main-process runtime logic.

#### Scenario: Electron services compile through TS pipeline
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** service modules under `apps/editor/electron/services` compile successfully from TypeScript source.

### Requirement: Electron Service Behavior Parity During TS Migration
The editor SHALL preserve existing Electron service runtime semantics while migrating service files to TypeScript.

#### Scenario: Existing IPC service integrations remain compatible
- **WHEN** IPC handlers call existing service functions after migration
- **THEN** the runtime behavior remains compatible with the pre-migration implementation.
