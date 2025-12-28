## ADDED Requirements
### Requirement: Session Detach vs Terminate
The editor SHALL distinguish between detaching a session and terminating a session.
Detaching MUST close the tab while keeping the tmux session running.
Terminating MUST kill the tmux session and mark the session as closed.
The tab close (X) action MUST perform Terminate by default and a context menu MUST expose Detach.

#### Scenario: Detach keeps tmux alive
- **WHEN** a user selects Detach on an active session
- **THEN** the tab closes and the tmux session remains available for reattach

#### Scenario: Terminate kills tmux
- **WHEN** a user clicks X on a session tab
- **THEN** the tmux session is killed and the session is marked closed

### Requirement: Rename Sessions
The editor SHALL allow users to rename sessions and persist the name in the session registry.

#### Scenario: Rename session
- **WHEN** a user renames a session
- **THEN** the new name is stored in the registry and displayed in the tab

### Requirement: Terminal Zoom Controls
The editor SHALL provide zoom in/out/reset controls for terminal sessions to adjust on-screen density.
Zoom adjustments MUST trigger a terminal resize to keep the PTY in sync.

#### Scenario: Zoom in
- **WHEN** a user zooms in on a terminal session
- **THEN** the terminal font size increases and the PTY is resized

#### Scenario: Zoom out
- **WHEN** a user zooms out on a terminal session
- **THEN** the terminal font size decreases and the PTY is resized

#### Scenario: Reset zoom
- **WHEN** a user resets terminal zoom
- **THEN** the terminal returns to the default font size

### Requirement: Terminal Idle Timer
The editor SHALL display how long the terminal view has been unchanged.
The timer MUST reset whenever terminal output or user input changes the view.

#### Scenario: Idle timer increments
- **WHEN** the terminal output is idle for a period
- **THEN** the idle timer increments to reflect elapsed time

#### Scenario: Idle timer resets on activity
- **WHEN** a user types or terminal output updates
- **THEN** the idle timer resets to zero
