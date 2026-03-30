## ADDED Requirements

### Requirement: Explorer Policy Presets
The editor SHALL allow project policy to define named Explorer presets.
Each preset SHALL be declared in `.agency/explorer.yaml` or `.agency/explorer.yml` with a stable id and a bounded capability payload.
Preset payload MAY configure:
- working-set view
- search mode
- content-search scope defaults
- filter descriptor defaults

#### Scenario: Project defines named Explorer presets
- **WHEN** a project policy includes named Explorer presets
- **THEN** the editor exposes those presets as selectable Explorer starting states
- **AND** each preset resolves through existing Explorer capability descriptors

#### Scenario: Invalid preset field falls back safely
- **WHEN** a preset references an unknown working-set, search mode, or descriptor field
- **THEN** the editor ignores the invalid portion and falls back to valid built-in defaults
- **AND** Explorer remains usable without crashing or mutating file-intent behavior

### Requirement: Explorer Preset Apply Semantics
Applying an Explorer preset SHALL update Explorer capability state through the same normalization and persistence layer used by ordinary Explorer interactions.
Project presets SHALL NOT replace user-local Explorer persistence unless the user explicitly applies a preset.

#### Scenario: Explicit preset apply wins over prior local state
- **WHEN** a user explicitly applies a project-defined Explorer preset
- **THEN** the editor updates the current Explorer capability state to match that preset

#### Scenario: Later local interaction remains local
- **WHEN** a user changes Explorer state after applying a preset
- **THEN** the later local interaction becomes the current local state
- **AND** the editor does not silently reapply the project preset on the next policy refresh
