## 1. Spec And Design
- [x] 1.1 Add spec deltas for single-instance multi-window behavior and state-scope ownership.
- [x] 1.2 Update the design index so the new window-instance strategy is discoverable as an active design source.

## 2. Main-Process Topology
- [x] 2.1 Add a single-instance lock and route secondary launches back to the running app instance.
- [x] 2.2 Define how a routed launch request opens a new empty window versus a new window bound to a requested project path.
- [x] 2.3 Ensure menu-driven `New Window` and OS/CLI secondary launch requests follow the same window-creation path.

## 3. State Model Refactor
- [x] 3.1 Split persisted UI state into app-global and window/workspace-local scopes.
- [x] 3.2 Stop treating `projectRoot`, selection state, and workbench/session state as one globally shared blob.
- [x] 3.3 Keep recent projects and user-level settings shared across windows.

## 4. Validation
- [ ] 4.1 Verify that opening a second project uses a new window in the existing app instance.
- [ ] 4.2 Verify that switching project in one window does not change Cells/Explorer/workbench state in another window.
- [x] 4.3 Verify that recent projects stay shared while active project context stays window-local.
- [ ] 4.4 Verify that app-level shortcuts still dispatch to the focused window only.
