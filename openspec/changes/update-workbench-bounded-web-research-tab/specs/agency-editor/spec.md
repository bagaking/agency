## MODIFIED Requirements

### Requirement: Explorer Search Capability Split
The editor SHALL distinguish between Explorer `Paths`, Explorer `Content`, and Explorer `URL` modes.
Path/name mode SHALL continue to support fast tree reduction.
Content mode SHALL support cross-file keyword discovery and SHALL NOT be treated as equivalent to filename filtering.
URL mode SHALL launch the bounded web research workflow instead of behaving like filename filtering or generic browser navigation.

#### Scenario: Path search reduces the tree
- **WHEN** a user enters a path or filename query in Explorer search
- **THEN** Explorer filters visible paths and required ancestor nodes
- **AND** the result behaves as a tree-reduction interaction

#### Scenario: Content search returns content matches
- **WHEN** a user searches for a keyword across file contents
- **THEN** the editor returns file matches with line-level or snippet-level evidence
- **AND** the result is presented as a content-search result set rather than only as filename-filtered tree rows

#### Scenario: URL mode launches bounded web research
- **WHEN** a user switches Explorer into `URL` mode
- **THEN** the shared Explorer search row accepts a public URL as the primary input
- **AND** activating that URL flow opens or focuses a bounded web research tab in Workbench instead of replacing the Explorer primary panel

#### Scenario: URL-aware affordance shortens the path
- **WHEN** the shared Explorer search row contains text that looks like a supported public URL and the current surface supports URL research
- **THEN** Explorer surfaces a compact URL-specific affordance in that same search row
- **AND** using it launches or focuses the bounded web research tab

### Requirement: Explorer Bounded URL Research Lane
The explorer SHALL provide bounded URL intake for URL-driven file workflows.
Explorer SHALL own discovery, intent selection, and launch/focus into the bounded web research workflow.
Explorer SHALL NOT remain the long-lived host for the primary web research work surface.

#### Scenario: URL entry is first-class instead of hidden
- **WHEN** Explorer exposes URL-driven research
- **THEN** that capability is entered through the first-class Explorer mode selector and shared search row
- **AND** the product does not require an icon-only header command as the sole discoverability path

#### Scenario: Explorer launches the bounded host
- **WHEN** a user commits to working with a URL from Explorer
- **THEN** Explorer launches or focuses the bounded web research tab in Workbench
- **AND** Explorer remains responsible for intake rather than becoming the primary host

### Requirement: Workbench Tabs
The editor SHALL provide a workbench with multiple tabs, supporting preview vs pinned tabs, reordering, and closing.
Workbench tabs SHALL persist per Cell and restore on relaunch.
The Workbench SHALL support explicit non-file bounded document kinds when the product requires a dedicated host surface.

#### Scenario: Preview vs pinned tabs
- **WHEN** a user single-clicks a file and then double-clicks another file
- **THEN** the first opens as a preview tab and the second opens as a pinned tab

#### Scenario: Bounded web research tab is a first-class workbench object
- **WHEN** a user launches URL research from Explorer
- **THEN** Workbench opens or focuses a bounded web research tab with its own explicit tab kind
- **AND** that tab is not disguised as a local file path tab

## ADDED Requirements

### Requirement: Workbench Bounded Web Research Tab
The Workbench SHALL host a bounded web research tab for URL-driven research workflows.
That tab SHALL provide the primary page/content surface once the user commits to working with a URL.
The tab SHALL remain bounded to research/document workflow rather than becoming a general-purpose browser product.

#### Scenario: Hosted tab shows page-level research actions
- **WHEN** a bounded web research tab is active
- **THEN** the tab surface exposes page-level actions such as `Reload`, `Open in Browser`, `Save Markdown`, and `Cite`
- **AND** the user does not need to return to Explorer for the primary URL workflow actions

#### Scenario: Saved Markdown keeps deterministic source metadata
- **WHEN** a user saves Markdown from the bounded web research tab
- **THEN** the saved Markdown includes fixed source frontmatter that records the original URL
- **AND** Workbench focuses that Markdown file after the save completes

#### Scenario: Frontmatter-linked Markdown reopens with preview
- **WHEN** Workbench opens a Markdown file that carries the bounded-web source frontmatter
- **THEN** Workbench automatically enters a linked markdown + preview mode
- **AND** the hosted preview adapts `Save Markdown` into `Overwrite Markdown`

#### Scenario: Hosted tab remains bounded
- **WHEN** a bounded web research tab is active
- **THEN** the product does not expose browser-global cookie/session management, arbitrary browser tabs, or generic browser chrome
- **AND** full browser behavior continues to escape through the system browser

#### Scenario: Saved artifacts return to workspace flows
- **WHEN** a user saves or cites content from the bounded web research tab
- **THEN** the resulting Markdown artifact or memo artifact routes back through the existing workspace/workflow seams
- **AND** saved workspace artifacts can still be opened or revealed through Explorer and Workbench flows
