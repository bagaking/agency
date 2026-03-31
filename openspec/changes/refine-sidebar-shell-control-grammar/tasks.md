## 1. Shell Control Unification

- [x] 1.1 Move docked-left-sidebar collapse/expand to one shared shell-level control.
- [x] 1.2 Keep `SidebarDock` responsible for resize only.
- [x] 1.3 Add focused tests for the new ActivityBar-owned toggle contract.

## 2. Side-Surface Header Craft

- [x] 2.1 Tighten Explorer header grammar so the current root/context stays legible without redundant title text.
- [x] 2.2 Tighten Memo sidebar header grammar so it shows state summary without verbose subtitle copy.
- [x] 2.3 Add focused tests for the refined header grammar.

## 3. Spec And Docs

- [x] 3.1 Update current spec with the shared sidebar-control contract and compact side-surface header requirement.
- [x] 3.2 Update README and related notes to record the new shell ownership and header-density boundary.

## 4. Validation

- [x] 4.1 Run targeted renderer tests for ActivityBar, Explorer header, and Memo sidebar.
- [x] 4.2 Run renderer typecheck.
