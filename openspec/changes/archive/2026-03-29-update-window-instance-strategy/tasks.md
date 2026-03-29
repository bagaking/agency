## 1. Spec And Design
- [x] 1.1 Add spec deltas for single-instance multi-window behavior and state-scope ownership.
- [x] 1.2 Update the design index so the new window-instance strategy is discoverable as an active design source.
- [x] 1.3 Expand the change scope to cover relaunch restore, geometry persistence, and custom window title bar behavior.

## 2. Main-Process Topology
- [x] 2.1 Add a single-instance lock and route secondary launches back to the running app instance.
- [x] 2.2 Define how a routed launch request opens a new empty window versus a new window bound to a requested project path.
- [x] 2.3 Ensure menu-driven `New Window` and OS/CLI secondary launch requests follow the same window-creation path.
- [x] 2.4 Persist and restore the last open window set during normal relaunch.
- [x] 2.5 Persist and restore per-window geometry, including visible-bounds clamping.
- [x] 2.6 Restore native/default macOS Dock menu behavior and make Dock activation focus/cycle editor windows.

## 3. State Model Refactor
- [x] 3.1 Split persisted UI state into app-global and window/workspace-local scopes.
- [x] 3.2 Stop treating `projectRoot`, selection state, and workbench/session state as one globally shared blob.
- [x] 3.3 Keep recent projects and user-level settings shared across windows.
- [x] 3.4 Track restorable open-window ids separately from per-window workspace snapshots.

## 4. Custom Window Chrome
- [x] 4.1 Replace the native title bar with an app-owned title bar for the desktop editor shell.
- [x] 4.2 Show the active project's display name in the custom title bar.
- [x] 4.3 Add a title-bar app menu for open-window switching and new-window creation.

## 5. Validation
- [x] 5.1 Verify that opening a second project uses a new window in the existing app instance.
- [x] 5.2 Verify that switching project in one window does not change Cells/Explorer/workbench state in another window.
- [x] 5.3 Verify that recent projects stay shared while active project context stays window-local.
- [x] 5.4 Verify that app-level shortcuts still dispatch to the focused window only.
- [x] 5.5 Verify that relaunch restores multiple windows with their prior project/workspace state.
- [x] 5.6 Verify that restored windows reopen with persisted geometry.
- [x] 5.7 Verify that the custom title bar shows the current project name and can switch/focus other windows.
- [x] 5.8 Run automated verification (`typecheck`, unit tests, renderer build, electron build`) for the window-shell changes.
- [x] 5.9 Verify that macOS Dock activation restores a window when the app has open editor windows but no focused one.
- [x] 5.10 Verify that repeated macOS Dock activation cycles open editor windows in the expected stable order.
