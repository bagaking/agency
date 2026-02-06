## MODIFIED Requirements
### Requirement: Session Tabs
The editor SHALL render sessions as nested list items under their parent Cell in the Agent Cells sidebar and highlight the active session.

#### Scenario: Switch session via session list
- **WHEN** a user clicks a session entry under a Cell
- **THEN** the editor activates that session and selects the parent Cell

### Requirement: Closed Sessions Overflow
The editor SHALL display detached and closed sessions in an overflow menu associated with the Cell's session list rather than the main session list.

#### Scenario: View closed sessions
- **WHEN** a user opens the sessions overflow menu on a Cell
- **THEN** the editor lists detached/closed sessions and allows selecting/restoring them

## ADDED Requirements
### Requirement: Session List Order Preservation
The editor SHALL preserve the session ordering as stored in the cell/session registry and not apply additional sorting in the Agent Cells list.

#### Scenario: Keep registry order
- **WHEN** multiple sessions are listed under a Cell
- **THEN** the ordering matches the registry without active/idle reordering

### Requirement: Session Idle Indicators in List
The editor SHALL display each session's idle duration directly in the session list item.

#### Scenario: Idle visible per session
- **WHEN** the session list is shown
- **THEN** each session entry shows its idle time (or a placeholder if unknown)

### Requirement: Activity Ring Fades with Idle
The editor SHALL render the avatar ring as green when active and gradually fade it toward the inactive color as idle time increases, reaching the most inactive color at 15 minutes.

#### Scenario: Ring reflects idle progression
- **WHEN** a session has been idle for increasing durations
- **THEN** the avatar ring color interpolates from active green toward the inactive color

### Requirement: Unified Avatar Badge
The editor SHALL render agent/session avatars through a shared badge component to keep idle rings and closed-state styling consistent across views.

#### Scenario: Consistent avatar styling
- **WHEN** avatars are rendered in the sidebar, editor header, session map, explorer footer, or picker
- **THEN** they use the same badge component and ring logic

### Requirement: Per-Cell Session Creation Entry
The editor SHALL provide a new session action on each Cell entry in the Agent Cells view.

#### Scenario: Create session from Cell node
- **WHEN** a user opens the new-session menu on a Cell
- **THEN** the editor creates a session for that Cell (blank or profile)

### Requirement: Collapsible Session Lists
The editor SHALL allow each Cell's session list to be collapsed or expanded.

#### Scenario: Collapse sessions under a Cell
- **WHEN** a user toggles the collapse control on a Cell
- **THEN** the session list for that Cell is hidden or revealed

### Requirement: Pre-Attach Terminal Preview
The editor SHALL show cached session preview data and a connecting indicator before tmux attach completes, and disable terminal input until attach succeeds.

#### Scenario: Preview before attach
- **WHEN** a session is selected and tmux attach is still in progress
- **THEN** the terminal view shows the last cached preview with a connecting indicator
- **AND THEN** terminal input is disabled until attach succeeds

### Requirement: Detached Session Activity Polling
The editor SHALL periodically refresh detached sessions so idle indicators can reflect new output activity.

#### Scenario: Detached session receives new output
- **WHEN** a session is detached and new output arrives in tmux
- **THEN** the session idle time updates after the next refresh interval

### Requirement: Idle Updates Require Output Diff
The editor SHALL only update session activity timestamps when captured output differs from the previously cached content.

#### Scenario: Refresh without output changes
- **WHEN** the session list refreshes without any output diff
- **THEN** the session idle time does not reset
