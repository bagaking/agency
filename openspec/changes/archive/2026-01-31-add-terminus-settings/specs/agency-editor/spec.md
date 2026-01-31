## ADDED Requirements
### Requirement: Terminus Settings Configuration
The editor SHALL load Terminus settings from Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
Terminus settings SHALL be stored in new files (`terminus-settings.json` for Global, `.agency/terminus-settings.yaml` for Project, and `.agency/terminus-settings-<worktreeName>.yaml` for Agent).
Terminus shortcuts SHALL be configured per Terminus profile and only apply to the active profile.
No backward compatibility with legacy shortcut behavior is required.

#### Scenario: Resolve scoped settings
- **WHEN** a user defines a Terminus profile shortcut binding in Project scope that shares an id with a Global binding
- **THEN** the Project binding is used for the active profile in that Cell

#### Scenario: Agent overrides project
- **WHEN** an Agent scope binding shares the same id as a Project binding
- **THEN** the Agent binding is used for that Agent's active profile

### Requirement: Baseline Terminal Profile
The editor SHALL include a baseline plain-shell profile in Terminus settings.
The baseline profile MUST be visible in the Terminus configuration view and MUST NOT be deletable.

#### Scenario: Baseline profile is present
- **WHEN** a user opens the Terminus configuration view
- **THEN** the plain-shell profile is listed and cannot be removed

### Requirement: Shortcut Interception Defaults
The editor SHALL NOT intercept keyboard shortcuts unless explicitly configured in Terminus settings for the active profile.
Default Terminus settings MUST provide zero shortcut bindings.

#### Scenario: No configured bindings
- **WHEN** a user presses Shift+Enter in the terminal and no Terminus bindings are configured for the active profile
- **THEN** the terminal receives the native Shift+Enter behavior without interception

### Requirement: Shortcut Input Dispatch
The editor SHALL route configured Terminus shortcut bindings through a centralized terminal input dispatcher that sends explicit input actions (e.g., text or key sequences) to the active session.

#### Scenario: Dispatch a configured shortcut
- **WHEN** a user triggers a configured shortcut binding
- **THEN** the dispatcher sends the defined input action to the active session

### Requirement: App Shortcuts Configuration
The editor SHALL provide App Shortcuts configuration at Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
App Shortcuts SHALL be stored in new files (`app-shortcuts.json` for Global, `.agency/app-shortcuts.yaml` for Project, and `.agency/app-shortcuts-<worktreeName>.yaml` for Agent).
App Shortcuts SHALL be defined as a fixed action list that users configure (no add/remove).

#### Scenario: Configure an app shortcut
- **WHEN** a user opens App Shortcuts in Hierarchy
- **THEN** the editor displays the full action list with per-action configuration

#### Scenario: Resolve app shortcut overrides
- **WHEN** a Project app shortcut entry shares an id with a Global entry
- **THEN** the Project entry is used for the active Cell

### Requirement: App Shortcuts UI Layout
The editor SHALL render App Shortcuts as a VSCode-style layout with an action list on the left and the selected action's configuration on the right.
The editor SHALL NOT require users to add actions manually.

#### Scenario: Select an action
- **WHEN** a user selects an action in the list
- **THEN** the corresponding configuration renders in the right panel
