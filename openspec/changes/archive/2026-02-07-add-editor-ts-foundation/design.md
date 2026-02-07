## Context
The current editor stack is JavaScript-first with no explicit TypeScript project configuration. We need a migration-safe baseline that can typecheck incrementally while runtime remains unchanged.

## Goals
- Provide a stable TS toolchain entrypoint (`tsc --noEmit`).
- Define tsconfig layering suitable for staged migration.
- Add essential ambient type declarations for renderer runtime globals.

## Non-Goals
- Migrating large feature modules to TS/TSX in this change.
- Enabling strict mode globally in one step.

## Decisions
- Add a root tsconfig for `apps/editor` focused on incremental adoption.
- Start with compatibility-oriented compiler flags (`allowJs`) and tighten in later changes.
- Keep Electron main runtime JS-first; this change does not alter startup/runtime loading.

## Risks / Trade-offs
- A permissive TS baseline catches fewer issues initially.
  - Mitigation: follow-up changes increase strictness by module.
