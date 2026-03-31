## Context
Agency uses the canonical object model `App -> Window -> Project -> Cell -> Session -> Run`.

The no-project state exists before `Project`, so any affordance shown there must remain window-owned. The current synthetic `local-terminal` Cell violates that rule and causes both technical and UX drift.

## Goals / Non-Goals
- Goals:
  - keep no-project windows out of Cell/session-owned storage and IPC contracts;
  - provide a usable shell entry point before a project is selected;
  - unify the empty-project UX into one coherent home experience with strong craft and clear primary actions;
  - reuse existing infrastructure where it preserves the canonical boundary.
- Non-Goals:
  - turning the home shell into a persistent project/session registry;
  - adding tmux/session-map/reply semantics to no-project windows;
  - creating a second general-purpose shell framework for in-project Cells.

## Decisions
- Decision: no-project shell is `window-owned`, not `cell-owned`.
  - Why:
    - there is no `Project` or `Cell` yet;
    - the shell cwd should be the user home directory, not a repo-owned worktree;
    - session registries under `.agency/cells/**` must remain project-owned SSOT.

- Decision: keep the default no-project bootstrap view aligned with existing spec (`Explorer` default), but render a shared `Project Home` experience in that state.
  - Why:
    - this preserves existing bootstrap and tests;
    - users still get a strong project-first home surface;
    - we avoid inventing a competing top-level view just for empty windows.

- Decision: recent projects become the primary central content, not a side-note below placeholder copy.
  - Why:
    - first-principles primary action in a no-project window is to re-enter a project quickly;
    - recent repositories are the highest-value recoverability surface already present in the product.

- Decision: the home shell is explicitly secondary.
  - Why:
    - it is useful for quick scratch work and environment inspection;
    - but the product should still bias toward selecting a project, not hiding that behind a terminal-first black screen.

## Architecture
### Host Side
- Add a dedicated service for the window-owned home shell keyed by `windowStateId`.
- The service owns PTY lifecycle and cleanup on window close.
- IPC stays separate from session terminal channels to keep provenance and contracts explicit.

### Renderer Side
- Add a dedicated home-shell bridge and xterm pane.
- Keep Cell/session terminal runtime untouched for project-backed sessions.
- Introduce shared Project Home components for:
  - sidebar controls,
  - recent-project card grid,
  - home-shell dock state.

## Risks / Trade-offs
- Separate terminal channels add some duplication.
  - Mitigation: share small renderer primitives where safe, but do not erase ownership boundaries for DRY alone.
- Keeping Explorer as the default empty-project view may feel conservative.
  - Mitigation: make the Project Home content strong enough that the view name matters less than the operational clarity.
- Rich visual treatment can drift into decorative marketing.
  - Mitigation: every visual block must explain current state, primary action, or available recovery path.

## Migration Plan
1. Land guardrails first so empty windows stop failing immediately.
2. Add the window-owned home shell seam.
3. Replace no-project surfaces with Project Home components.
4. Update specs/docs/tests after behavior stabilizes.

## Open Questions
- None blocking for implementation.
