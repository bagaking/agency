## ADDED Requirements
### Requirement: Editor Packaging Workflow
The repository SHALL provide a packaging workflow for the Agency Editor that produces macOS installable artifacts.
Packaging MUST be runnable from both the repository root and the `apps/editor` directory.
Packaging artifacts MUST be written under `apps/editor/dist/release`.
The packaging workflow MUST be documented with installation steps.

#### Scenario: Generate macOS artifacts
- **WHEN** a user runs the packaging command
- **THEN** DMG and ZIP artifacts are created under `apps/editor/dist/release`

#### Scenario: Document installation
- **WHEN** a contributor follows the documentation
- **THEN** they can build and install the app locally on macOS
