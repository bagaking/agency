## ADDED Requirements

### Requirement: Activity Bar Home Shortcut
The editor SHALL treat the activity bar logo as a home shortcut that opens the Agent Cells view.

#### Scenario: Click home icon
- **WHEN** a user clicks the activity bar logo
- **THEN** the editor switches to the Agent Cells view

### Requirement: Settings Dashboard Overview
The editor SHALL provide a Settings dashboard that summarizes the current project context and offers navigation entry cards to Actions, Gates, and Softlinks.
The dashboard SHALL include the current project summary and the recent projects list.

#### Scenario: View settings dashboard
- **WHEN** a user opens the Settings view
- **THEN** the editor shows project summary, recent projects, and configuration entry cards

### Requirement: Explorer Clipboard Operations
The Explorer SHALL support copy, cut, and paste operations for files and folders.
The editor SHALL expose these operations via context menu and keyboard shortcuts.

#### Scenario: Copy and paste a file
- **WHEN** a user copies a file and pastes into another folder
- **THEN** the editor creates a duplicate at the target location

#### Scenario: Cut and paste a folder
- **WHEN** a user cuts a folder and pastes into another folder
- **THEN** the editor moves the folder to the new location

### Requirement: Window-Local Project Context
The editor SHALL treat the active project root as a window-local state.
Opening a new window SHALL start with no active project, while recent projects remain available.
Switching projects in one window SHALL NOT change the project context of other windows.

#### Scenario: Open new window
- **WHEN** a user opens a new window
- **THEN** the new window shows the project empty state and recent projects list

#### Scenario: Switch project in one window
- **WHEN** a user switches the project in one window
- **THEN** only that window refreshes its Agent Cells and Explorer scopes
