## ADDED Requirements

### Requirement: TypeScript-First Editor Tooling Layer
The editor SHALL execute supported development/build/test tooling entrypoints from TypeScript sources to maintain a consistent language baseline.

#### Scenario: Script entrypoints run from TypeScript sources
- **WHEN** developers run editor tooling commands (dev/build/test)
- **THEN** the configured script entrypoints resolve to TypeScript files with equivalent behavior to pre-migration flows.

### Requirement: Explicit JS Compatibility Exceptions
The editor SHALL keep a documented, minimal set of JS/CJS compatibility exceptions only where runtime/tooling integration requires it.

#### Scenario: Remaining JS files are intentional
- **WHEN** the migration is complete
- **THEN** remaining JS/CJS files are limited to documented compatibility cases and not general feature implementation paths.
