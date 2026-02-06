## Context
Session names are currently manual or generic, and terminal text selection clears on mouse release. Users need a configurable auto-naming rule and reliable selection with quick actions (copy/send) to move content between sessions.

## Goals / Non-Goals
- Goals:
  - Provide auto-naming rules with placeholders for time, numbering, context, and name lists.
  - Resolve naming rules by Global -> Project -> Agent scope, with a deterministic fallback.
  - Keep terminal selection after mouse release and enable Cmd+C copy when a selection exists.
  - Show a small floating action bar for Copy and Send-to-Session.
- Non-Goals:
  - Changing existing manual rename flows.
  - Introducing cross-project global session registries.
  - Rewriting terminal input/selection beyond needed fixes.

## Decisions
- Decision: Add a new Session Naming settings file with the same scope pattern as Terminus/App Shortcuts.
  - Global: user data `session-naming.json`
  - Project: `.agency/session-naming.yaml`
  - Agent: `.agency/session-naming-<worktreeName>.yaml`
  - Rationale: matches existing scope resolution and keeps naming logic separate from terminal shortcuts.

- Decision: Use a lightweight template syntax with placeholders.
  - Example: `"Session {seq:absolute:02} · {time:HHmmss}"`
  - Supported placeholders:
    - `{time:FORMAT}` / `{date:FORMAT}` with `YYYY MM DD HH mm ss` tokens.
    - `{seq:absolute}` `{seq:active}` `{seq:cell}` `{seq:profile}` with optional padding like `:02`.
    - `{name:<list>}` or `{name:<list>:<seqScope>}` (e.g. `{name:myth:absolute}`) for list-indexed names.
    - `{cell}` `{profile}` `{project}` `{branch}` `{user}`.
  - Rationale: expressive enough for common patterns; minimal parsing needed.

- Decision: Sequence scopes are computed per Cell (worktree registry).
  - `absolute`: total sessions in the Cell registry (all statuses) + 1.
  - `active`: sessions in the Cell registry with status `active` or `detached` + 1.
  - `cell`: alias of `absolute` (kept for clarity); `profile` counts per active profile.
  - Rationale: avoids cross-cell global state and keeps creation deterministic.

- Decision: Built-in name lists with optional custom lists in settings.
  - Built-ins: `myth`, `constellation`, `animals` (extendable later).
  - Custom lists stored under `nameLists` in settings.
  - Name selection uses the chosen seq scope index with wraparound.

- Decision: Selection action bar appears only when a non-empty selection exists.
  - Actions: Copy, Send (default to active session, with a picker for other sessions).
  - Send uses raw text (normalized line endings) without auto-enter by default.

## Proposed Schema (Session Naming Settings)
```yaml
rule: "Session {seq:absolute:02} · {time:HHmm}"
nameLists:
  myth: ["Athena", "Apollo", "Artemis", "Hera"]
  custom: ["Alpha", "Beta", "Gamma"]
``` 

## Risks / Trade-offs
- Risk: Users interpret "absolute" as cross-project.
  - Mitigation: document that numbering is per Cell registry.
- Risk: Floating actions clutter the terminal UI.
  - Mitigation: only show on selection and hide on blur or Escape.

## Migration Plan
- On first run after change, if no session-naming config exists, write defaults at Global scope.
- Existing sessions remain unchanged; new sessions use auto-naming unless a name is explicitly provided.

## Open Questions
- Should `absolute` optionally include sessions across all Cells in a project (opt-in)?
- Should Send-to-Session support “append Enter” as a toggle?
