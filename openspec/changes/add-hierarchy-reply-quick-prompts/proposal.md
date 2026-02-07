# Change: Add Hierarchy-configured reply quick prompts

## Why
Reply authoring is now a core workflow in Agent Cells, but users still have to manually type repetitive guidance prompts. We need a reusable prompt list that can be configured in Hierarchy and consumed directly from the Reply composer.

The existing scope system (Global -> Project -> Agent) uses override semantics, which is not ideal for prompt lists. For this feature, users want prompts from all scopes to coexist, with duplicates removed, and the UI must clearly show where each effective prompt comes from.

## What Changes
- Add a new Hierarchy configuration section for Reply Quick Prompts (Global, Project, Agent scopes).
- Add scoped storage for prompt lists and load/save APIs.
- Define resolved prompt behavior as **union + dedupe** (not override).
- Expose a resolved preview in Hierarchy that shows source scope badges for each prompt.
- Add a quick action near the Agent Cells Reply editor input labeled `快捷回复如何`.
- Let users pick a configured prompt from the quick action menu and insert it into the reply editor.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - Hierarchy navigation and settings panels
  - Reply panel UI in Agent Cells
  - Scoped settings services and IPC/preload bridge
  - Docs for reply workflow and Hierarchy configuration
- Risk: Union/dedupe behavior may surprise users accustomed to override semantics; mitigated by explicit UI source badges and docs.
