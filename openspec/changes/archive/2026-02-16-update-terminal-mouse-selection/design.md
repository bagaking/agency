# Design: Terminal Mouse + Selection + Modifiers

## Summary
Enable tmux mouse by default to preserve TUI interaction and scrolling, while providing a modifier-based selection override that temporarily disables mouse reporting during drag selection. This mirrors xterm/tmux/VSCode conventions and allows selection without sacrificing mouse support.

## Behavior Model
- Default: tmux mouse enabled for interactive sessions.
- Selection override: holding a modifier (Shift/Alt) during drag temporarily disables tmux mouse for that session, enabling xterm selection.
- Re-enable tmux mouse once selection completes or is cleared.
- Wheel: if mouse reporting is enabled, pass events through by default; Alt+wheel scrolls local scrollback.

## Implementation Notes
- Renderer should call `setSessionMouse({ enabled: true })` on attach.
- Add selection override logic in `TerminalPane.jsx` using mouse down/up tracking.
- Keep selection action bar driven by xterm selection events.
- Ensure keyboard interception respects Terminus settings and remains consistent.

## Risks
- Toggling tmux mouse has latency; mitigate by only toggling on selection start/end.
- Apps that rely on mouse reporting may briefly lose input during selection (acceptable while selecting).
