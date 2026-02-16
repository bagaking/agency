## ADDED Requirements

### Requirement: Agency Data Package Boundary
The editor runtime SHALL host Agency data-domain logic in a root package `pkg/agency-data`.
The package SHALL be the canonical place for HIL, Action Sheet, and delivery-audit domain operations.

#### Scenario: Main process uses package domain APIs
- **WHEN** Electron services perform HIL or Action Sheet domain operations
- **THEN** they call `pkg/agency-data` APIs
- **AND** service files remain thin facades over package logic

### Requirement: Promote System Subpath Export
The package SHALL expose a `promote-system` subpath for delivery orchestration and status transitions.

#### Scenario: Promote system is imported as subpath
- **WHEN** main-process delivery handlers initialize
- **THEN** they can import `@agency/agency-data/promote-system`
- **AND** invoke start/confirm/status/timeline use cases through this entry

### Requirement: Host Adapter-Based Session Dispatch
Delivery orchestration SHALL depend on a host adapter contract for session dispatch and focus operations.
The package SHALL NOT directly control renderer/UI transport.

#### Scenario: Host provides dispatch adapter
- **WHEN** a delivery run is started
- **THEN** package orchestration calls host adapter methods for dispatch/focus
- **AND** transport details remain host-specific

### Requirement: Delivery Audit Event Persistence
The editor SHALL persist delivery audit events under `.agency/delivery/` in an append-only format.
Events SHALL include source, mode, status transition, timestamps, and entity references.

#### Scenario: Delivery run emits timeline events
- **WHEN** a quick or gated delivery transitions state
- **THEN** an event record is appended to the worktree audit log
- **AND** timeline queries can filter by source and mode

### Requirement: Backward-Compatible Agency Storage
The package SHALL keep backward-compatible behavior for existing `.agency/hil/*` and `.agency/action-sheets/*` files.

#### Scenario: Legacy files are read by package repositories
- **WHEN** a project already contains legacy HIL or Action Sheet data
- **THEN** package repositories read and update them without requiring schema migration
- **AND** previously stored fields remain available to existing views
