## ADDED Requirements

### Requirement: TypeScript-only Governed Source
The project SHALL keep repo-authored source in governed implementation roots as TypeScript-first and SHALL reject checked-in JavaScript-family source files in those roots.

#### Scenario: Governed source uses TypeScript
- **WHEN** contributors modify repo-authored source under governed roots such as `apps/`, `pkg/`, or `scripts/`
- **THEN** the source of truth is stored as TypeScript or another explicitly allowed non-JavaScript declarative format
- **AND** checked-in `.js`, `.cjs`, and `.mjs` files are not introduced in those governed roots unless explicitly exempted by project rule

#### Scenario: Validator rejects governed JavaScript source
- **WHEN** a repo-authored `.js`, `.cjs`, or `.mjs` file appears in a governed source root without an approved exemption
- **THEN** the project validation path fails with the violating file path
- **AND** generated output or vendored files outside the governed roots remain excluded from that rule

### Requirement: TypeScript Main-Process Harness Source
The editor SHALL keep the Main Agent Harness implementation in TypeScript rather than checked-in CommonJS JavaScript.

#### Scenario: Harness source compiles from TypeScript
- **WHEN** the Electron main-process build runs
- **THEN** the Harness controller, runner adapters, providers, skill packs, and store modules compile from TypeScript source
- **AND** emitted JavaScript remains a build artifact rather than tracked source
