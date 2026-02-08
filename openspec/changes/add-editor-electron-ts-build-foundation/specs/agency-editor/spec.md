## ADDED Requirements

### Requirement: Electron TypeScript Build Foundation
The editor SHALL provide an Electron runtime TypeScript build foundation that compiles TS entrypoints into runnable JS artifacts for development, testing, and packaging flows.

#### Scenario: Electron runtime build command exists
- **WHEN** a developer runs `pnpm -C apps/editor build:electron`
- **THEN** Electron runtime artifacts are emitted to the configured build output
- **AND** entry launch paths resolve compiled runtime modules.

#### Scenario: Dev and package flows enforce Electron prebuild
- **WHEN** developers run dev/e2e/package scripts
- **THEN** Electron runtime build step executes before launching Electron main process.

### Requirement: Electron Entrypoint Structural Decomposition
The editor SHALL keep Electron entrypoint behavior stable while decomposing entrypoint responsibilities into focused modules to reduce complexity and improve maintainability.

#### Scenario: Main process responsibilities are modularized
- **WHEN** startup timeline, menu setup, and IPC setup logic are maintained
- **THEN** they are defined in focused modules instead of one monolithic entry implementation.

#### Scenario: Preload bridge binding uses reusable patterns
- **WHEN** new IPC bridge methods are added in preload
- **THEN** invoke/send/subscribe bindings reuse shared helper patterns rather than repeated ad-hoc wrappers.
