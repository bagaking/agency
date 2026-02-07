## ADDED Requirements

### Requirement: Shared Session Naming Rule Engine
The system SHALL maintain one canonical session naming rule parser/formatter reused by both Electron main process and renderer consumers.

#### Scenario: Renderer and main produce consistent session names
- **GIVEN** the same naming rule, sequence values, name lists, context, and timestamp
- **WHEN** main and renderer format a session name
- **THEN** they produce identical formatted output

#### Scenario: Shared naming defaults stay aligned
- **GIVEN** no user overrides for rule and name lists
- **WHEN** settings are normalized in main and renderer
- **THEN** both use the same default rule and default name lists

### Requirement: Shared Path Safety Utilities
The system SHALL use shared path utilities for relative path normalization and root-boundary-safe resolution in Electron services and preload fallbacks.

#### Scenario: Backslash and trailing separator normalization
- **GIVEN** a relative path containing Windows separators and trailing slashes
- **WHEN** the path is normalized
- **THEN** the result uses forward slashes and no trailing separators

#### Scenario: Root escape rejection
- **GIVEN** a root path and a target path that escapes the root
- **WHEN** safe path resolution is attempted
- **THEN** the operation fails with a path-escape error

### Requirement: Shared Scoped Settings State Lifecycle
The system SHALL provide a reusable renderer state lifecycle utility for scoped settings (global/project/agent) including IPC availability guard, dirty tracking, saving status, and error handling.

#### Scenario: Scope dirty tracking is consistent
- **GIVEN** a scoped settings editor using the shared lifecycle utility
- **WHEN** a scope is updated locally
- **THEN** only that scope is marked dirty until explicitly cleared

#### Scenario: IPC unavailability feedback is consistent
- **GIVEN** IPC bridge is unavailable
- **WHEN** a scoped settings editor attempts to load or save
- **THEN** a consistent IPC unavailable error is set and operation short-circuits
