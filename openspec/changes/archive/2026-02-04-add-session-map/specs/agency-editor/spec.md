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

### Requirement: Session Attach Lifecycle Management
The editor SHALL centralize session attach/detach behavior in a session-level manager that supports preview, capture, and terminal interactions without breaking idle tracking.

#### Scenario: Lazy attach for preview
- **WHEN** a session preview is requested and the session is not attached
- **THEN** the system attaches the session long enough to capture a preview and may detach after the capture completes

#### Scenario: Idle-based attach GC
- **WHEN** a session has been idle beyond the configured threshold and has no active interactive client
- **THEN** the system detaches its attach client to reclaim resources
- **AND WHEN** an interaction occurs (preview/click/terminal focus)
- **THEN** the session is reattached immediately

#### Scenario: Attach does not reset idle
- **WHEN** the system attaches or detaches a session for preview or capture
- **THEN** the idle timer is not reset by that attach activity

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

### Requirement: Session Lifecycle Activity Tracking
The editor SHALL keep session activity/idle time tracking running regardless of view switches or panel visibility.

#### Scenario: Idle tracking across views
- **WHEN** the user switches views or closes panels (including Session Map or Explorer)
- **THEN** session idle time continues to update based on terminal I/O activity

#### Scenario: Idle vs visited semantics
- **WHEN** the session output stream changes
- **THEN** idle time resets based on output updates (input-only events do not reset idle)
- **AND WHEN** the user explicitly switches to a session
- **THEN** the UI MAY show a separate `visited` timestamp to avoid ambiguity
- **AND WHEN** an attach happens for preview or capture
- **THEN** the system ignores attach noise within a one-minute grace window

### Requirement: Preview Cache and Snapshot Storage
The editor SHALL cache the most recent session previews and persist snapshots under `.agency/` for fast hover rendering.

#### Scenario: Preview cache on hover
- **WHEN** a user hovers a session
- **THEN** the UI shows the latest cached preview immediately and refreshes it asynchronously

#### Scenario: Snapshot storage
- **WHEN** a session snapshot is captured
- **THEN** the snapshot is written under `.agency/` and can be reused on the next app launch

### Requirement: Session Avatar Customization
The editor SHALL allow users to customize session avatars using the bundled open-agent-avatars catalog.

#### Scenario: Change session avatar
- **WHEN** a user selects a new avatar from the session map or session tabs
- **THEN** the session avatar is updated and reflected across the UI

### Requirement: Hover Preview Action Bar
The editor SHALL provide a non-click-through info bar under the hover preview with rename and avatar actions.

#### Scenario: Rename from hover preview
- **WHEN** a user edits the session name in the hover info bar
- **THEN** the session name updates without triggering a jump

### Requirement: Map Session Creation
The editor SHALL allow creating sessions from within a Cell group in the session map, including Terminus profiles.

#### Scenario: Create session from map
- **WHEN** a user chooses a profile from the map cell menu
- **THEN** a new session is created for that Cell using the selected profile
