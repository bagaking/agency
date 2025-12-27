## Context
Sessions are listed vertically within the editor, taking vertical space and making the active session harder to scan.
Closed sessions should be available but not occupy the main list.

## Goals / Non-Goals
- Goals:
  - Render sessions as horizontal tabs aligned with the terminal header
  - Provide an overflow menu for closed sessions
  - Keep selection and close behavior consistent
- Non-Goals:
  - Change tmux behavior or session lifecycle rules
  - Add new session states

## Decisions
- Layout: session list becomes a row of tabs; active tab is highlighted
- Closed sessions: removed from the tab row and surfaced under a three-dot menu
- Actions:
  - Click tab to select
  - Close icon on active/hovered tabs
  - Closed menu item supports restore/select

## Risks / Trade-offs
- Tabs can overflow; keep overflow menu for closed sessions and consider horizontal scroll if needed
