## ADDED Requirements

### Requirement: HIL Inbox Type Sections
The Memo Inbox SHALL present sections for Comments, Flash, Excerpt, and Screenshot.
Each section SHALL list items for that type.
Sections that accept user input SHALL provide inline input controls at the top of the section.

#### Scenario: Open Inbox sections
- **WHEN** a user opens the Memo view Inbox
- **THEN** the editor shows separate sections for Comments, Flash, Excerpt, and Screenshot
- **AND** each section lists its items

### Requirement: Flash Memo Capture in Inbox
The Flash section SHALL allow quick text input and create a `memo` item with `meta.noteType: flash`.

#### Scenario: Create flash memo
- **WHEN** a user submits a flash note in the Flash section
- **THEN** the editor creates a `memo` item with `meta.noteType: flash`

### Requirement: Excerpt Memo Capture in Inbox
The Excerpt section SHALL capture the active editor selection and create a `memo` item with `meta.noteType: excerpt` and source metadata.

#### Scenario: Create excerpt memo
- **WHEN** a user selects text and submits an excerpt memo
- **THEN** the editor creates a `memo` item with `meta.noteType: excerpt`
- **AND** stores selection source metadata (file, start line, end line, selection text)

### Requirement: Screenshot Memo Capture in Inbox
The Screenshot section SHALL capture clipboard images and create a `memo` item with `meta.noteType: screenshot` and asset metadata.

#### Scenario: Capture screenshot memo
- **WHEN** a user captures a screenshot in the Screenshot section
- **THEN** the editor stores the image asset under `.agency/hil/<worktree>/assets/`
- **AND** creates a `memo` item with `meta.noteType: screenshot` and an asset reference

### Requirement: Promote Tree Organization
The Promote modal SHALL group selectable items in a tree by Type and Source.
The tree SHALL support selecting a whole node or individual items.

#### Scenario: Select items by group
- **WHEN** a user expands a type/source node
- **THEN** the items under that node are listed
- **AND** selecting the node selects all items within it

### Requirement: HIL Storage Tree Layout
The editor SHALL store HIL items under a tree-aligned directory layout while keeping the index as the source of truth.

#### Scenario: Write HIL item files
- **WHEN** a HIL item is created
- **THEN** the editor writes the item under `.agency/hil/<worktree>/items/<kind>/`
- **AND** updates `.agency/hil/index-<worktree>.yaml`
