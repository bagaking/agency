# Change: Update terminal mouse/selection/shortcut behavior

## Why
Users need terminal mouse interaction, modifier key combos, and text selection to all work simultaneously. The current behavior disables tmux mouse to preserve selection, which forces a tradeoff and deviates from VSCode-style terminal ergonomics.

## What Changes
- **BREAKING**: Enable tmux mouse by default for interactive sessions instead of forcing it off in the renderer.
- Introduce a modifier-based “force selection” path (e.g., Shift or Alt) that temporarily disables mouse reporting while selecting.
- Align terminal selection/scroll behavior with VSCode conventions (mouse works by default; modifier forces selection/scrollback).
- Update terminal keyboard interception rules to keep modifier combos consistent and configurable.
- Update docs to explicitly state the “simultaneous success” goal and required modifier behavior.

## Impact
- Affected specs: `agency-editor`
- Affected code: terminal renderer input handling, session mouse toggling, docs/notes-terminal-keyboard.md
- Risk: behavior change for users who relied on mouse-off selection; mitigated by explicit modifier-based selection rule.
