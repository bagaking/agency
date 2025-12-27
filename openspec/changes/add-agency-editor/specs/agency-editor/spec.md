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

#### Scenario: Shell-first with quick commands
- **WHEN** a user opens a Cell terminal
- **THEN** the terminal starts in shell mode without auto-running a CLI
- **AND** the user can trigger CLI tools via quick commands (e.g., `codex`, `gemini`, `claude`)

#### Scenario: Auto-open shell on Cell selection
- **WHEN** a user switches to a different Cell
- **THEN** the editor auto-opens the shell for that Cell

#### Scenario: Auto-restore shell on relaunch
- **WHEN** the editor relaunches
- **THEN** it restores the last selected Cell and auto-opens a new shell session

### Requirement: Lifecycle State File
The editor SHALL persist Cell lifecycle state in a per-worktree file under `.agency/` whose filename includes the worktree's unique name.
The file MUST be YAML or Markdown and MUST be treated as a mergeable record.
The editor SHALL read and update this file to reflect lifecycle changes.

#### Scenario: External update
- **WHEN** the lifecycle file changes due to an external workflow
- **THEN** the editor reflects the updated lifecycle state

### Requirement: Lifecycle Gates and Confirmation
The editor SHALL require a confirmation step for lifecycle transitions.
The confirmation MUST show gate results for the target state and MUST block the transition when any required gate fails.
Required gates MUST include at least: spec created, checklist completed, and no unresolved merge conflicts.

#### Scenario: Transition allowed
- **WHEN** a user transitions a Cell to Active or Archived and all required gates pass
- **THEN** the editor allows the transition after explicit confirmation

#### Scenario: Transition blocked
- **WHEN** a user transitions a Cell to Active or Archived and any required gate fails
- **THEN** the editor blocks the transition and surfaces the failing gate(s)

### Requirement: Minimal Validation (MVP)
The editor SHALL perform minimal validation of spec/branch context and MUST label this validation as a temporary version.
Validation failures MUST surface as warnings and MUST NOT block the workflow.

#### Scenario: Spec missing
- **WHEN** a Cell is missing its spec file
- **THEN** the editor shows a warning and allows the user to proceed
