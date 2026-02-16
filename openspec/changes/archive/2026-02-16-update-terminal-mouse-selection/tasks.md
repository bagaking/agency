## 1. Implementation
- [x] Review existing terminal mouse/selection handling and document baseline behavior
- [x] Implement modifier-based selection override with tmux mouse enabled by default
- [x] Update wheel handling to preserve TUI mouse while supporting modifier-based scrollback
- [x] Ensure modifier key combos remain consistent with new behavior
- [x] Update docs/notes-terminal-keyboard.md and any related session notes
- [x] Update openspec specs and validate

## 2. Verification
- [x] Manual test: mouse click/scroll works in TUI (tmux mouse on)
- [x] Manual test: Shift/Alt + drag selects text in terminal and triggers selection action bar
- [x] Manual test: Shift/Ctrl/Command key combos behave as expected
- [x] Manual test: selection copy and action bar still function
