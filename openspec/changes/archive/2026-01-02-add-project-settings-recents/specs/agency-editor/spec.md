## ADDED Requirements

### Requirement: Project Settings View
The editor SHALL provide a Project settings view that includes an Open Project action to choose a repository directory.
The Open Project action SHALL update the active project root and refresh Cells/Explorer scopes.

#### Scenario: Open project from settings
- **WHEN** a user opens the Project settings view and clicks Open Project
- **THEN** the system prompts for a directory and sets it as the active project root

### Requirement: Recent Projects
The editor SHALL persist a recent projects list in local UI state.
Each recent project entry SHALL include repository name, absolute path, and last-opened timestamp.
The recent list SHALL update whenever a project is selected successfully.

#### Scenario: Recent project persists after relaunch
- **WHEN** a user opens a project and relaunches the editor
- **THEN** the recent projects list includes the last-opened project

### Requirement: Recent Projects Sidebar
When no project is open, the left sidebar SHALL display a Recent Projects section.
Selecting a recent project SHALL open it and set the active project root.

#### Scenario: Open recent project from sidebar
- **WHEN** a user selects a recent project from the sidebar list
- **THEN** the editor switches to that project and loads its Cells

### Requirement: Project Menu Actions
The editor SHALL expose menu actions for Open Project, Switch Project, and New Window.
Open/Switch Project SHALL prompt for a repository directory and update the active project root.
New Window SHALL open a new editor window.

#### Scenario: Switch project from menu
- **WHEN** a user selects Switch Project from the application menu
- **THEN** the editor prompts for a new repository and updates the active project context
