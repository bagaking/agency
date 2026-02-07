## Context
Reply creation in Agent Cells now supports high-frequency capture and routing, but reusable prompt snippets are missing. Users need a configurable prompt list, scoped by Global/Project/Agent, without losing prompts through override behavior.

## Goals
- Provide scoped configuration for reply quick prompts in Hierarchy.
- Resolve prompts with **union + dedupe** semantics.
- Surface dedupe/source details in UI to make resolution transparent.
- Provide fast insertion entrypoint near Reply input (`快捷回复如何`).

## Non-Goals
- Full prompt-template language (variables/macros).
- Cross-project shared cloud sync.
- Changing existing override semantics for unrelated settings.

## Data Model
Suggested prompt item shape:

```yaml
- text: "Summarize this in three bullet points."
  title: "3-bullet summary" # optional
  enabled: true              # optional, default true
```

Resolution uses normalized `text` as dedupe key:
- trim surrounding whitespace
- collapse internal CRLF/LF normalization
- keep case-sensitive content as-is

## Resolution Algorithm
1. Load scope lists in order: Global, Project, Agent.
2. Iterate prompts in that order.
3. For each prompt:
   - skip if `enabled === false` or normalized text empty
   - if key not seen: add to resolved list and set `sources=[scope]`
   - if key already exists: append current scope into `sources` if missing
4. Keep first occurrence content as canonical display text.

Result includes:
- `resolvedPrompts[]` (ordered)
- each item has `sources` for UI badges (e.g., `Global+Project`)

## UI Notes
- Hierarchy:
  - New section: Reply Quick Prompts
  - Scope selector remains Global/Project/Agent
  - In addition to editable scoped list, render resolved preview list with source badges.
- Agent Cells Reply panel:
  - Show `快捷回复如何` action near editor input controls.
  - Clicking opens prompt menu from resolved list.
  - Selecting a prompt inserts text at cursor and keeps editor focused.

## Edge Cases
- Empty scoped lists: resolved list may still exist from other scopes.
- All duplicates: one resolved item with multi-scope source badges.
- Same text with different title: first encountered title is canonical; later scopes still appear in source badges.
- Project/Agent scope without selected Cell: read-only/disabled behavior should follow existing scoped config conventions.
