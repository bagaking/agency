## MODIFIED Requirements
### Requirement: Workflow Artifact Ownership
The editor SHALL model workflow artifacts separately from canonical domain objects and keep their ownership explicit.
At minimum:
- lifecycle records and lifecycle gates SHALL remain bound to Cell lifecycle state
- Action Sheets SHALL be workflow artifacts bound to a Cell and optionally a session
- Reply items SHALL be session-bound artifacts with explicit `cellId` and `sessionId` ownership metadata
- HIL artifacts SHALL remain bounded to `comment`, `memo`, and `draft`
- delivery records SHALL be dispatch artifacts that reference source artifacts and target sessions

#### Scenario: Reply remains a session-bound artifact
- **WHEN** a user records or sends a reply
- **THEN** the product stores a reply artifact with explicit session ownership metadata
- **AND** the reply does not become a HIL item or a new execution object parallel to Cells, sessions, or runs

#### Scenario: Delivery remains a dispatch artifact
- **WHEN** a user dispatches content through Promote, Explorer send, or Session Reply
- **THEN** the product records delivery as a dispatch artifact referencing source items and target sessions
- **AND** the dispatch does not redefine session or run ownership semantics

### Requirement: Worktree-Scoped HIL Index
The editor SHALL store human-in-loop artifacts in a worktree-scoped HIL index under `.agency/hil/index-<worktree>.yaml`.
The HIL index SHALL be YAML and mergeable, and SHALL contain items of kind `comment`, `memo`, or `draft`.
The HIL index SHALL NOT store session reply artifacts.
Each HIL item SHALL include `meta.processed`, defaulting to `false` unless explicitly set.

#### Scenario: Store a comment in HIL index
- **WHEN** a user submits a line comment
- **THEN** the editor appends a `comment` item to the HIL index for the active worktree
- **AND** the new item has `meta.processed: false`

#### Scenario: Session replies stay outside HIL
- **WHEN** a user records or sends a reply
- **THEN** the editor does not append a `reply` item to the HIL index

### Requirement: HIL Inbox Type Sections
The Memo Inbox SHALL present sections for Comments, Flash, Excerpt, and Screenshot.
Each section SHALL list items for that type.
Sections that accept user input SHALL provide inline input controls at the top of the section.
Session reply history SHALL remain on the Session Reply surface rather than appearing as a Memo inbox section.

#### Scenario: Open Inbox sections
- **WHEN** a user opens the Memo view Inbox
- **THEN** the editor shows separate sections for Comments, Flash, Excerpt, and Screenshot
- **AND** each section lists its items

#### Scenario: Reply history stays on the session surface
- **WHEN** a user records or sends replies
- **THEN** those replies remain visible from Session Reply history
- **AND** the Memo inbox does not add a Reply section for them

## ADDED Requirements
### Requirement: Session Reply Artifact Storage
The editor SHALL store session reply artifacts in a worktree-scoped reply store separate from HIL.
The reply store SHALL keep an index under `.agency/session-replies/index-<worktree>.yaml`.
Each reply artifact SHALL record explicit owner metadata for `cellId` and `sessionId`.

#### Scenario: Persist a recorded reply
- **WHEN** a user records a reply from Session Reply
- **THEN** the editor writes a reply artifact into the worktree reply store
- **AND** the stored artifact records the owning `cellId` and `sessionId`

### Requirement: Session Reply Storage Tree Layout
The editor SHALL store session reply artifacts under a session-owned tree layout while keeping the worktree reply index as the source of truth.

#### Scenario: Write reply artifact files
- **WHEN** a session reply artifact is created
- **THEN** the editor updates `.agency/session-replies/index-<worktree>.yaml`
- **AND** writes the artifact under `.agency/session-replies/<worktree>/sessions/<cellId>/<sessionId>/<replyId>.yaml`

### Requirement: Session Delivery References Reply Artifacts
When Session Reply triggers delivery, the resulting delivery draft SHALL reference the reply artifact rather than pretending the reply is a HIL item.

#### Scenario: Delivery references a reply artifact
- **WHEN** a user sends a reply through Session Reply quick delivery
- **THEN** the delivery draft stores a source reference with `system=reply`
- **AND** the target delivery draft remains a HIL `draft` artifact

### Requirement: Legacy HIL Reply Migration
If legacy reply records exist in HIL storage from older builds, the editor SHALL import them into the session reply store non-destructively and stop re-surfacing them through HIL/Memo queries.

#### Scenario: Import legacy HIL reply records
- **WHEN** a worktree contains legacy HIL items with `kind=reply`
- **THEN** the editor imports those records into the session reply store with preserved session ownership metadata when available
- **AND** the legacy HIL reply records are no longer returned as active HIL/Memo items
