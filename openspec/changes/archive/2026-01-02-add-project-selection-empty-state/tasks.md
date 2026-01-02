## 1. Project selection empty state
- [x] 1.1 Persist selected project root in local app storage (userData) and restore on launch
- [x] 1.2 Default to Explorer view when no project is configured
- [x] 1.3 Add empty-state UI with project picker action
- [x] 1.4 Agent Cells view shows placeholder and only allows default terminal until a project is chosen

## 2. Packaged UI diagnostics
- [x] 2.1 Ensure packaged builds always load local renderer assets (no dev server dependency)
- [x] 2.2 Add startup diagnostics and renderer load failure logging to runtime logs
- [x] 2.3 Verify packaged app in /Applications shows UI without a project configured

## 3. Tests & docs
- [x] 3.1 Add E2E coverage for empty state + project selection
- [x] 3.2 Update README/specs with new empty-state behavior
