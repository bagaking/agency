## ADDED Requirements

### Requirement: Worktree-Scoped HIL Index
The editor SHALL store human-in-loop artifacts in a worktree-scoped HIL index under `.agency/hil/index-<worktree>.yaml`.
The HIL index SHALL be YAML and mergeable, and SHALL contain items of kind `comment`, `memo`, or `draft`.

#### Scenario: Store a comment in HIL index
- **WHEN** a user submits a line comment
- **THEN** the editor appends a `comment` item to the HIL index for the active worktree

### Requirement: Global HIL Drawer
The editor SHALL provide a global right-side drawer for HIL panels.
The drawer SHALL be collapsible and default to collapsed.
The drawer SHALL auto-open when a HIL action is invoked (e.g., submitting a comment).

#### Scenario: Auto-open drawer after comment
- **WHEN** a user submits a line comment
- **THEN** the right-side drawer opens to show the Comments panel

### Requirement: Memo Navigation Entry
The editor SHALL provide a Memo entry in the activity bar to access HIL artifacts.
The Memo view SHALL list HIL items for the active worktree and allow filtering by kind and status.

#### Scenario: Open Memo view
- **WHEN** a user selects Memo in the activity bar
- **THEN** the editor shows the HIL list for the current worktree

### Requirement: Promote Comment to Draft
The editor SHALL allow users to promote a comment into a `draft` HIL item.
Promotion SHALL NOT directly edit spec files or external spec systems.

#### Scenario: Promote comment
- **WHEN** a user promotes a comment to a draft
- **THEN** a new `draft` item is created in the HIL index

### Requirement: Legacy Comment Migration
If legacy comment storage exists, the editor SHALL import those comments into the HIL index non-destructively.

#### Scenario: Migrate legacy comments
- **WHEN** a worktree contains `.agency/comments-<worktree>.yaml`
- **THEN** the editor imports comments into the HIL index and leaves the legacy file intact
