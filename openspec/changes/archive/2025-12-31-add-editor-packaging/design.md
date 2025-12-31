## Context
Packaging the Electron app requires a repeatable build pipeline and a reliable artifact location.

## Goals / Non-Goals
- Goals:
  - Provide a one-command packaging flow for macOS.
  - Generate installable artifacts (DMG/ZIP) without code signing.
  - Keep renderer build output separate from packaged artifacts.
- Non-Goals:
  - Not adding notarization or signing in v0.2.
  - Not building Windows/Linux artifacts yet.

## Decisions
- Decision: Use electron-builder for packaging.
- Decision: Output packaged artifacts to `apps/editor/dist/release` to avoid clashing with `dist/renderer`.
- Decision: Provide `pnpm run package` and `make editor-package` as entry points.

## Risks / Trade-offs
- Unsigned macOS builds require users to bypass Gatekeeper on install.
- Packaging may require native dependencies (node-pty) to rebuild during install.

## Migration Plan
- Add scripts/config, run packaging locally, document steps.

## Open Questions
- None.
