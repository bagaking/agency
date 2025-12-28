## ADDED Requirements
### Requirement: Runtime Log Capture
The editor SHALL create a runtime log file for each app start under `logs/runtime` at the repository root.
The log filename MUST include a timestamp identifier.
The editor SHALL keep the most recent 20 runtime log runs in `logs/runtime` and move older runs to `logs/runtime/history`.
The editor SHALL chunk a runtime log file when it exceeds the size limit to ensure writes continue.

#### Scenario: Startup log created
- **WHEN** the editor starts
- **THEN** a new runtime log file is created under `logs/runtime` with a timestamp in the name

#### Scenario: Rotate old runs
- **WHEN** more than 20 runtime log runs exist
- **THEN** older runs are moved to `logs/runtime/history`

#### Scenario: Chunked log file
- **WHEN** a runtime log file exceeds the size limit
- **THEN** the editor continues logging into a new chunk file for the same run

### Requirement: Terminal Diagnostics Logging
The editor SHALL log terminal start and resize errors to the runtime log.

#### Scenario: Terminal start fails
- **WHEN** a terminal session fails to start
- **THEN** the runtime log includes the error and session context

### Requirement: Terminal Resize Guardrails
The editor SHALL guard terminal resize events to avoid invalid or overly frequent resizes.
The main process MUST clamp resize requests that fall below a minimum cols/rows threshold.
The renderer MUST ignore resize requests when the container dimensions are zero or unchanged.
The editor MUST log ignored or clamped resize events for diagnostics.

#### Scenario: Invalid resize ignored
- **WHEN** the renderer computes a resize with cols < 20 or rows < 5
- **THEN** the resize is ignored and logged

#### Scenario: Backend clamp
- **WHEN** the main process receives a resize with cols < 2 or rows < 2
- **THEN** it skips the resize and logs the clamp event

#### Scenario: Resize storm suppressed
- **WHEN** the terminal is emitting dense output
- **THEN** resize events are deferred to avoid redraw storms

### Requirement: Stable Initial Sizing
The editor SHALL re-run a terminal fit/resize after fonts load and after terminal start completes.

#### Scenario: Fonts ready resize
- **WHEN** document fonts finish loading
- **THEN** the editor triggers a terminal resize to stabilize columns and rows

#### Scenario: Post-start resize
- **WHEN** a terminal session reports ready
- **THEN** the editor forces a resize to sync the PTY size
