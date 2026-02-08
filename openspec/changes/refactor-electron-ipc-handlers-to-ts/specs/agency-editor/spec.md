## ADDED Requirements

### Requirement: Typed Electron IPC Handler Layer
The editor SHALL compile the Electron IPC handler layer from TypeScript source to improve maintainability of renderer-main process contracts.

#### Scenario: IPC handlers compile through Electron TS build
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** all IPC handler modules under `electron/ipc/handlers` compile successfully from TypeScript source.

### Requirement: IPC Contract Behavior Parity During Handler TS Migration
The editor SHALL preserve existing IPC channel names and runtime semantics while migrating handlers to TypeScript.

#### Scenario: Existing renderer IPC calls remain valid
- **WHEN** renderer invokes existing IPC channels
- **THEN** handlers respond with behavior compatible with the pre-migration implementation.
