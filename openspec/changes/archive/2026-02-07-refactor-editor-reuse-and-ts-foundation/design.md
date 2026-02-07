## Context
The editor has repeated implementations for the same domain concepts:
- session naming rule parsing/formatting exists in both main and renderer;
- scoped settings hooks repeat identical dirty/error/saving/IPC guard state machine;
- path normalization/root-boundary checks are copied across Electron services.

This change extracts these into reusable modules first, so later high-leverage refactors and TS migration can build on stable primitives.

## Goals / Non-Goals
- Goals:
  - Reduce logic duplication without changing behavior.
  - Introduce stable reusable primitives that can be typed in later TS phases.
  - Keep integration risk low by preserving existing API contracts.
- Non-Goals:
  - Full TypeScript migration in this change.
  - Large UX rewrites or session architecture rewrites.

## Decisions
- Decision: Add a shared CJS session naming core (`apps/editor/shared/sessionNamingCore.cjs`).
  - Why: It can be consumed by Electron main (`require`) and renderer build (via Vite CJS interop) immediately.
- Decision: Add renderer hook utility `useScopedSettingsState`.
  - Why: Centralizes recurring scoped settings lifecycle and cuts copy-paste in multiple hooks.
- Decision: Add Electron path utility `pathSafety.js`.
  - Why: Path normalization and root escape checks are security-sensitive and should have one canonical implementation.

## Risks / Trade-offs
- Risk: Shared CJS module interop in renderer build.
  - Mitigation: Use `.cjs` extension and validate via renderer production build.
- Risk: Refactor touches multiple hooks/services.
  - Mitigation: Keep signatures/return contracts stable and run syntax/build validation.

## Migration Plan
1. Introduce shared modules.
2. Refactor hook/service consumers incrementally.
3. Validate build and syntax checks.
4. Use these modules as TS migration foundation in follow-up changes.
