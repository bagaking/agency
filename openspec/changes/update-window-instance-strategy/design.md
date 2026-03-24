## Context
Agency already has half of the right model: project root is tracked per window at runtime, and `New Window` starts empty instead of inheriting the last active project. The missing half is the application-instance contract.

Today the product can accidentally look "multi-instance friendly" because there is no explicit single-instance lock. That is misleading. The persisted state layout is still shared under one `userData` tree, and some resources are process-global by nature, especially global shortcuts. In practice, a second isolated process would compete for the same settings files and app-level resources.

This change closes that ambiguity. The product model is not "many isolated desktop apps". The product model is "one desktop app, many independent project windows".

## Goals / Non-Goals
- Goals:
  - Make the default desktop topology explicit: single app instance, multiple windows.
  - Keep each window free to open a different repository without leaking project context across windows.
  - Separate app-global state from window/workspace-local state so persistence matches the chosen topology.
  - Make secondary launches deterministic: route them into the running app and open/focus the right window.
  - Restore the previous multi-window workspace set on relaunch when the app restarts without an explicit target project.
  - Persist and restore per-window geometry so restored windows reopen where the user left them.
  - Replace the native title bar with an app-owned title bar that exposes current project identity and window switching.
- Non-Goals:
  - Do not introduce fully isolated multi-profile support in this change.
  - Do not redesign project selection UX beyond what is needed for instance/window routing and the new title bar entry points.
  - Do not deliver cross-platform-perfect native window controls in this slice; macOS-first behavior is sufficient for v0.2.

## Decisions
- Decision: Default to a single desktop application instance.
  - Rationale: The app already shares one user-data store and app-level resources; making this explicit removes an unsafe pseudo-mode.
- Decision: Model "open another project" as "open another window", not "start another isolated process".
  - Rationale: This preserves shared user-level settings while keeping project context independent.
- Decision: Treat secondary launches as activation messages handled by the running instance.
  - Rationale: This matches the intended UX and avoids duplicated process-global resources.
- Decision: Split persisted state into three scopes.
  - App-global:
    recent projects, global settings, global shortcuts, other intentionally shared user defaults.
  - Window/workspace-local:
    active project root, selected Cell, active session, workbench tabs, active view, layout state, and window geometry that should not bleed across windows.
  - Repo-local:
    `.agency/*` files already owned by the repo/worktree.
  - Rationale: The current single `editor-ui-state.json` shape is too coarse for multi-window persistence.
- Decision: Persist the currently open window-set and use it as the default relaunch restore source.
  - Rationale: Full multi-window restore is the natural complement to window-local project/workspace state.
- Decision: If launch includes an explicit target repository, open only that requested window instead of restoring the saved window set.
  - Rationale: Explicit launch intent should win over passive session restore.
- Decision: Use an app-owned title bar with a draggable shell region and app-icon window switcher.
  - Rationale: Once the product is truly multi-window, the shell must surface project identity and window navigation directly instead of delegating that awareness to the default native title text.
- Decision: Keep isolated `userData` / profile mode as a future explicit opt-in only.
  - Rationale: It is useful as an escape hatch, but it is not the default product topology and should not shape the primary architecture.

## Risks / Trade-offs
- Risk: Adding a single-instance lock without launch payload routing would make secondary launches feel broken.
  - Mitigation: Implement lock and routing in the same slice.
- Risk: Window-scoped UI-state persistence can regress selection/tab restore behavior.
  - Mitigation: Define the state split before refactoring storage writes; verify project switching and tab/session restore manually.
- Risk: Some settings may sit on the wrong side of the boundary.
  - Mitigation: Start with a narrow rule: if a value changes when the user switches project/window focus, it is probably not app-global.
- Risk: Restoring stale geometry can place windows off-screen after monitor changes.
  - Mitigation: Clamp restored bounds against current display work areas before creating the window.
- Risk: A custom title bar can accidentally swallow clicks or drag behavior.
  - Mitigation: Keep the drag region explicit and mark all interactive controls as no-drag.

## Migration Plan
1. Add single-instance lock and secondary-launch routing in Electron main.
2. Introduce an explicit window bootstrap payload so a new window can open empty, restore a saved window state, or open a requested project root.
3. Refactor UI-state persistence from one flat global blob into app-global vs window/workspace-local slices.
4. Persist current open-window ids plus per-window geometry and restore them during normal relaunch.
5. Add an app-owned title bar with project identity and a window switcher backed by window-shell IPC.
6. Add manual and automated verification for multi-window isolation, restore, and shell behavior.

## Open Questions
- Should the title bar eventually own custom minimize/maximize/close controls on non-macOS platforms?
  - Proposed answer for this change: keep native controls where available and ship the macOS-first custom shell first.
