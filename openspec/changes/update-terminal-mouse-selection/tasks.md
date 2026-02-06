## 1. Implementation
- [ ] Review existing terminal mouse/selection handling and document baseline behavior
- [ ] Implement modifier-based selection override with tmux mouse enabled by default
- [ ] Update wheel handling to preserve TUI mouse while supporting modifier-based scrollback
- [ ] Ensure modifier key combos remain consistent with new behavior
- [ ] Update docs/notes-terminal-keyboard.md and any related session notes
- [ ] Update openspec specs and validate

## 2. Verification
- [ ] Manual test: mouse click/scroll works in TUI (tmux mouse on)
- [ ] Manual test: Shift/Alt + drag selects text in terminal and triggers selection action bar
- [ ] Manual test: Shift/Ctrl/Command key combos behave as expected
- [ ] Manual test: selection copy and action bar still function
