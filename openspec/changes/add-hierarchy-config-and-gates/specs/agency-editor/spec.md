## ADDED Requirements
### Requirement: Hierarchy Configuration Navigation
The editor SHALL provide a Hierarchy entry in the activity bar for configuration of Actions, Gates, and Softlinks.
The Hierarchy view SHALL present navigation for Actions, Gates, and Softlinks.

#### Scenario: Open hierarchy configuration
- **WHEN** a user selects the Hierarchy item in the activity bar
- **THEN** the editor shows Actions, Gates, and Softlinks navigation entries

### Requirement: Agent Cells Explorer Shortcuts
The editor SHALL label the Explorer view as "Agent Cells" and focus it on Cell management.
The Agent Cells view SHALL provide jump links to Actions, Gates, and Softlinks configuration.

#### Scenario: Jump from Agent Cells
- **WHEN** a user selects a jump link in Agent Cells
- **THEN** the editor navigates to the corresponding Hierarchy view

### Requirement: Gate Configuration Scopes
The editor SHALL support gate definitions in Global, Project, and Agent scopes.
The editor SHALL resolve gate definitions by id using Global -> Project -> Agent overrides.
Gate definitions SHALL be grouped by lifecycle stage (draft, active, archived).
Gate definitions SHALL execute line-by-line shell commands.
Gate definitions SHALL be stored as:
- Global: the editor user data directory as `gates.json`
- Project: `.agency/gates.yaml` at the repository root
- Agent: `.agency/gates-<worktree-name>.yaml` in the worktree root

#### Scenario: Override gate definition
- **WHEN** a project gate shares an id with a global gate
- **THEN** the project definition is used for evaluation

### Requirement: Softlinks Configuration View
The editor SHALL provide a Softlinks configuration entry under Hierarchy for worktree link settings.

#### Scenario: Open softlinks view
- **WHEN** a user selects Softlinks in Hierarchy
- **THEN** the editor shows the worktree link configuration view

## RENAMED Requirements
- FROM: `### Requirement: Actions Configuration Scopes in Explorer`
- TO: `### Requirement: Actions Configuration Scopes in Hierarchy`

## MODIFIED Requirements
### Requirement: Dedicated Quick Actions View
The editor SHALL provide a dedicated navigation entry for quick action configuration within Hierarchy.

#### Scenario: Open quick actions view
- **WHEN** a user selects Actions in Hierarchy
- **THEN** the editor shows the configuration view for quick actions

### Requirement: Actions Configuration Scopes in Hierarchy
The editor SHALL expose Global, Project, and Agent action configuration entries in Hierarchy.
Project and Agent entries SHALL require a selected Cell.

#### Scenario: Open global actions
- **WHEN** a user selects Global Actions in Hierarchy
- **THEN** the editor shows the global actions configuration view

#### Scenario: Project actions without a Cell
- **WHEN** a user selects Project Actions without an active Cell
- **THEN** the editor disables editing and prompts the user to select a Cell

### Requirement: Lifecycle Gates and Confirmation
The editor SHALL require a confirmation step for lifecycle transitions.
The confirmation MUST show gate results for the target state and MUST block the transition when any required gate fails.
The editor SHALL resolve gate definitions for the target state using Global -> Project -> Agent overrides.
The editor SHALL execute gate commands line-by-line and treat any non-zero exit status as a gate failure.
The editor SHALL seed default gates that cover spec created, checklist completed, and no unresolved merge conflicts.

#### Scenario: Transition allowed
- **WHEN** a user transitions a Cell to Active or Archived and all required gates pass
- **THEN** the editor allows the transition after explicit confirmation

#### Scenario: Transition blocked
- **WHEN** a user transitions a Cell to Active or Archived and any required gate fails
- **THEN** the editor blocks the transition and surfaces the failing gate(s)
