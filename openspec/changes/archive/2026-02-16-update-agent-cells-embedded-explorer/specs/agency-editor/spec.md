## MODIFIED Requirements

### Requirement: Agent Cells Explorer Shortcuts
The editor SHALL label the Explorer view as "Agent Cells" and focus it on Cell management.
The Agent Cells view SHALL provide jump links to Actions, Gates, and Softlinks configuration.
The Agent Cells view SHALL expose an embedded Explorer section anchored in the lower area of the Agent Cells sidebar, aligned with the currently selected Cell context.
The embedded Explorer section SHALL collapse to a bottom bar and expand to a default half-height state, and users SHALL be able to resize the split via vertical drag.
The embedded Explorer section SHALL provide scoped file interaction entry points and lightweight drag/drop routing into Explorer import semantics.
The embedded Explorer section SHALL keep the Agent Cells list and the embedded Explorer file list independently scrollable when content overflows.
The Explorer view SHALL provide a companion changed-files panel above the Agent footer, using consistent presentation and row interactions with the Agent Cells embedded Explorer while remaining changes-only.

#### Scenario: Embedded Explorer panel placement
- **WHEN** a user opens Agent Cells view
- **THEN** the embedded Explorer section appears in the lower Agent Cells sidebar flow
- **AND** the section is context-aware to the selected Cell.

#### Scenario: Embedded Explorer panel collapse and resize
- **WHEN** a user collapses the embedded Explorer section
- **THEN** it remains accessible as a bottom bar at the bottom of the Agent Cells sidebar.
- **WHEN** a user expands the embedded Explorer section
- **THEN** it opens at a default half-height of the available sidebar space
- **AND** a user can drag to resize the section height.

#### Scenario: Changes view shows modified files
- **WHEN** a user selects `Changes` in the embedded Explorer section
- **THEN** the editor presents modified files for the selected Cell/worktree from canonical Explorer status data
- **AND** ignored entries are excluded by default
- **AND** users can switch between Flat and Tree presentation.

#### Scenario: All view shows all files
- **WHEN** a user selects `All` in the embedded Explorer section
- **THEN** the editor presents a file list for the selected Cell/worktree (tracked + untracked)
- **AND** changed entries are highlighted with status badges when available
- **AND** the list MAY be limited; when limited the UI indicates truncation.

#### Scenario: Independent scrolling for Agents and Explorer lists
- **WHEN** the Agent Cells list overflows
- **THEN** it scrolls independently of the embedded Explorer section.
- **WHEN** the embedded Explorer file list overflows
- **THEN** it scrolls within the embedded Explorer section.

#### Scenario: Open and reveal from embedded Explorer
- **WHEN** a user activates open/reveal actions on a file row in the embedded Explorer section
- **THEN** the editor routes actions through unified file interaction intents
- **AND** workbench/Explorer landing behavior remains consistent with other surfaces.

#### Scenario: Embedded Explorer drag/drop routing
- **WHEN** a user drags a file row from embedded Explorer or drops external files onto embedded Explorer
- **THEN** drag-out uses unified `text/plain` payload semantics
- **AND** drop-in routes through unified `import_copy` behavior with standard conflict-safe naming and path-safety checks.

#### Scenario: Explorer companion changed-files continuity
- **WHEN** a user switches from Agent Cells to Explorer view
- **THEN** a changed-files panel is visible above the Agent footer with consistent row/tree presentation
- **AND** the panel does not expose scope toggles and only displays changed files for the selected Cell.
