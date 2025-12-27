## Context
Actions configuration lives outside Explorer and uses a scope selector inside the panel, which hides scope boundaries and inheritance.
We need to move scope entry points into Explorer and make defaults and overrides explicit.

## Goals / Non-Goals
- Goals:
  - List Global / Project / Agent actions entries in Explorer
  - Make inheritance and overrides explicit (Global -> Project -> Agent)
  - Make it obvious whether a scope has local configuration
- Non-Goals:
  - Introduce a new permission or access model
  - Auto-sync actions across worktrees

## Decisions
- Navigation: Explorer includes an Actions group with Global / Project / Agent entries. The Agent entry uses the selected Cell.
- Scope storage:
  - Global: editor userData file quick-actions.json
  - Project: .agency/quick-actions.yaml
  - Agent: .agency/quick-actions-{worktreeName}.yaml
- Merge order: Global -> Project -> Agent, same id means override.
- View behavior:
  - Global is editable and shows if downstream overrides exist.
  - Project/Agent show inheritance vs overrides; inherited rows are read-only until Override.
  - Local overrides can Reset back to the parent scope.
- Execution: start actions create a new session, focus it, then run the start command.

## Risks / Trade-offs
- Multi-scope configuration adds complexity, but makes inheritance visible and controlled.
- Agent files add local metadata that needs clear naming conventions.
