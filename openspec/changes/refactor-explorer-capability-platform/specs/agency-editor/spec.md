## ADDED Requirements

### Requirement: Explorer Filter Descriptor Registry
The editor SHALL represent Explorer filters through a descriptor-driven model instead of only through hard-coded UI toggles.
Built-in filters SHALL be the first entries in that registry.
The descriptor model SHALL support persisted active state and future project-defined filter bundles.

#### Scenario: Built-in filters use the descriptor model
- **WHEN** Explorer renders built-in visibility, status, or semantic filters
- **THEN** it derives their labels, ids, and active-state handling from filter descriptors
- **AND** existing filter behavior remains functionally equivalent

#### Scenario: Persist filter state by descriptor id
- **WHEN** a user changes Explorer filters and later reopens the same root scope
- **THEN** Explorer restores filter state using stable descriptor ids

### Requirement: Explorer Search Capability Split
The editor SHALL distinguish between Explorer path/name search and Explorer full-text content search.
Path/name search SHALL continue to support fast tree reduction.
Content search SHALL support cross-file keyword discovery and SHALL NOT be treated as equivalent to filename filtering.

#### Scenario: Path search reduces the tree
- **WHEN** a user enters a path or filename query in Explorer search
- **THEN** Explorer filters visible paths and required ancestor nodes
- **AND** the result behaves as a tree-reduction interaction

#### Scenario: Content search returns content matches
- **WHEN** a user searches for a keyword across file contents
- **THEN** the editor returns file matches with line-level or snippet-level evidence
- **AND** the result is presented as a content-search result set rather than only as filename-filtered tree rows

### Requirement: Explorer Content Search And Replace
The editor SHALL support content search and scoped content replace across files.
Content replace SHALL provide target visibility and confirmation semantics suitable for multi-file mutation.

#### Scenario: Replace keyword across a folder
- **WHEN** a user runs content replace within a folder scope
- **THEN** the editor shows target matches and replacement impact before applying the change

#### Scenario: Replace keyword across the project
- **WHEN** a user runs content replace across the active project
- **THEN** the editor applies the replacement only to confirmed targets
- **AND** reports any files that could not be changed

### Requirement: Explorer Command Registry
The editor SHALL represent Explorer header and context-menu actions through a command registry rather than only hard-coded UI lists.
Each command SHALL define id, label, surface placement, and visibility conditions.

#### Scenario: Header actions come from command registry
- **WHEN** Explorer renders header actions
- **THEN** it derives action order and visibility from registered Explorer commands

#### Scenario: Context menu actions come from command registry
- **WHEN** a user opens the Explorer context menu
- **THEN** the menu groups and visible actions come from registered Explorer commands
- **AND** commands can still route to the existing file intent execution layer

### Requirement: Explorer Working-Set Views
The editor SHALL support Explorer working-set views as a first-class capability family in addition to the canonical file tree.
`Changed Files` SHALL be the first working-set view in that family.

#### Scenario: Switch to a working-set view
- **WHEN** a user activates the `Changed Files` working-set view
- **THEN** Explorer renders the registered working-set view using Explorer-aligned action grammar

#### Scenario: Working-set family is extensible
- **WHEN** a new working-set view is added in the future
- **THEN** it can attach to the Explorer working-set model without inventing a separate panel architecture

### Requirement: Explorer Project Policy And Presets
The editor SHALL support project-level Explorer policy for defaults and future presets.
Project policy SHALL be able to define default filter or working-set behavior without replacing user-local state persistence.

#### Scenario: Project default working set
- **WHEN** a project defines an Explorer policy with default working-set or filter preferences
- **THEN** Explorer applies those defaults on first load for that project scope
- **AND** user-local persisted state can still override them afterwards

### Requirement: Bounded URL Research Lane
The editor SHALL provide a bounded URL/browser research lane for Explorer-adjacent workflows.
The lane SHALL support URL inspection and handoff into file or workflow artifacts.
The lane SHALL NOT be positioned as a general-purpose browser replacement.

#### Scenario: URL research handoff
- **WHEN** a user opens a URL in the bounded research lane
- **THEN** the editor can inspect, save, import, or cite that content into the workspace or workflow system

#### Scenario: Escape to system browser
- **WHEN** a user needs full browser behavior
- **THEN** the editor provides an explicit action to open the URL in the system browser

## MODIFIED Requirements

### Requirement: Explorer Filtering and Search
The explorer SHALL allow filtering the tree by filename/path, by change status, and by semantic file rules.
The explorer SHOULD evolve built-in filters through a descriptor-driven model so future filter families can be added without hard-coded UI proliferation.

#### Scenario: Filter by filename
- **WHEN** a user enters a filename filter
- **THEN** the explorer shows matching files and their ancestor paths

#### Scenario: Semantic filter
- **WHEN** a user enables a semantic filter
- **THEN** the explorer shows files matching that semantic rule and their required ancestor paths

### Requirement: Explorer Visibility Controls
The explorer SHALL provide controls to toggle hidden files, ignored files, and status-based filters.
The explorer SHALL allow filtering by Cell scope when multiple Cells exist.
The explorer SHOULD surface active filter state clearly enough that users do not need to reopen the filter panel to understand the current browsing mode.

#### Scenario: Toggle hidden files
- **WHEN** a user disables hidden files
- **THEN** dot-prefixed entries are removed from the tree

#### Scenario: Filter by status
- **WHEN** a user enables the "modified only" filter
- **THEN** the tree shows only modified entries and their ancestors

#### Scenario: Active filter summary is visible
- **WHEN** one or more Explorer filters are active
- **THEN** Explorer surfaces a readable summary or equivalent state indicator in the visible shell

### Requirement: Workflow-focused selection actions
The editor SHALL expose file-scoped workflow actions in Explorer through an explicit selection-actions surface rather than hiding them as generic row-level actions.
The selection-actions surface SHALL keep file browsing as the primary Explorer responsibility while still supporting workflow handoff.

#### Scenario: Selection actions become explicit
- **WHEN** a user selects one or more files in Explorer
- **THEN** the editor shows a dedicated selection-actions surface for workflow operations
- **AND** the main file tree remains the primary browsing surface

### Requirement: Explorer Baseline File And Folder Operations Remain First-Class
The editor SHALL preserve baseline file and folder operations while Explorer evolves into a capability platform.
These operations MUST continue to include copy, duplicate, move, rename, clipboard flows, and conflict-safe naming for both files and folders.

#### Scenario: Registry refactor preserves duplicate behavior
- **WHEN** Explorer actions are migrated into registries or working-set views
- **THEN** users can still duplicate files and folders with the same conflict-safe naming behavior

#### Scenario: Registry refactor preserves clipboard behavior
- **WHEN** Explorer actions are migrated into registries or working-set views
- **THEN** file and folder copy/cut/paste flows continue to work with the same safety guarantees
