# Findings & Decisions

## Requirements
- Mouse interaction should work normally in terminal (click/scroll/TUI interaction).
- Modifier key combos (Shift/Ctrl/Command) should behave correctly.
- Selection of text region should be possible.
- Behavior should be “simultaneously successful” rather than a tradeoff, even if breaking change.
- Align with VSCode terminal behavior if possible; update docs to make requirements explicit.

## Research Findings
- tmux mouse reporting is mutually exclusive with terminal selection unless overridden; Shift can temporarily bypass mouse reporting in terminal mouse mode. (tmux FAQ + xterm man page)
- xterm (and terminals following it) allow forcing selection by holding Shift while mouse reporting is active. (xterm man page)
- VSCode terminal documentation describes mouse interaction and selection behaviors, including modifier-based selection. (VSCode terminal docs)
- With tmux mouse enabled, drag selection happens in tmux copy mode and is stored in tmux's internal buffer by default; it does not automatically integrate with the host clipboard or custom UI selection actions without extra plumbing.
- xterm.js is the terminal engine used by VS Code; it supports mouse events and is the place where selection vs mouse reporting is decided in the client. (xterm.js repo)

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Propose a model where tmux mouse is enabled by default and selection is forced via a modifier (e.g., Shift/Alt) | Matches tmux/xterm conventions and VSCode behavior while preserving TUI mouse interaction |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- https://github.com/tmux/tmux/wiki/FAQ
- https://invisible-island.net/xterm/xterm.faq.html
- https://code.visualstudio.com/docs/terminal/advanced
- https://unix.stackexchange.com/questions/332419/tmux-mouse-mode-on-does-not-allow-to-select-text-with-mouse
- https://xterm.dev/manpage-xterm/
- https://github.com/xtermjs/xterm.js

## Visual/Browser Findings
- tmux FAQ and xterm FAQ explicitly mention Shift as a selection override when mouse reporting is enabled.
- VSCode terminal docs highlight modifier-based selection behaviors for mouse reporting scenarios.
