## Context
Shift+Enter currently collapses to plain Enter in the embedded terminal, which strips modifier intent from CLI input. The terminal stack uses `xterm@5.3.0`, which does not differentiate Shift+Enter in its default keyboard mapping. We need to preserve modifier-aware input without breaking existing workflows.

## Goals / Non-Goals
- Goals:
  - Preserve modifier-aware key sequences for CLI input when supported by the terminal.
  - Upgrade to the maintained xterm package and preserve modifier-aware sequences with a focused handler.
  - Keep shell-first behavior and existing Terminus quick actions intact.
  - Document verification results and lessons learned.
- Non-Goals:
  - Redesign CLI UX or introduce a custom multi-line editor.
  - Change default workflow semantics (shell-first, manual CLI start).

## Decisions
- Decision: Upgrade dependency from `xterm` to `@xterm/xterm` and align CSS imports.
  - Why: `xterm` is deprecated; modern xterm releases expose improved keyboard handling.
- Decision: Add a custom key event handler to emit bracketed-paste newline when enabled, falling back to CSI-u (`\x1b[13;2u`) for Shift+Enter when no shortcut binding matches.
  - Why: bracketed paste is widely supported by line editors and matches VS Code behavior; CSI-u remains the fallback when bracketed paste is unavailable.
- Decision: Add verification steps across at least two CLI tools to ensure modifier sequences are preserved and no regressions in shortcuts.

## Alternatives Considered
- Enable extended keyboard reporting via xterm API (for example, modifyOtherKeys/CSI-u support).
  - Deferred: no stable API surfaced in the current xterm version, so we keep the custom handler for now.
- Keep current xterm and only adjust Action Sheet/dispatch normalization.
  - Rejected: does not fix direct keyboard input loss.

## Risks / Trade-offs
- CSI-u sequences may be unrecognized by some CLIs.
  - Mitigation: prefer bracketed-paste newline when enabled, scope the fallback to Shift+Enter only, and keep shortcuts as higher priority.
- Upgrading xterm may change rendering or shortcut behavior.
  - Mitigation: manual regression checks for terminal input, paste, and shortcut bindings.

## Migration Plan
1. Upgrade dependency and update imports.
2. Add a custom Shift+Enter handler that emits CSI-u when no shortcut binding matches.
3. Validate Shift+Enter and modifier keys with CLI tools.
4. Record verification outcomes in the experience note.
5. Update xterm skill documentation.

## Open Questions
- If xterm exposes a stable extended-key API in a future upgrade, should we switch from the custom handler?
- Do any target CLIs require explicit configuration to accept CSI-u sequences?
