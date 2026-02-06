# Change: Agent Cells session tree + idle display

## Why
Sessions live in a separate column and hide per-cell context; idle feedback is hard to see where sessions live. We want sessions nested under Cells with idle indicators and per-cell creation, while fixing idle refresh noise during attach.

## What Changes
- Move session list into the Agent Cells sidebar as child nodes under each Cell.
- Provide per-cell session creation and detached/closed overflow actions on the Cell node.
- Sort sessions with the active session first, then by most recent activity time.
- Display each session's idle time directly in the session list.
- Ignore attach replay noise within the grace window when updating idle activity.
- Allow collapsing/expanding each Cell's session list.
- Show cached preview + connecting indicator before tmux attach; disable terminal input until attach completes.

## Impact
- Affected specs: `agency-editor` (Session Tabs, Closed Sessions Overflow, session list ordering/idle display).
- Affected code: `AgentCellsSidebar`, `EditorPane`, `useSessions`, `TerminalPane`, `SessionMenus`, `AppLayout`.
