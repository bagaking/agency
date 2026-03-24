## ADDED Requirements

### Requirement: Single-Instance Multi-Window Strategy
The editor SHALL run as a single desktop application instance by default.
If a launch request occurs while an instance is already running, the system SHALL route that request to the existing instance instead of starting an isolated second app instance.
The existing instance SHALL create or focus a window to handle the request.

#### Scenario: Secondary launch without target project
- **WHEN** a user launches the app while it is already running and the launch request does not include a target repository
- **THEN** the existing app instance opens a new editor window
- **AND** that new window starts with no active project
- **AND** recent projects remain available in that window

#### Scenario: Secondary launch with target project
- **WHEN** a user launches the app while it is already running and the launch request includes a repository directory
- **THEN** the existing app instance opens or focuses a window for that request
- **AND** that window resolves and opens the requested project root

### Requirement: Relaunch Restores The Last Window Set
When the application relaunches without an explicit target repository, the editor SHALL restore the set of editor windows that were open during the previous app session.
Each restored window SHALL reuse its window-local project/workspace snapshot instead of inheriting another window's state.

#### Scenario: Restore multiple windows on relaunch
- **WHEN** a user quits the app with multiple editor windows open on different repositories
- **THEN** the next normal launch restores those windows
- **AND** each restored window keeps its own project root, selected Cell, sessions, and workbench state

#### Scenario: Explicit project launch bypasses passive restore
- **WHEN** the app launches with an explicit repository target
- **THEN** the editor opens the requested project window
- **AND** it does not automatically restore the previously saved multi-window set for that launch

### Requirement: Window Geometry Persistence
The editor SHALL persist per-window geometry, including window bounds and maximized/fullscreen state.
The editor SHALL restore persisted geometry on relaunch while keeping restored windows visible on the current display layout.

#### Scenario: Restore window size and position
- **WHEN** a user relaunches the app after moving and resizing a window
- **THEN** the restored window reopens with the same geometry

#### Scenario: Clamp stale off-screen geometry
- **WHEN** persisted geometry no longer fits the current display layout
- **THEN** the editor adjusts the restored window bounds so the window remains visible

## MODIFIED Requirements

### Requirement: Project Menu Actions
The editor SHALL expose menu actions for Open Project, Switch Project, and New Window.
Open/Switch Project SHALL prompt for a repository directory and update the active project root for the current window only.
New Window SHALL open a new editor window in the existing application instance.

#### Scenario: Switch project from menu
- **WHEN** a user selects Switch Project from the application menu
- **THEN** the editor prompts for a new repository and updates the active project context for that window only

#### Scenario: Open new window from menu
- **WHEN** a user selects New Window from the application menu
- **THEN** the existing application instance opens a new editor window
- **AND** that window starts without inheriting another window's active project

### Requirement: UI State Persistence
The editor SHALL persist app-global UI state separately from window/workspace-local state.
App-global state SHALL include values that are intentionally shared across windows, including the recent projects list and user-level defaults.
Window/workspace-local state SHALL include the active project root, selected Cell, active session, workbench tab state, window geometry, and window-specific layout/view state.
Persisting workspace state for one window SHALL NOT overwrite the workspace state of another window.

#### Scenario: Persist state in one window without overwriting another
- **WHEN** two windows are open on different projects and one window updates its selected Cell, active session, or workbench tabs
- **THEN** only that window's workspace-state snapshot is updated
- **AND** the other window's workspace-state snapshot remains intact

### Requirement: Window-Local Project Context
The editor SHALL treat the active project root as a window-local state.
Opening a new window SHALL start with no active project, while recent projects remain available.
Switching projects in one window SHALL NOT change the project context of other windows.
If a new-window request carries an explicit project path, only the target window SHALL open that project.

#### Scenario: Open new window
- **WHEN** a user opens a new window
- **THEN** the new window shows the project empty state and recent projects list

#### Scenario: Switch project in one window
- **WHEN** a user switches the project in one window
- **THEN** only that window refreshes its Agent Cells and Explorer scopes

#### Scenario: Open explicit project in routed window
- **WHEN** the running application instance receives a new-window request with a target repository path
- **THEN** the target window opens that repository
- **AND** existing windows keep their current project contexts

### Requirement: Custom Window Title Bar
On the desktop editor shell, the editor SHALL hide the default title bar in favor of an app-owned title bar.
The app-owned title bar SHALL display the current project name for the active window.
The app-owned title bar SHALL provide an app-icon-triggered window switcher that can focus another open window or create a new one.

#### Scenario: Show active project identity in title bar
- **WHEN** a window has an active project root
- **THEN** the custom title bar shows that project's display name

#### Scenario: Show empty-state identity in title bar
- **WHEN** a window has no active project root
- **THEN** the custom title bar shows an empty-project label

#### Scenario: Switch windows from the title bar icon
- **WHEN** a user opens the title-bar app menu and selects another open window
- **THEN** the editor focuses that window
- **AND** the selected window keeps its own project/workspace context

#### Scenario: Create a new window from the title bar icon
- **WHEN** a user opens the title-bar app menu and chooses New Window
- **THEN** the existing application instance opens a new editor window
- **AND** that window starts without inheriting another window's active project
