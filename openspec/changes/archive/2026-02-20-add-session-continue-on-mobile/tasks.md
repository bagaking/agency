## 1. Implementation
- [x] 1.1 Add session continuation backend service that resolves tmux session identity, SSH host/port, and command payload.
- [x] 1.2 Add IPC handler + preload + renderer bridge method for session mobile continuation preparation.
- [x] 1.3 Add Agent Cells session context-menu action "Continue on Mobile" and wire app-level handler.
- [x] 1.4 Copy generated command to clipboard and show success/warning notices based on readiness.
- [x] 1.5 Keep session lifecycle errors/messages consistent when continuation preconditions fail (missing session/stale/tmux unavailable).

## 2. Documentation & Validation
- [x] 2.1 Update `docs/notes-session-management.md` with the mobile continuation workflow and readiness semantics.
- [x] 2.2 Update `docs/notes-reusable-items-coding.md` for the new reusable mechanism.
- [x] 2.3 Run validation (`openspec validate add-session-continue-on-mobile --strict`, renderer/electron typecheck) and mark tasks complete.
