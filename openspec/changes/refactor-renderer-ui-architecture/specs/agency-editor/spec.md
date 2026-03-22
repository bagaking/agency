## ADDED Requirements
### Requirement: Consistent App-Native Interaction Prompts
The renderer SHALL use shared application-native prompt and confirmation interactions for destructive actions and text-entry flows in core UI surfaces instead of browser-native dialogs.

#### Scenario: Explorer destructive confirmation
- **WHEN** a user deletes one or more files from Explorer
- **THEN** the renderer uses a shared in-app confirmation interaction
- **AND** the flow preserves theme, keyboard handling, and deterministic action callbacks

#### Scenario: Workbench save as prompt
- **WHEN** a user performs Save As from the workbench
- **THEN** the renderer uses a shared in-app text-entry interaction
- **AND** the workbench only updates the tab after successful validation and save execution

### Requirement: Modular Renderer Screen Composition
The renderer SHALL compose major screens through typed screen/view-model boundaries rather than one untyped top-level prop graph.

#### Scenario: Agent Cells screen extraction
- **WHEN** Agent Cells screen composition is refactored
- **THEN** the layout shell receives typed view-model and handler contracts for that screen
- **AND** the user-visible Agent Cells behavior remains unchanged

#### Scenario: Explorer and Workbench composition extraction
- **WHEN** Explorer or Workbench composition logic is extracted from top-level renderer orchestration
- **THEN** each extracted module keeps its state ownership explicit
- **AND** the current open/reveal/edit/save interaction behavior remains unchanged

### Requirement: Renderer Service Boundary for Privileged UI APIs
Renderer view components SHALL access preload-exposed privileged APIs through renderer service abstractions instead of direct global calls.

#### Scenario: Capture overlay integration
- **WHEN** the capture overlay loads capture source data or completes/cancels a capture flow
- **THEN** the view layer calls a renderer service abstraction
- **AND** transport details remain isolated from the UI component tree
