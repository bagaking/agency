## ADDED Requirements
### Requirement: Terminus Settings Configuration
The editor SHALL load Terminus settings from Global, Project, and Agent scopes and resolve overrides in Global -> Project -> Agent order.
Terminus settings SHALL be stored in new files (`terminus-settings.json` for Global, `.agency/terminus-settings.yaml` for Project, and `.agency/terminus-settings-<worktreeName>.yaml` for Agent).
No backward compatibility with legacy shortcut behavior is required.

#### Scenario: Resolve scoped settings
- **WHEN** a user defines a shortcut binding in Project scope that shares an id with a Global binding
- **THEN** the Project binding is used for the active Cell

#### Scenario: Agent overrides project
- **WHEN** an Agent scope binding shares the same id as a Project binding
- **THEN** the Agent binding is used for that Agent

### Requirement: Baseline Terminal Profile
The editor SHALL include a baseline plain-shell profile in Terminus settings.
The baseline profile MUST be visible in the Terminus configuration view and MUST NOT be deletable.

#### Scenario: Baseline profile is present
- **WHEN** a user opens the Terminus configuration view
- **THEN** the plain-shell profile is listed and cannot be removed

### Requirement: Shortcut Interception Defaults
The editor SHALL NOT intercept keyboard shortcuts unless explicitly configured in Terminus settings.
Default Terminus settings MUST provide zero shortcut bindings.

#### Scenario: No configured bindings
- **WHEN** a user presses Shift+Enter in the terminal and no Terminus bindings are configured
- **THEN** the terminal receives the native Shift+Enter behavior without interception

### Requirement: Shortcut Input Dispatch
The editor SHALL route configured shortcut bindings through a centralized terminal input dispatcher that sends explicit input actions (e.g., text or key sequences) to the active session.

#### Scenario: Dispatch a configured shortcut
- **WHEN** a user triggers a configured shortcut binding
- **THEN** the dispatcher sends the defined input action to the active session
