## ADDED Requirements

### Requirement: Explorer External Drag Import
The Explorer SHALL accept external drag-drop entries from Finder and import them into the project tree.
The external drag import operation SHALL copy sources into the target directory and SHALL NOT move source files from Finder.
The Explorer SHALL preserve existing internal drag-move behavior for drags originating from Explorer rows.

#### Scenario: Import Finder file onto folder row
- **WHEN** a user drags a Finder file onto an Explorer folder row
- **THEN** the file is copied into that folder
- **AND** the tree refreshes to show the imported file.

#### Scenario: Import Finder folder recursively
- **WHEN** a user drags a Finder folder onto an Explorer folder row
- **THEN** the folder and its descendants are copied recursively into that target folder.

#### Scenario: Preserve internal drag-move behavior
- **WHEN** a user drags an Explorer row onto another folder row using internal drag payload
- **THEN** the editor keeps move semantics for that operation.

### Requirement: Explorer External Drop Target Resolution
The Explorer SHALL resolve external drop targets using deterministic rules:
- Drop on directory row -> that directory
- Drop on file row -> parent directory of that file
- Drop on blank list area -> focused directory if present, else focused file parent, else explorer root

#### Scenario: Blank-area drop with focused file
- **WHEN** a user drops Finder entries on blank Explorer list area while a file row is focused
- **THEN** the import target is the focused file's parent directory.

#### Scenario: Blank-area drop without focus
- **WHEN** a user drops Finder entries on blank Explorer list area and no row is focused
- **THEN** the import target is the explorer root directory.

### Requirement: Conflict-Safe External Import Naming
The Explorer SHALL never overwrite existing entries during external drag import.
When an imported entry name conflicts with an existing target entry, the editor SHALL auto-resolve using a numeric suffix pattern (`name (1)`, `name (2)`, ...) and preserve file extension for files.

#### Scenario: Same-name file import
- **WHEN** `report.md` already exists in target and a Finder file named `report.md` is dropped
- **THEN** the imported file is written as `report (1).md` (or next available index)
- **AND** existing `report.md` remains unchanged.

### Requirement: External Import Failure Isolation and Reporting
The external drag import flow SHALL process independent source paths without aborting all imports on first failure.
The system SHALL report a structured result that distinguishes successful imports, skipped items, and per-item failures.

#### Scenario: Partial failure import
- **WHEN** one dropped source path is unreadable and another is valid
- **THEN** the valid source is imported
- **AND** the unreadable source is reported as a failure without canceling the whole operation.
