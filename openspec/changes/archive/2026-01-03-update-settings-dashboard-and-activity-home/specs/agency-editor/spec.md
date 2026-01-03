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
If a target name conflicts during copy, cut, or duplicate, the editor SHALL append a numeric `-1` suffix until a free name is found.

#### Scenario: Copy and paste a file
- **WHEN** a user copies a file and pastes into another folder
- **THEN** the editor creates a duplicate at the target location

#### Scenario: Cut and paste a folder
- **WHEN** a user cuts a folder and pastes into another folder
- **THEN** the editor moves the folder to the new location

#### Scenario: Duplicate with conflict
- **WHEN** a user duplicates a file and the target name already exists
- **THEN** the editor creates a copy with a `-1` style suffix

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

### Requirement: Explorer System Clipboard Import
The Explorer SHALL allow pasting files or screenshots from the system clipboard into the selected folder.
If a target name conflicts, the editor SHALL append a numeric `-1` suffix until a free name is found.

#### Scenario: Paste a file from system clipboard
- **WHEN** a user copies a file in another app and pastes in Explorer
- **THEN** the file is copied into the target folder with conflict-safe naming

#### Scenario: Paste a screenshot from system clipboard
- **WHEN** a user pastes an image from the system clipboard in Explorer
- **THEN** the editor creates a `Screenshot-YYYYMMDD-HHMMSS.png` file in the target folder

### Requirement: Terminal Clipboard Materialization
When pasting into the terminal, the editor SHALL materialize clipboard files or images into the active cell's `.agency/tmp` directory and paste the relative path.

#### Scenario: Paste file into terminal
- **WHEN** a user pastes a file into the terminal
- **THEN** the editor saves it under `.agency/tmp` and inserts the relative path into the terminal input

#### Scenario: Paste image into terminal
- **WHEN** a user pastes an image into the terminal
- **THEN** the editor saves it under `.agency/tmp` and inserts the relative path into the terminal input

### Requirement: Clipboard Markdown Capture
The editor SHALL allow capturing clipboard content into a temporary Markdown file stored under `.agency/tmp/clipboard`.
Captured Markdown files MUST use the `Clipboard-YYYYMMDD-HHMMSS.md` naming format and resolve conflicts with `-1` suffixes.

#### Scenario: Capture clipboard as Markdown
- **WHEN** a user invokes Paste as Markdown
- **THEN** the editor creates a Markdown file summarizing clipboard content under `.agency/tmp/clipboard`

### Requirement: Line Comment Submission
The editor SHALL allow submitting a comment against the current file and line with an optional TODO flag.
Comments MUST be stored in a worktree-scoped YAML file under `.agency/comments-<worktree>.yaml`.
The comment payload SHOULD capture structured metadata for future threading and status updates.

#### Scenario: Comment schema metadata
- **WHEN** a comment is stored
- **THEN** the comment includes a stable id, thread id, status, and creation metadata

#### Scenario: Submit a line comment
- **WHEN** a user submits a comment on a specific line
- **THEN** the editor appends the comment to the worktree comment file

#### Scenario: Multiple comments per line
- **WHEN** a user submits more than one comment on the same line
- **THEN** each comment is appended as a separate entry

### Requirement: Line Comment Entry Actions
The editor SHALL expose a direct action to add a comment at the current cursor line.
The action SHALL be available from the editor context menu and the comment preview panel.

#### Scenario: Add comment from context menu
- **WHEN** a user opens the editor context menu on a code file
- **THEN** they can select an action to add a comment on the current line

#### Scenario: Add comment from preview panel
- **WHEN** a user clicks Add in the comment preview panel
- **THEN** the editor opens the comment entry modal for the current cursor line

### Requirement: Comment Preview List
The editor SHALL show a preview list of line comments in the workbench header area.
The preview list SHALL summarize comments for the active file.

#### Scenario: View comment preview list
- **WHEN** a file has submitted line comments
- **THEN** the preview list shows each comment with its line number and TODO indicator
