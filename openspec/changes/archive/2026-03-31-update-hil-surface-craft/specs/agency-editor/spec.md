## MODIFIED Requirements
### Requirement: Global HIL Drawer
The editor SHALL provide a global right-side drawer for HIL panels.
The drawer SHALL be collapsible and default to collapsed.
The drawer SHALL auto-open when a HIL action is invoked (e.g., submitting a comment).
The drawer SHALL use `Memo` as the primary user-facing artifact noun, while `HIL` remains an internal/storage term.
The drawer SHALL NOT mix unrelated panel metaphors for the same artifact system.

#### Scenario: Auto-open drawer after comment
- **WHEN** a user submits a line comment
- **THEN** the right-side drawer opens to show the Comments panel

#### Scenario: Drawer terminology stays coherent
- **WHEN** a user switches between Comments, Drafts, and Memo-facing HIL surfaces
- **THEN** the chrome keeps one consistent Memo vocabulary
- **AND** the surface does not rename the same artifact family with unrelated labels

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active worktree and allow filtering by kind and status.
Memo file references SHALL provide unified `open` and `reveal` entry points.
Memo SHALL support lightweight drag routing into Explorer import flows in phase 1.
The Memo surface SHALL present artifact navigation, capture shortcuts, and draft review as one coherent workspace.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor shows the HIL list for the current worktree
- **AND** the navigation, capture, and draft affordances read as one Memo workspace instead of disconnected sub-tools

### Requirement: Comment Surface Hierarchy
The Comments surface SHALL keep the compose action, file context, snippet evidence, and comment list readable without collapsing into a generic dense tool card.
The Comments surface SHALL make the current file/line, compose state, and submit action legible before secondary metadata.

#### Scenario: Comment compose path stays obvious
- **WHEN** a user opens comment compose from the HIL surface
- **THEN** the UI clearly separates current file context, captured snippet evidence, note input, and submit controls
- **AND** micro-labels do not carry the primary comprehension burden

### Requirement: Bulk Promote Pending Items
The Promote flow SHALL provide two execution modes:
- `Quick` (default): one-step draft creation and direct structured dispatch.
- `Gated` (advanced): Action Sheet-linked execution with gate tracking.
The Promote UI SHALL use unified send semantics with explicit source/mode metadata.
The Promote UI SHALL make the primary path legible in this order: selected records, target session, execution mode, and confirmation state.

#### Scenario: Start quick promote dispatch
- **WHEN** a user starts Promote in quick mode with selected items and target session
- **THEN** a structured send is dispatched directly
- **AND** the run is tagged with `source=promote` and `mode=quick`

#### Scenario: Promote hierarchy stays legible
- **WHEN** a user opens the Promote modal
- **THEN** the UI makes it obvious what will be sent, where it will run, and whether the draft is ready to confirm
- **AND** lower-priority metadata does not visually compete with the primary action path

### Requirement: Contextual HIL Drawer Panels
The editor SHALL adjust the right-side HIL drawer content based on the active view.
Each contextual variant SHALL preserve the same Memo/HIL visual language and hierarchy quality.

#### Scenario: Agent Cells default Drafts
- **WHEN** the user is in Agent Cells and opens the HIL drawer
- **THEN** Drafts is the default panel
- **AND** Comments remains available for selection

#### Scenario: Action Sheets and Explorer default Comments
- **WHEN** the user is in Action Sheets or Explorer and opens the HIL drawer
- **THEN** Comments is the default panel
- **AND** Drafts remains available for selection

#### Scenario: Memo view shows Inbox shortcuts
- **WHEN** the user is in Memo and opens the HIL drawer
- **THEN** the drawer hides the Comments and Drafts tabs
- **AND** the drawer shows Inbox shortcuts for Flash, Excerpt, and Screenshot capture
- **AND** the drawer provides an Open Inbox entry
- **AND** the Memo main Inbox sections remain available in the main pane

#### Scenario: Contextual panels still feel like one system
- **WHEN** the user moves between Agent Cells, Memo, Explorer, and Action Sheets
- **THEN** the HIL surfaces retain one coherent visual language, spacing rhythm, and status treatment
- **AND** they do not degrade into unrelated card collections
