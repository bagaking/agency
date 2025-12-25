## ADDED Requirements

### Requirement: macOS-First Agency Editor
Agency SHALL provide a desktop editor application that runs on macOS in v0.2.
The architecture MUST keep a path open for future Windows/Linux support.

#### Scenario: macOS build artifacts
- **WHEN** v0.2 release artifacts are produced
- **THEN** an installer/package exists for macOS

### Requirement: Create Agent (Cell)
The editor SHALL create a new Cell by creating or reusing a git worktree and binding it 1:1 with a branch.

#### Scenario: Create new Cell
- **WHEN** a user creates a new agent with a new branch
- **THEN** a new worktree is created and bound to that branch

#### Scenario: Reuse existing worktree
- **WHEN** a user selects an existing worktree for a new agent
- **THEN** the editor reuses the worktree and keeps the branch binding intact

### Requirement: Embedded Terminal and CLI Management
The editor SHALL provide an embedded terminal and manage CLI processes (e.g., Codex) per Cell.

#### Scenario: Start CLI for a Cell
- **WHEN** a user starts a CLI task for a Cell
- **THEN** the CLI runs inside the embedded terminal and its output is visible

### Requirement: Lifecycle State File
The editor SHALL persist Cell lifecycle state in a per-worktree file under `.agency/` whose filename includes the worktree's unique name.
The file MUST be YAML or Markdown and MUST be treated as a mergeable record.
The editor SHALL read and update this file to reflect lifecycle changes.

#### Scenario: External update
- **WHEN** the lifecycle file changes due to an external workflow
- **THEN** the editor reflects the updated lifecycle state

### Requirement: Minimal Validation (MVP)
The editor SHALL perform minimal validation of spec/branch context and MUST label this validation as a temporary version.
Validation failures MUST surface as warnings and MUST NOT block the workflow.

#### Scenario: Spec missing
- **WHEN** a Cell is missing its spec file
- **THEN** the editor shows a warning and allows the user to proceed
