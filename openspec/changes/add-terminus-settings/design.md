## Context
Terminal input is currently intercepted unconditionally, which breaks native CLI behavior (e.g., Shift+Enter) and scroll behavior in TUI apps. We need a configuration-driven shortcut system with safe defaults. The existing shortcut UX also mixes app-level actions and terminal input actions, so scope is unclear.

## Goals / Non-Goals
- Goals:
  - Default to zero terminal interception.
  - Separate App Shortcuts (application actions) from Terminus shortcuts (terminal input actions).
  - App Shortcuts use Global/Project/Agent scopes and a VSCode-style layout: action list left, config right, no "Add".
  - Terminus shortcuts are scoped to Terminus profiles and only apply to the active profile.
  - Keep a baseline "plain shell" profile visible and non-deletable.
  - Centralize shortcut dispatch so "send keys" automation is safe and consistent.
- Non-Goals:
  - Backward compatibility with legacy shortcut behavior.
  - Adding new CLI tools or changing the CLI launch flow.

## Decisions
- Decision: Add new App Shortcuts settings storage.
  - Global: user data `app-shortcuts.json`.
  - Project: `.agency/app-shortcuts.yaml`.
  - Agent: `.agency/app-shortcuts-<worktreeName>.yaml`.
  - Rationale: mirrors existing scope patterns and keeps app-level actions separate from terminal input.

- Decision: Keep Terminus settings storage but move shortcuts under profiles.
  - Global: user data `terminus-settings.json`.
  - Project: `.agency/terminus-settings.yaml`.
  - Agent: `.agency/terminus-settings-<worktreeName>.yaml`.
  - Rationale: Terminal shortcuts should be profile-specific so users can tune different terminal behaviors.

- Decision: Default terminal bindings are empty.
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
- `shortcuts.bindings` is empty by default.

## Proposed Schema (App Shortcuts)

```yaml
actions:
  - id: capture.screenshot
    enabled: true
    shortcut: Cmd+Shift+4
  - id: memo.voice
    enabled: true
    shortcut: Cmd+Shift+V
```

Notes:
- `actions` is a fixed list; users configure each action instead of creating new ones.
- Actions resolve by Global -> Project -> Agent with id-based overrides.

## Shortcut Dispatch Model
- App Shortcuts dispatch application actions (non-terminal).
- Terminus shortcuts dispatch terminal input actions for the active profile only:
  - `sendText` (raw text)
  - `sendKeys` (explicit key sequences)
  - `pasteFiles` (safe path quoting)

## Risks / Trade-offs
- Risk: Users expect legacy shortcuts to still work.
  - Mitigation: Clear UI messaging and defaults with no bindings.
- Risk: Profile-specific shortcuts add configuration overhead.
  - Mitigation: Keep baseline profile simple and surface scope clearly.

## Migration Plan
- On first run after change, write default app-shortcuts and terminus-settings if none exists.
- No migration of existing shortcuts (explicitly opt-out).

## Open Questions
- Final action list for App Shortcuts (screenshot, quick voice, etc.).
- Exact key encoding for `sendKeys` (CSIu vs application-defined sequences).
- Whether baseline profile should expose additional defaults (font size, theme) in this change.
