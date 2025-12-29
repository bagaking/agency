# Change: Add Hierarchy navigation and configurable Gates

## Why
The configuration surfaces for Actions and lifecycle Gates are scattered and tightly coupled to the Explorer. We need a single, hierarchy-based entrypoint that matches the inheritance model (Global -> Project -> Agent) and supports flexible, script-driven gates that can evolve with human or AI workflows.

## What Changes
- Add a new Activity Bar entry named "Hierarchy" that hosts configuration for Actions, Gates, and Softlinks.
- Rename the Explorer to "Agent Cells" and retain jump links to Actions/Gates/Softlinks for quick access.
- Introduce configurable Gates with Global/Project/Agent scopes, stored in userData and `.agency` files, and executed as line-by-line shell scripts.
- Define separate Gate sets per lifecycle stage (draft/active/archived) with Active/Archived transitions blocked when their gates fail.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: Activity bar + sidebar navigation, quick actions config UI, worktree links UI, cell lifecycle gate evaluation, IPC/services for gate storage and execution.
