## Context
Terminal input is currently intercepted unconditionally, which breaks native CLI behavior (e.g., Shift+Enter) and scroll behavior in TUI apps. We need a configuration-driven shortcut system with safe defaults.

## Goals / Non-Goals
- Goals:
  - Default to zero keyboard interception.
  - Provide explicit, scope-aware shortcut bindings in Terminus settings.
  - Keep a baseline "plain shell" profile visible and non-deletable.
  - Centralize shortcut dispatch so future "send keys" automation is safe and consistent.
- Non-Goals:
  - Backward compatibility with existing quick actions or legacy shortcut behavior.
  - Adding new CLI tools or changing the CLI launch flow.

## Decisions
- Decision: Add new Terminus settings storage.
  - Global: user data `terminus-settings.json`.
  - Project: `.agency/terminus-settings.yaml`.
  - Agent: `.agency/terminus-settings-<worktreeName>.yaml`.
  - Rationale: matches existing scope patterns while keeping a clean break from quick actions.

- Decision: Default bindings are empty.
  - Rationale: prevents implicit interception; restores native terminal behavior unless explicitly configured.

- Decision: Baseline terminal profile is mandatory.
  - Rationale: ensures non-CLI shell remains a first-class, configurable entry and is always present.

- Decision: Introduce an input-action dispatcher.
  - Rationale: separates shortcut matching from terminal write semantics and allows future automation (send key sequences, paste modes) without per-call ad hoc logic.

## Proposed Schema (Terminus Settings)

```yaml
profiles:
  - id: shell
    label: Shell
    type: shell
    locked: true
shortcuts:
  bindings: []
```

Notes:
- `profiles` are ordered for display.
- `locked: true` prevents deletion of the baseline shell profile.
- `shortcuts.bindings` is empty by default; bindings are merged by id using Global -> Project -> Agent.

## Shortcut Dispatch Model
- Match shortcuts only when bindings are explicitly configured.
- Dispatch through a single terminal input dispatcher:
  - `sendText` (raw text)
  - `sendKeys` (explicit key sequences)
  - `pasteFiles` (safe path quoting)

## Risks / Trade-offs
- Risk: Users expect legacy shortcuts to still work.
  - Mitigation: Provide clear UI empty-state messaging and a quick-add shortcut template.

- Risk: TUI apps in alternate buffer need scroll passthrough.
  - Mitigation: Detect alternate buffer and skip scroll interception unless configured.

## Migration Plan
- On first run after change, write default terminus-settings if none exists.
- No attempt to migrate old quick-action data.

## Open Questions
- Exact key encoding for `sendKeys` (CSIu vs application-defined sequences).
- Whether baseline profile should also expose default session options (font size, theme) in this change.
