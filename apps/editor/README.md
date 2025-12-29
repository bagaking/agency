# Agency Editor

## Scope & Stack

- v0.2 targets macOS first while keeping a path open for cross-platform support.
- Electron + React + Tailwind CSS + Rive (animation placeholder).
- Embedded terminal via xterm.js and node-pty.
- Session keepalive uses tmux (required).

## Navigation

- The activity bar includes Agent Cells and Hierarchy entries.
- Agent Cells focuses on Cell management and offers jump links to Actions, Gates, and Softlinks.
- Hierarchy hosts configuration for Actions, Gates, and Softlinks.

## Cell Lifecycle Files

- Each worktree contains `.agency/cell-<worktree-name>.yaml`.
- The editor reads and updates lifecycle state through this file.
- Validation is minimal (temporary) and surfaces warnings only.

## Session Keepalive (tmux)

- tmux is required; session creation is blocked if tmux is missing.
- Each worktree stores a session registry at `.agency/sessions-<worktree-name>.yaml`.
- Each Cell can have multiple sessions; stale sessions are flagged when tmux is missing or detached.
- Sessions render as tabs; the tab close (X) terminates tmux, and Detach is available via the session context menu.
- Detached sessions remain available from the overflow menu, while closed sessions can be restarted.
- Sessions can be renamed from the session context menu.
- On relaunch, the editor restores the last selected Cell and active session.
- The terminal toolbar includes zoom controls and an idle timer.

## Quick Actions

- Quick Actions are configured under Hierarchy -> Actions.
- Each action provides `startCommand` and optional `resumeCommand`.
- Definitions are stored in the editor user data directory as `quick-actions.json` (global scope).
- Project overrides live at `.agency/quick-actions.yaml` and can replace global actions with matching `id`.
- Agent overrides live at `.agency/quick-actions-<worktreeName>.yaml`.
- Actions resolve by scope order: Global -> Project -> Agent.
- Commands can be multi-line scripts executed line-by-line in the active session.

## Gates

- Gates are configured under Hierarchy -> Gates.
- Gate definitions are grouped by stage: `draft`, `active`, and `archived`.
- Global gates live in the editor user data directory as `gates.json`.
- Project gates live at `.agency/gates.yaml` in the repo root.
- Agent gates live at `.agency/gates-<worktreeName>.yaml` in the worktree.
- Gates resolve by scope order: Global -> Project -> Agent, matching by `id`.
- Gate commands run line-by-line shell scripts; failures block transitions to Active/Archived.

## Softlinks (Local Directories)

- Softlink configuration lives at `.agency/worktree-links.yaml` in the repo root.
- Links define `source` (repo root) and `target` (worktree root) paths.
- The editor can link missing directories into a selected Cell with one click.
- Candidate discovery includes ignored or untracked directories.
- Auto-link can be enabled to apply links when new Cells are created.

## Runtime Logs

- Each editor launch writes logs to `logs/runtime/runtime-<timestamp>.log` at the repo root.
- The latest 20 runs stay in `logs/runtime`; older runs move to `logs/runtime/history`.
- Logs chunk automatically when they reach the size limit.

## Branch Naming

- When creating a new Cell, the branch name is generated as `<type>/<cell-name>`.
- Available types: `feat`, `refactor`, `fix`, `lint`, `chore`, `doc`.

## Development

```bash
cd apps/editor
pnpm install
pnpm run dev
```

If the embedded terminal fails on macOS, run:

```bash
pnpm run postinstall
```

## Makefile (from repo root)

```bash
make editor-install
make editor-dev
```

## Environment Flags

- `AGENCY_CLI_COMMAND="codex"` override the CLI command
- `AGENCY_CLI_STUB=1` use the CLI stub script
- `AGENCY_TEST_MODE=1` use stubbed cells/worktrees
- `AGENCY_RUNTIME_LOG_MAX_BYTES=5242880` override runtime log chunk size

## Manual Verification

- Open the editor with tmux installed, create a session, restart the editor, and confirm the session reattaches.
- Remove or stop a tmux session, refresh sessions, and verify the session shows as stale.
- Close a session, verify it appears under the overflow menu, and reopen it to create a new session.
- Add a quick action with both commands and verify start/resume run in the active session.
- Switch to Project or Agent actions, confirm inherited actions are read-only, and verify Override/Reset behavior.
- Open Hierarchy -> Gates, add a failing gate command for Active, and confirm the Active transition is blocked until the gate passes.
- From Agent Cells, use the jump links to open Actions, Gates, and Softlinks views.
- Run a start action and verify a new session is created and selected before the command runs.
- Launch a TUI tool (e.g., `codex`), resize the window, and confirm the terminal does not switch to 1-column output.
- Confirm a new log file appears under `logs/runtime` and resize warnings are logged when applicable.
- Rename a session from the context menu and confirm the tab label updates after refresh.
- Detach a session from the context menu and confirm it appears under Detached Sessions.
- Zoom in/out/reset and verify the terminal font size changes and content reflows.
- Leave the terminal idle and confirm the idle timer increments and resets on activity.

## UI Testing (Playwright)

```bash
cd apps/editor
pnpm dlx playwright install
pnpm run test:e2e
```

To create/update visual baselines:

```bash
pnpm dlx playwright test --update-snapshots
```
