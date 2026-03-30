## MODIFIED Requirements

### Requirement: Hierarchy Configuration Navigation
The editor SHALL provide a Hierarchy entry in the activity bar for configuration of Actions, Gates, Softlinks, Reply Quick Prompts, App Shortcuts, and Session Naming. The Hierarchy view SHALL present capability-first navigation, where each capability lives on its own page and exposes a persistent page-level scope selector that lists Global, Project, and Agent context hints. The page-level selector SHALL highlight the repo root even when no Cell is selected so Project scope editing stays available, while Agent scope editing SHALL remain bound to the selected Cell and stay disabled otherwise. Switching between capability pages SHALL preserve the currently selected scope so users can work within the same scope context without repeating manual re-selection.

#### Scenario: Open hierarchy configuration
- **WHEN** a user selects the Hierarchy item in the activity bar
- **THEN** the editor shows Actions, Gates, and Softlinks navigation entries
- **AND** the opened page renders a capability-first layout with a page-level scope selector that marks Global, Project (<project root>), and Agent (<selected cell> / “Select a cell”) options.

#### Scenario: Page-level scope selection persists across capabilities
- **WHEN** a user opens Hierarchy → Actions, selects Project scope without a Cell, edits a setting, then switches to Gates
- **THEN** the editor keeps Project scope active, reuses the project root context, and allows editing even without a Cell
- **AND** switching to Agent scope while no Cell is selected leaves the Agent controls disabled and prompts the user to select a Cell before edits are allowed.

### Requirement: Actions Configuration Scopes in Hierarchy
The editor SHALL expose Global, Project, and Agent action configuration entries in Hierarchy with per-capability pages and page-level scope selectors. Project entries SHALL require only a selected project root and SHALL NOT require a selected Cell with a live worktree attachment; Project scope edits SHALL read from and write to `.agency/quick-actions.yaml` at the repository root. Agent entries SHALL require a selected Cell; Agent scope edits SHALL read from and write to `.agency/cells/<cell-id>/quick-actions.yaml`, and the scope selector shall show the active Cell context. When no Cell is selected, the Agent scope control SHALL be disabled and shall prompt the user to choose a Cell before allowing changes.

#### Scenario: Open global actions
- **WHEN** a user selects Global Actions in Hierarchy
- **THEN** the editor shows the global actions configuration view
- **AND** the page-level scope selector highlights the Global option.

#### Scenario: Open project actions without a selected Cell
- **WHEN** a user selects Project Actions with an active project but no selected Cell
- **THEN** the editor allows editing the Project action configuration through the page-level scope selector
- **AND** saves changes to `.agency/quick-actions.yaml` so the repo root reflects the new values even without an attached Cell.

#### Scenario: Agent actions without a Cell
- **WHEN** a user selects Agent Actions without an active Cell
- **THEN** the editor disables editing, disables the Agent scope tab, and prompts the user to select a Cell before allowing changes.

#### Scenario: Save agent action configuration for the selected Cell
- **WHEN** a Cell is selected, the user switches the scope selector to Agent, updates an action, and saves
- **THEN** the editor writes the change to `.agency/cells/<cell-id>/quick-actions.yaml`
- **AND** the Agent scope selector shows the selected Cell context.

### Requirement: Scoped Hierarchy Configuration Uses Repo-Owned Storage
The editor SHALL store Project-scoped Hierarchy configuration at repository-root `.agency/` and Agent-scoped configuration in repo-owned Cell storage under `.agency/cells/<cell-id>/`. The page-level scope selectors on each capability page SHALL resolve entries through these repo-owned paths for Quick Actions, Reply Quick Prompts, Session Naming, Terminus Settings, App Shortcuts, and Gates while keeping Agent entries cell-specific.

#### Scenario: Project config survives worktree churn
- **WHEN** a user switches, detaches, or removes a Cell worktree
- **THEN** Project-scoped configuration still resolves from the repository root
- **AND** the page-level scope selector continues to target `.agency/` so the same values remain editable without a live Cell.

#### Scenario: Agent config survives worktree replacement
- **WHEN** a Cell later reattaches to a different worktree
- **THEN** the Cell's Agent-scoped configuration still resolves from the same repo-owned Cell record
- **AND** the page-level scope selector continues to read/write `.agency/cells/<cell-id>/` even if the attached worktree changes.
