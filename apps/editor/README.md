# Agency

## Scope & Stack

- v0.2 targets macOS first while keeping a path open for cross-platform support.
- Agency uses a single desktop app instance with multiple independent editor windows.
- Electron + React + Tailwind CSS + Rive (animation placeholder).
- Embedded terminal via xterm.js and node-pty.
- Session keepalive uses tmux (required).

## Navigation

- The activity bar includes Explorer and Hierarchy entries; the home logo returns to Agent Cells.
- Settings provides a lightweight dashboard with project summary, recent projects, and entry cards for Actions, Gates, and Softlinks.
- The docked sidebar supports resize/collapse and persists width state across launches.
- Agent Cells focuses on Cell management and offers jump links to Actions, Gates, and Softlinks.
- Agent Cells sidebar now includes an Explorer panel (Cell/Session scope + Flat/Tree views) for quick file open/reveal navigation.
- Hierarchy hosts configuration for Actions, App Shortcuts, Reply Quick Prompts, Session Naming, Gates, and Softlinks.
- Explorer provides a project file tree with git status (including added, untracked, ignored) and per-Cell change attribution.
- Explorer scopes to the active Agent Cell worktree (or repo root) and opens files in the workbench.
- Workbench breadcrumbs are segment-clickable and reveal/select the target inside Explorer tree (without invoking OS Finder reveal).
- Explorer supports filters (hidden/ignored/status), keyboard navigation, open/dirty indicators, and watch-based auto refresh.
- Explorer supports semantic-file tags and semantic filters (built-in + project rules from `.agency/agent-files.yaml`).
- Explorer semantic filters support quick-locate to jump to the first matching file.
- Explorer supports copy/cut/paste via context menu and keyboard shortcuts.
- Explorer can paste files or screenshots from the system clipboard, applying `-1` style conflict suffixes.
- Explorer supports Paste as Markdown, capturing clipboard content into `.agency/tmp/clipboard`.
- The workbench supports multi-tab previews, quick open, diff/blame toggles, media previews, and active-tab disk-change auto sync (auto-reload when clean, warning + reload when dirty).

## Unified File Interaction Direction

- File interaction is a system capability across Explorer, Agent Cells, Session Map, and Memo, not an Explorer-only local feature.
- The long-term goal is simultaneous success: keep core human operations and agent-driven workflows compatible instead of forcing one-sided trade-offs.
- Explorer remains the canonical execution hub for filesystem mutation; other surfaces route through a shared interaction contract.
- Agent Cells workbench open requests now run `open` intent validation before tab activation/reveal.
- Session Map hover-card shortcuts now support open/reveal and drag out as `text/plain` file payloads that route into Explorer import semantics.
- Memo/HIL comment anchors and draft references now support open/reveal and drag routing through the same Explorer import path.
- Explorer capabilities are being packaged as tool-capable interfaces so agent workflows can invoke the same safe path/permission/conflict logic.
- Tool-invoked file intents enforce caller metadata (`callerId`, `traceId`) and capability scopes (`file.read` / `file.write`).
- Agent semantic files (for example `Agency.md`, Spark conventions, and project-defined rules) are treated as first-class discoverability targets.
- Current authoritative design and rollout:
  - `openspec/changes/archive/2026-02-10-add-agent-centric-file-interaction-system/`
  - Follow-up evolution (active): `openspec/changes/update-agent-cells-embedded-explorer/`
  - `docs/notes-file-interaction-system.md`

## File Intent CLI (Gateway Wrapper)

- Run:
  - `pnpm -C apps/editor run file-intent:cli -- --help`
- JSON-in / JSON-out wrapper over unified gateway:
  - user mode (default): `{"intent":"open","targetPath":"README.md"}`
  - tool mode: `{"intent":"copy","sourcePath":"a.txt","targetPath":"b.txt","callerId":"agent-1","traceId":"trace-1","capabilities":["file.write"]}`
  - classify mode envelope: `{"mode":"classify","request":{"paths":["Agency.md"]}}`

## Memo Drawer Interactions

- Memo drawer shortcut cards are interactive capture surfaces and do not switch the main Memo panel when clicked.
- Use the explicit "View Records" action on a shortcut card to switch the main Memo inbox section.
- After a capture is confirmed and saved, the main Memo panel switches to the corresponding inbox section.
- Shortcut cards include Flash, Excerpt, and Screenshot captures.

## Cell Lifecycle Files

- Each worktree contains `.agency/cell-<worktree-name>.yaml`.
- The editor reads and updates lifecycle state through this file.
- Validation is minimal (temporary) and surfaces warnings only.

## Session Keepalive (tmux)

- tmux is required; session creation is blocked if tmux is missing.
- Each worktree stores a session registry at `.agency/sessions-<worktree-name>.yaml`.
- Each Cell can have multiple sessions; stale sessions are flagged when tmux is missing or detached.
- Sessions render as a tree under each Cell in Agent Cells; rows support reorder/reparent drag-and-drop and root-level promotion.
- Session nodes persist topology metadata (`parentSessionId`, `order`, `nodeKind`) to prepare for future fork/sub-terminal flows.
- Session row context menus can create typed child nodes for `Sub Terminal` and `Fork`.
- Detached sessions remain available from the overflow menu unless currently active; closed sessions can be restarted.
- Sessions can be renamed from the session context menu.
- On relaunch, the editor restores the last selected Cell and active session.
- The terminal toolbar includes zoom controls and an idle timer.
- Explorer surfaces session activity and idle duration for the selected Cell.
- Pasting into the terminal saves clipboard files/images into `.agency/tmp` and inserts their relative paths.
- Workbench actions allow submitting line comments with optional TODO flags, stored per worktree.
- Line comments are stored at `.agency/comments-<worktreeName>.yaml` inside each worktree.
- Line comments are added from the editor gutter (hover line number → plus → Comment) and previewed in the top-right list.

## Quick Actions

- Quick Actions are configured under Hierarchy -> Actions.
- Each action provides `startCommand` and optional `resumeCommand`.
- Definitions are stored in the editor user data directory as `quick-actions.json` (global scope).
- Project overrides live at `.agency/quick-actions.yaml` and can replace global actions with matching `id`.
- Agent overrides live at `.agency/quick-actions-<worktreeName>.yaml`.
- Actions resolve by scope order: Global -> Project -> Agent.
- Commands can be multi-line scripts executed line-by-line in the active session.

## Reply Quick Prompts

- Reply Quick Prompts are configured under Hierarchy -> Reply Quick Prompts.
- Prompt definitions are scoped as Global, Project, and Agent.
- Global prompts are stored as `reply-quick-prompts.json` in the editor user data directory.
- Project prompts are stored at `.agency/reply-quick-prompts.yaml`.
- Agent prompts are stored at `.agency/reply-quick-prompts-<worktreeName>.yaml`.
- Effective prompts resolve by ordered union + dedupe (Global -> Project -> Agent) using normalized prompt text.
- The Session Reply composer provides `快捷回复如何` near input controls and inserts the selected resolved prompt at the current cursor position.

## Gates

- Gates are configured under Hierarchy -> Gates.
- Gate definitions are grouped by stage: `draft`, `active`, and `archived`.
- Global gates live in the editor user data directory as `gates.yaml`.
- Project gates live at `.agency/gates.yaml` in the repo root.
- Agent gates live at `.agency/gates-<worktreeName>.yaml` in the worktree.
- Gates resolve by scope order: Global -> Project -> Agent, matching by `id`.
- Gate commands run line-by-line via `/bin/zsh -lc` from the repo root; empty/comment lines are skipped and failures block transitions to Active/Archived.
- Gate commands receive context in `AGENCY_CELL_NAME`, `AGENCY_WORKTREE_PATH`, and `AGENCY_LIFECYCLE_TARGET`.

## Softlinks (Local Directories)

- Softlink configuration lives at `.agency/worktree-links.yaml` in the repo root.
- Links define `source` (repo root) and `target` (worktree root) paths.
- The editor can link missing directories into a selected Cell with one click.
- Candidate discovery includes ignored or untracked directories (including nested directories detected by git).
- Auto-link can be enabled to apply links when new Cells are created.

## Runtime Logs

- Each editor launch writes logs to `logs/runtime/runtime-<timestamp>.log` at the repo root.
- The latest 20 runs stay in `logs/runtime`; older runs move to `logs/runtime/history`.
- Logs chunk automatically when they reach the size limit.

## Branch Naming

- When creating a new Cell, the branch name is generated as `<type>/<cell-name>`.
- Available types: `feat`, `refactor`, `fix`, `lint`, `chore`, `doc`.

## Project Selection

- If no project directory is configured, the editor opens Explorer with an empty-state prompt.
- Use **Select Project** to choose a repository for the current window.
- The app keeps one desktop instance and routes additional launches into that instance as new windows instead of relying on isolated parallel app processes.
- Recent projects are shown in the sidebar and Project settings when no project is open.
- New windows start without a project context; use recent projects to switch.

## Packaging & Install (macOS)

From `apps/editor`:

```bash
pnpm run package
```

Artifacts are written to `apps/editor/dist/release` (DMG + ZIP). Install by opening the DMG or unzipping the app and dragging `Agency.app` to `/Applications`.
Unsigned builds may require Gatekeeper bypass (right-click → Open once, or run `xattr -dr com.apple.quarantine /Applications/Agency.app`).
Packaging uses `TMPDIR=/tmp` to avoid `hdiutil` failures on some macOS setups.

From repo root:

```bash
make editor-package
```

For an unpacked build (no DMG), run:

```bash
pnpm run package:dir
```

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
- `AGENCY_RENDERER_URL="http://localhost:<port>"` (or `ELECTRON_RENDERER_URL`) load the renderer from a dev server (works for packaged builds too)
- `AGENCY_RENDERER_PORT=5183` override the preferred dev server port before fallback
- `AGENCY_RENDERER_PORT_FILE="/tmp/agency-editor-renderer.json"` override the dev server port file path

## Manual Verification

- Open Explorer, expand folders, and confirm the tree loads lazily with refresh support.
- Toggle Explorer filters (hidden/ignored/status) and confirm the tree updates accordingly.
- Toggle semantic filters and confirm only matching files (plus required ancestors) remain visible.
- Use arrow keys + Enter/F2 in Explorer to navigate, open files, and rename entries.
- Create, rename, delete, and drag/drop a file or folder from the Explorer view.
- Select a file in Explorer and confirm it opens in a workbench tab with line numbers and syntax highlighting.
- Click each segment in the workbench breadcrumb and confirm Explorer expands ancestors and focuses the matching node (no Finder popup).
- Double-click a file to pin its tab, drag tabs to reorder, and close tabs from the tab strip menu.
- Use Cmd/Ctrl+P to quick-open a file and confirm it opens as a preview tab.
- Toggle diff and blame on a modified file and confirm decorations/hover metadata appear.
- Edit an opened file on disk outside Agency and confirm the active tab auto-refreshes when clean, or shows a reload warning when the tab has unsaved edits.
- Open an image or PDF file and confirm media preview renders with zoom/fit controls.
- Switch the Explorer scope to another Cell and confirm the tree and workbench tabs reset per worktree.
- Modify a file in multiple worktrees, refresh Explorer, and confirm per-Cell badges appear.
- In Agent Cells sidebar Explorer panel, switch Cell/Session scope + Flat/Tree view and verify file rows can open/reveal into Explorer tree.
- Toggle "changes only" and verify clean files are filtered out.
- Open the editor with tmux installed, create a session, restart the editor, and confirm the session reattaches.
- Remove or stop a tmux session, refresh sessions, and verify the session shows as stale.
- Close a session, verify it appears under the overflow menu, and reopen it to create a new session.
- Drag a session before another session and confirm sibling order persists after refresh/relaunch.
- Drag a session onto another session and confirm it becomes a child node under that session.
- Drag a child session out toward an ancestor level and confirm it is promoted to that higher level.
- Open a session row context menu and create both `Sub Terminal` and `Fork`; confirm each appears as a child node with the correct kind badge.
- Add a quick action with both commands and verify start/resume run in the active session.
- Switch to Project or Agent actions, confirm inherited actions are read-only, and verify Override/Reset behavior.
- Configure reply quick prompts across multiple scopes, confirm resolved source badges in Hierarchy, and insert one from `快捷回复如何` in Session Reply composer.
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
