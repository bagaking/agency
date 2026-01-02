## Context
Packaged builds can start outside a git repo, and the UI can appear blank without a clear entry point. Users also need an explicit project selection flow before cells and worktrees can be managed.

## Goals / Non-Goals
- Goals:
  - UI always renders, even without a selected project.
  - Clear empty state for project selection.
  - Packaged app loads local renderer assets reliably and logs failures.
- Non-Goals:
  - Multi-project workspace management or advanced project history UI.
  - Cross-platform packaging workflows in this change.

## Team Perspective (Best-Fit Roles)
- Desktop packaging expert: diagnose bundle structure, file:// asset paths, TMPDIR/hdiutil pitfalls, and startup guards.
- macOS distribution expert: ensure Gatekeeper-safe behavior and reproducible install/start workflows.
- UX lead: design the empty state, default Explorer entry, and gated Agent Cells behavior.
- Git/worktree specialist: define how project root is resolved and validated.
- Observability/QA: add startup diagnostics and failure logging to avoid silent blank screens.

## Decisions
- Decision: Default to Explorer when no project is configured.
  - Rationale: Explorer is the most natural entry point for selecting a project and avoids a blank UI.
- Decision: Add an empty-state project picker and persist selected root locally.
  - Rationale: Makes the initial path explicit and repeatable after relaunch.
- Decision: Agent Cells view shows a placeholder and only allows the default terminal until a project is selected.
  - Rationale: Prevents invalid worktree operations without context.
- Decision: Packaged builds must load local renderer assets with guardrails and runtime logging.
  - Rationale: File:// asset resolution differs from dev; failures must be observable.

## Risks / Trade-offs
- Persisted project root may become invalid (deleted/moved).
  - Mitigation: detect invalid paths and re-enter empty state.
- Additional startup checks may add minor overhead.
  - Mitigation: keep checks minimal and cached.

## Issue Log
- Packaged app can launch without UI if dock icon loads from an invalid path inside `app.asar`.
  - Resolution: resolve icon from `process.resourcesPath` with safety checks and avoid throwing during startup.

## Migration Plan
- Introduce project selection UI and persistence.
- Add packaged load logging and fallback behavior.
- Validate with a packaged app installed under /Applications.

## Open Questions
- Should we maintain a recent-projects list now or in a later change?
