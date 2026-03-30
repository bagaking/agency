## ADDED Requirements

### Requirement: Workbench Language Resolution Chain
The workbench SHALL resolve the effective language for a text-capable file through one explicit decision chain.
The decision order SHALL be:
1. local manual override
2. project-level Workbench language rule
3. built-in filename/extension detection
The workbench SHALL surface which source currently owns the effective language, including the automatic fallback path.

#### Scenario: Local override wins for the active file
- **WHEN** a user sets a local Workbench language override for the active file
- **THEN** the workbench uses that language for the active text editor
- **AND** the UI identifies the language source as a local override

#### Scenario: Project rule applies when no local override exists
- **WHEN** a project-level Workbench rule matches a text-capable file and no local override exists
- **THEN** the workbench uses the rule's language
- **AND** the UI identifies the language source as a project rule

#### Scenario: Built-in detection remains the fallback
- **WHEN** no local override or project rule matches the file
- **THEN** the workbench uses the built-in filename/extension detection result
- **AND** the UI identifies the source as automatic or built-in resolution

### Requirement: Workbench Project Language Policy
The editor SHALL load project-level Workbench language rules from `.agency/workbench.yaml` or `.agency/workbench.yml`.
Rules SHALL be evaluated against the file path using one shared matcher contract.

#### Scenario: Load project Workbench policy
- **WHEN** a repository contains `.agency/workbench.yaml`
- **THEN** the editor loads and normalizes the declared Workbench language rules
- **AND** invalid or unsupported language ids are ignored safely

### Requirement: Workbench Language Control
The workbench SHALL provide a bounded control for viewing and changing the effective language of the active text tab.
The control SHALL support resetting the current file back to automatic resolution.
Local manual overrides SHALL be stored as window-local per-file UI state.
Changing the control SHALL NOT implicitly write or rewrite `.agency/workbench.yaml`.

#### Scenario: Reset local override to automatic mode
- **WHEN** a user resets the active file language to automatic mode
- **THEN** the workbench removes the local override for that file
- **AND** the effective language falls back to the project rule or built-in detection chain

### Requirement: Workbench Language Choice Does Not Loosen Edit Safety
Workbench language selection SHALL NOT redefine secure file-kind detection.
Language overrides and project rules SHALL only affect tokenizer/language choice for files that are already in a text-capable editor flow.

#### Scenario: Unknown file remains gated
- **WHEN** a file is still classified as unknown or unsafe for normal editing
- **THEN** the workbench keeps the existing unknown-file warning or bypass flow
- **AND** language policy or local override does not silently convert it into a normal code editor
