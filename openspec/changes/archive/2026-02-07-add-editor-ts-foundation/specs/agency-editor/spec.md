## ADDED Requirements

### Requirement: Editor TypeScript Foundation
The editor SHALL provide a TypeScript foundation in `apps/editor` with a project tsconfig entrypoint and a standard typecheck command.

#### Scenario: Typecheck command is available
- **WHEN** a developer runs `pnpm -C apps/editor typecheck`
- **THEN** TypeScript project checks execute via `tsc --noEmit`.

### Requirement: Renderer Ambient Runtime Types
The editor SHALL provide ambient type declarations required for typed renderer code to access runtime globals safely.

#### Scenario: Renderer global bridge typing exists
- **WHEN** TypeScript code in renderer accesses `window.agency`
- **THEN** the symbol resolves through project ambient declarations without implicit-any global errors.
