## ADDED Requirements

### Requirement: Global Session Map Overlay
The editor SHALL provide a global map overlay that is available across all main screens and is anchored to the status bar.

#### Scenario: Open map from any screen
- **WHEN** a user clicks the map entry in the status bar
- **THEN** the map overlay is shown without leaving the current screen

### Requirement: Cell and Session Map Representation
The editor SHALL render Cells as faction clusters and Sessions as role tokens, including offline states for archived/closed/stale sessions.

#### Scenario: Offline session visibility
- **WHEN** a session is archived, closed, or stale
- **THEN** the map displays it as an offline state distinct from active sessions

### Requirement: Session Navigation from Map
The editor SHALL allow users to jump to a session by clicking its token in the map, without leaving the current screen.

#### Scenario: Jump to session
- **WHEN** a user clicks a session token
- **THEN** the editor selects the corresponding Cell and session while keeping the current view

### Requirement: Session Hover Preview
The editor SHALL show a live terminal preview on hover and allow jumping from the preview.

#### Scenario: Hover preview jump
- **WHEN** a user clicks the terminal preview shown on hover
- **THEN** the editor selects the corresponding Cell and session

### Requirement: Map Auto-Open
The editor SHALL auto-open the map on first entry per project.

#### Scenario: First entry
- **WHEN** a user opens the editor for a project for the first time
- **THEN** the map overlay is shown by default

### Requirement: Faction Color Defaults and Overrides
The editor SHALL derive default faction colors from Cell type and creation order, and allow configuration overrides.

#### Scenario: Color override
- **WHEN** a project defines faction color overrides
- **THEN** the map uses the configured colors instead of defaults

### Requirement: Map Summary Stats
The editor SHALL show summary counts for cells and sessions, including online/offline totals.

#### Scenario: Large map overview
- **WHEN** the map overlay is open
- **THEN** the summary counts are visible without scrolling
