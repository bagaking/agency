## ADDED Requirements
### Requirement: Deferred Heavyweight Renderer Surfaces
The editor SHALL defer heavyweight hidden renderer surfaces until the user activates them through an explicit interaction or active view transition.
The editor SHALL express deferred mount behavior through shared renderer mechanisms instead of one-off feature-local lifecycle logic.

#### Scenario: Closed shell overlay is not mounted
- **WHEN** a heavyweight global overlay is closed
- **THEN** the renderer does not keep that overlay mounted solely to preserve hidden UI structure
- **AND** reopening the overlay recreates only disposable overlay-local UI state.

#### Scenario: First access mounts retained workbench view
- **WHEN** a heavyweight main-panel surface is not yet visited
- **THEN** the renderer defers its first mount until the user activates that surface
- **AND** after first activation the surface may stay mounted through a shared retain strategy to preserve expected UI state.

### Requirement: Shared Lazy Runtime Wrappers
The editor SHALL route heavyweight renderer runtimes through shared wrapper components so future features can follow one stable loading contract.

#### Scenario: Monaco-backed surfaces use the shared wrapper
- **WHEN** a renderer surface needs Monaco
- **THEN** it loads Monaco through the shared lazy Monaco wrapper instead of importing `@monaco-editor/react` directly in the surface module.

#### Scenario: Animation runtime uses a deferred wrapper
- **WHEN** a renderer surface shows a Rive animation
- **THEN** the animation runtime is loaded through a shared wrapper boundary rather than eager runtime import in the shell bundle.
