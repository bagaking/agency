## Context
Actions, gates, and worktree link settings currently surface in multiple UI entry points, making scope inheritance harder to understand. Gate execution also needs a clear, consistent contract for how commands are run across scopes.

## Goals / Non-Goals
- Goals:
  - Provide a single Hierarchy entry point that matches Global -> Project -> Agent configuration scope.
  - Standardize gate storage and execution semantics so teams can reason about lifecycle checks.
  - Keep configuration files human-editable and diff-friendly.
- Non-Goals:
  - Building a policy engine or sandbox; gates remain user-authored shell commands.
  - Replacing existing quick actions or worktree link capabilities.

## Decisions
- Decision: Keep "Softlinks" as the UI label for worktree link configuration.
  - Rationale: Matches the intended UX language while still referencing worktree links in help text.
- Decision: Store gate definitions as YAML at every scope.
  - Rationale: Agent tooling maintainers focused on DX and operational clarity prefer YAML for readability, consistency with `.agency` files, and merge-friendly diffs.
  - Paths:
    - Global: user data directory `gates.yaml`
    - Project: `.agency/gates.yaml`
    - Agent: `.agency/gates-<worktree-name>.yaml`
- Decision: Define explicit gate execution semantics.
  - Each non-empty, non-comment line executes via `/bin/zsh -lc` in repo root.
  - Evaluation stops on the first non-zero exit status.
  - Context is passed via environment variables (cell name, worktree path, target lifecycle state).

## Risks / Trade-offs
- Shell execution risk: Gate scripts can run arbitrary commands.
  - Mitigation: keep explicit confirmation UI, surface outputs, document recommended safe defaults.
- Cross-platform behavior: `/bin/zsh` is macOS-centric.
  - Mitigation: keep gate execution isolated in a service for future platform adapters.

## Migration Plan
- Update UI labels and navigation to expose Hierarchy entry.
- Add gate storage read/write paths for YAML files.
- Backfill default gates to match existing lifecycle expectations.

## Open Questions
- Should we allow a per-project default shell override in the future?
