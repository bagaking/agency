## 1. Spec And Design
- [ ] 1.1 Add spec deltas for single-instance multi-window behavior and state-scope ownership.
- [ ] 1.2 Update the design index so the new window-instance strategy is discoverable as an active design source.

## 2. Main-Process Topology
- [ ] 2.1 Add a single-instance lock and route secondary launches back to the running app instance.
- [ ] 2.2 Define how a routed launch request opens a new empty window versus a new window bound to a requested project path.
- [ ] 2.3 Ensure menu-driven `New Window` and OS/CLI secondary launch requests follow the same window-creation path.

## 3. State Model Refactor
- [ ] 3.1 Split persisted UI state into app-global and window/workspace-local scopes.
- [ ] 3.2 Stop treating `projectRoot`, selection state, and workbench/session state as one globally shared blob.
- [ ] 3.3 Keep recent projects and user-level settings shared across windows.

## 4. Validation
- [ ] 4.1 Verify that opening a second project uses a new window in the existing app instance.
- [ ] 4.2 Verify that switching project in one window does not change Cells/Explorer/workbench state in another window.
- [ ] 4.3 Verify that recent projects stay shared while active project context stays window-local.
- [ ] 4.4 Verify that app-level shortcuts still dispatch to the focused window only.
