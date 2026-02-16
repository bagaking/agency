## ADDED Requirements

### Requirement: Renderer Large-File Decomposition Program
The editor SHALL decompose large renderer modules into cohesive domain units while preserving existing feature behavior and integration contracts.

#### Scenario: App composition remains stable during decomposition
- **WHEN** renderer orchestration logic is extracted from `App.tsx`
- **THEN** existing feature views and callbacks remain reachable through stable integration props
- **AND** no feature-level behavior regression is introduced by the decomposition.

#### Scenario: Existing large panels are decomposed by bounded responsibilities
- **WHEN** large panels (Agent Cells, Explorer, Terminal, Workbench, HIL, Quick Actions, Session Reply) are refactored
- **THEN** each panel is split into bounded modules (view, domain controller, shared utility) instead of one monolithic component file.

#### Scenario: Extracted runtime hooks are also bounded
- **WHEN** large runtime hooks (for example terminal runtime orchestration hooks) exceed renderer quality limits
- **THEN** they are decomposed into focused sub-hooks/utilities instead of replacing one monolith with another.

### Requirement: Reuse-First Shared Interaction Modules
The editor SHALL extract and reuse shared interaction modules for duplicated renderer logic before applying file-local splitting.

#### Scenario: External drop parsing is shared across surfaces
- **WHEN** Agent Cells and Explorer handle external drop inputs
- **THEN** both surfaces use one shared external drop-path parsing module
- **AND** path parsing behavior remains consistent across MIME payload variants.

#### Scenario: File dashboard preview loading is shared across surfaces
- **WHEN** Agent Cells and Explorer companion changed-files panel request file previews
- **THEN** both surfaces use one shared preview-loading mechanism
- **AND** preview request/cancellation semantics remain consistent.

#### Scenario: Snippet preview loading is shared for hover/detail previews
- **WHEN** dashboards and HIL anchor/tooltips request file snippets
- **THEN** they use one shared snippet-preview loading mechanism
- **AND** loading/error/cancellation semantics remain consistent across surfaces.

### Requirement: Renderer Bridge Adapter Consistency
The editor SHALL route renderer-main operations in large UI components through service bridge adapters rather than direct runtime-global calls.

#### Scenario: Component runtime calls use bridge adapters
- **WHEN** large renderer components perform terminal/workbench/explorer/HIL runtime operations
- **THEN** calls flow through typed renderer service adapters
- **AND** direct `window.agency` usage in those component implementations is eliminated except global availability checks.

#### Scenario: Explorer clipboard/materialize paths use bridge adapters
- **WHEN** Explorer handles paste/materialize flows
- **THEN** those runtime calls flow through bridge adapters instead of direct `window.agency` access in component code
- **AND** existing paste/materialize behavior remains unchanged.

### Requirement: Reuse Catalog Synchronization After Refactor
The editor SHALL synchronize reusable-item documentation when refactor work introduces, modifies, or deprecates reusable coding assets.

#### Scenario: New reusable module is documented
- **WHEN** a refactor extracts a reusable component/hook/mechanism
- **THEN** `docs/notes-reusable-items-coding.md` is updated in the same refactor change with usage and source-of-truth path.

#### Scenario: Deprecated duplicated logic is recorded
- **WHEN** duplicated logic is removed and replaced by shared modules
- **THEN** the catalog records the replacement and migration note to avoid future reintroduction.
