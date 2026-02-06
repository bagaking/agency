## ADDED Requirements

### Requirement: Workflow-focused selection actions
The editor SHALL show an advanced floating selection action menu that prioritizes workflow actions.
The menu SHALL include Send-to-Session and Create Memo actions.
The floating menu SHALL NOT include a Copy action.

#### Scenario: Selection actions available
- **WHEN** a user selects terminal text
- **THEN** the floating menu offers Send-to-Session and Create Memo
- **AND** Copy is not shown in the menu

### Requirement: Create memo from selection
The editor SHALL allow creating a memo from selected terminal text.

#### Scenario: Create memo
- **WHEN** a user selects terminal text and chooses Create Memo
- **THEN** a memo is created with the selected text

### Requirement: Idle based on output change threshold
The editor SHALL update a session's idle activity timestamp only when output changes exceed a character threshold.

#### Scenario: Ignore tiny changes
- **WHEN** a session output changes by fewer characters than the threshold
- **THEN** the session idle timestamp is not refreshed

#### Scenario: Record meaningful changes
- **WHEN** a session output changes by more characters than the threshold
- **THEN** the session idle timestamp is refreshed
