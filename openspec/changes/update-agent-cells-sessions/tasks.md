## 1. Implementation
- [x] 1.1 Render per-cell session lists in Agent Cells sidebar (nested under each Cell).
- [x] 1.2 Move session create + detached/closed overflow actions to the Cell node.
- [x] 1.3 Remove the standalone sessions column from the editor pane.
- [x] 1.4 Preserve registry session order in the Agent Cells list (no extra sorting).
- [x] 1.5 Display idle time in each session list item.
- [x] 1.6 Ignore attach replay noise within the grace window when updating idle activity.
- [x] 1.7 Add collapse/expand toggles for per-cell session lists.
- [x] 1.8 Show cached preview + connecting overlay before attach and disable input until attach completes.
- [x] 1.9 Poll detached sessions to refresh idle activity when new output arrives.
- [x] 1.10 Gate idle updates on output diff instead of list refresh.
- [x] 1.11 Fade avatar activity ring from active to inactive based on idle time.
- [x] 1.12 Extract unified avatar badge component and replace direct avatar renders.

## 2. Validation
- [x] 2.1 Code: Agent Cells sidebar shows sessions nested under each Cell; active session highlighted. (code-confirmed)
- [x] 2.2 Code: Create session + detached/closed overflow actions exist on each Cell node. (code-confirmed)
- [x] 2.3 Code: Session list order matches registry (no extra sorting). (code-confirmed)
- [x] 2.4 Code: Session list items display idle duration. (code-confirmed)
- [x] 2.5 Code: Attach replay output does not reset idle within the grace window. (code-confirmed)
- [x] 2.6 Code: Sessions can be collapsed/expanded per Cell. (code-confirmed)
- [x] 2.7 Code: Terminal shows cached preview + connecting overlay before attach; input disabled until attach. (code-confirmed)
- [x] 2.8 Code: Detached sessions refresh idle from tmux activity on interval. (code-confirmed)
- [x] 2.9 Code: Session refresh does not reset idle unless output diff is detected. (code-confirmed)
- [x] 2.10 Code: Avatar activity ring fades with idle and is fully inactive at 15 minutes. (code-confirmed)
- [x] 2.11 Code: All avatar renders use the shared AgentAvatarBadge component. (code-confirmed)
