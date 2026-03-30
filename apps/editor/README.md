# Agency

## Scope & Stack

- v0.2 targets macOS first while keeping a path open for cross-platform support.
- Agency uses a single desktop app instance with multiple independent editor windows.
- Normal relaunch restores the previous editor window set and each window's saved geometry when no explicit target repo is provided.
- Electron + React + Tailwind CSS + Rive (animation placeholder).
- Embedded terminal via xterm.js and node-pty.
- Session keepalive uses tmux (required).

## Canonical Object Model

- Canonical domain objects are `App -> Window -> Project -> Cell -> Session -> Run`.
- `Agent Cells`, `Explorer`, `Workbench`, `Session Map`, `Hierarchy`, `Memo`, and `Commander` are product surfaces over those objects, not competing object roots.
- `Create Cell` means worktree-bound workspace creation.
- `Create Agent` means bounded child execution owned by a host run.
- `Fork` is a specialized `Create Agent` strategy, not the baseline workspace or execution noun.
- `Commander` is one bounded operator capability; in Session Map, `Ops` is the evidence rail and `Briefing` is the reveal panel in the same station.
- Attention is a shared state layer over `Window / Cell / Session / Run`, not a new product root. Its job is to route users toward the next object that needs intervention.

## Navigation

- The activity bar includes Explorer and Hierarchy entries; the home logo returns to Agent Cells.
- The custom title bar shows the current project name, exposes `Open/Switch Project`, and uses the app icon as a window switcher / new-window launcher.
- Settings provides a lightweight dashboard with project summary, recent projects, and entry cards for Actions, Gates, and Softlinks.
- The docked sidebar supports resize/collapse and persists width state across launches.
- Agent Cells focuses on Cell management and offers jump links to Actions, Gates, and Softlinks.
- Agent Cells sidebar now includes an Explorer panel (Cell/Session scope + Flat/Tree views) for quick file open/reveal navigation.
- Hierarchy hosts configuration for Actions, App Shortcuts, Reply Quick Prompts, Session Naming, Gates, and Softlinks.
- Explorer provides a project file tree with git status (including added, untracked, ignored) and per-Cell change attribution.
- Explorer scopes to the active Cell worktree (or repo root) and opens files in the workbench.
- Workbench breadcrumbs are segment-clickable and reveal/select the target inside Explorer tree (without invoking OS Finder reveal).
- Explorer supports descriptor-driven filters (hidden/ignored/changes/status/semantic), keyboard navigation, open/dirty indicators, and watch-based auto refresh.
- Explorer distinguishes path search from cross-file content search; content search returns line-level evidence, rejects invalid folder/selection scopes, and only replaces explicitly confirmed targets.
- Explorer supports semantic-file tags and semantic filters (built-in + project rules from `.agency/agent-files.yaml`).
- Explorer semantic filters support quick-locate to jump to the first matching file.
- Explorer promotes `Changed Files` into a registered working-set view and keeps room for future working-set families.
- Explorer supports project-level defaults, working-set option ordering, and command visibility from `.agency/explorer.yaml` / `.agency/explorer.yml` without overriding user-local persisted state.
- Explorer supports copy/cut/paste via context menu and keyboard shortcuts.
- Explorer can paste files or screenshots from the system clipboard, applying `-1` style conflict suffixes.
- Explorer supports Paste as Markdown, capturing clipboard content into `.agency/tmp/clipboard`.
- Explorer includes a bounded research lane for public URL inspection, reader preview, workspace Markdown save, memo citation with optional saved-file references, and an explicit system-browser escape hatch.
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
- Research lane stays subordinate to Explorer/file workflow: reader previews save through the existing workbench write path, citations reuse HIL memo artifacts, and full browsing still escapes to the system browser.
- Current authoritative design and rollout:
  - `openspec/changes/archive/2026-02-10-add-agent-centric-file-interaction-system/`
  - Follow-up evolution (delivered): `openspec/changes/archive/2026-02-16-update-agent-cells-embedded-explorer/`
  - `docs/notes-file-interaction-system.md`

## File Intent CLI (Gateway Wrapper)

- Run:
  - `pnpm -C apps/editor run file-intent:cli -- --help`
- JSON-in / JSON-out wrapper over unified gateway:
  - user mode (default): `{"intent":"open","targetPath":"README.md"}`
  - tool mode: `{"intent":"copy","sourcePath":"a.txt","targetPath":"b.txt","callerId":"agent-1","traceId":"trace-1","capabilities":["file.write"]}`
  - classify mode envelope: `{"mode":"classify","request":{"paths":["Agency.md"]}}`

## Unified Control Bus (Canonical Local Automation Surface)

- Run:
  - `pnpm -C apps/editor run control-bus:cli -- --json '{"op":"window.list"}'`
- The control bus is the canonical local automation surface over existing host-owned capability seams.
- It is local-only in v1 and talks to the running Agency app over a local socket.
- Shared envelope:
  - `op`: namespaced operation id such as `window.list`, `file.intent`, `session.perform`, `run.start`
  - `refs`: canonical object refs (`windowStateId`, `projectRoot`, `cellId`, `sessionId`, `runId`)
  - `args`: operation-specific payload
  - `caller`: caller metadata (`callerType`, `callerId`, `traceId`)
- First shipped operation families:
  - `project.get`
  - `cell.list`
  - `session.list`
  - `window.list` / `window.new` / `window.focus`
  - `file.intent` / `file.tool_intent` / `file.classify`
  - `session.perform`
  - `run.start` / `run.inspect` / `run.cancel` / `run.resume` / `run.list`
- Existing seam-specific CLIs remain valid as thin wrappers over their individual host seams, but the control bus is now the preferred external automation entrypoint.

## Session Runtime CLI (Gateway Wrapper)

- Run:
  - `pnpm -C apps/editor run session-runtime:cli -- --json '{"intent":"inspect","worktreePath":".","sessionId":"default"}'`
- JSON-in / JSON-out wrapper over the host-owned session runtime gateway:
  - inspect: `{"intent":"inspect","worktreePath":".","sessionId":"default"}`
  - smart fork: `{"intent":"smart_fork","worktreePath":".","cellId":"cell-1","sessionId":"source","callerType":"tool","callerId":"negotiator"}`
- The wrapper stays transport-thin so renderer, CLI, and future host-side harness callers can share the same runtime contract.

## Main Agent Harness CLI (Control Plane Wrapper)

- Run:
  - `pnpm -C apps/editor run main-agent-harness:cli -- --action start --json '{"goal":{"type":"create_agent"},"requestedCapabilities":["session.runtime"],"runner":{"adapterId":"agent_backed","providerId":"codex_cli","steps":[{"id":"create-agent","kind":"create_agent","skillPackId":"session.tool-native-fork","agent":{"strategy":"tool_native_fork","sessionRuntime":{"worktreePath":".","cellId":"cell-1","sessionId":"source"}}}]}}'`
- JSON-in / JSON-out wrapper over the host-owned Harness control plane:
  - start: `--action start` with structured goal + runner steps
  - inspect: `--action inspect --json '{"runId":"run-..."}'`
  - cancel: `--action cancel --json '{"runId":"run-...","reason":"user-requested"}'`
  - resume: `--action resume --json '{"runId":"run-..."}'`
- The Harness is the control plane: it owns `runId`, timeline, inspect/cancel/resume, and capability-call records, while session/file side effects still route through host-managed capabilities.
- The production default is `agent_backed` with `codex_cli`; `reference` now lives under `testOnly/` and should only be used for tests/debugging.
- Global provider settings now live in Hierarchy -> Harness Providers. The first productized slice is global-only and configures `codex_cli` with:
  - required: `base_url`, `model`, `OPENAI_API_KEY`
  - optional: `model_reasoning_effort`, `model_context_window`, `model_auto_compact_token_limit`
- This settings surface is the preferred product path for provider credentials/config. Terminus profiles still own session launch/fork semantics, but not Harness provider credentials.

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
- Session row context menus can create typed child nodes for `Sub Terminal` and `Fork`; `Sub Terminal` always uses the shell baseline profile.
- `Create Agent` is the primary host semantic for child execution. The first control-plane implementation is the Main Agent Harness: it owns `runId`, step timeline, capability-call records, and `start / inspect / cancel / resume` lifecycle while delegating real side effects to host-managed capabilities.
- Agent Cells `Fork` is now a Harness-driven `Create Agent` specialization instead of a renderer-local smart-fork shortcut. The renderer starts an `agent_backed` run with the bounded `session.tool-native-fork` skill pack, and the default Codex provider returns a structured capability decision.
- Tool-native `Fork` remains a specialization, not the Harness core model. The default specialization can either:
  - choose a true `session.runtime smart_fork` path when host facts prove it is supported, or
  - choose `create_child` + `dispatch_input` to start a fresh child agent when true fork semantics are unavailable.
- The docked Session Map now promotes its right-side info panel into a stable `Ops` rail, while `Commander` opens a separate bounded `Briefing` panel for backend-facing explanation, recommendation, and approved actions.
- Session action failures no longer rely only on transient notices; `Command Ops` keeps the latest error visible until explicitly dismissed and supports copying the full text.
- Attention now uses one vocabulary across shell chrome, Agent Cells, and Session Map: `Running`, `Failed`, `Confirm`, `Unread`, and `Review`.
- The status bar shows the current top-priority attention item for the active Agency context and can jump directly to its owning object.
- Session Map `Ops` owns the current-window `Priority Queue` for queue-style attention triage.
- `Priority Queue` stays summary-first; long errors and timeline payloads belong in the evidence area below instead of expanding queue rows into log cards.
- `Unread` is reserved for meaningful post-visit output; transient blur, attach replay, or silent refresh noise should not flip a session into `Unread` immediately.
- Agent Cells keeps attention inline on Cell and Session affordances instead of inserting a separate attention queue above the management list.
- The window switcher surfaces each window's primary attention summary so multi-window urgency is visible before you manually scan that window.
- Terminus profiles can define optional `fork` settings (`enabled`, `driver`, `launchTemplate`, and timeout knobs) so tool-specific fork behavior stays declarative at the profile layer instead of being hard-coded in renderer UI.
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
- Clicking the custom title-bar app icon opens a window switcher for the currently open editor windows and also exposes `New Window`.
- On macOS, Agency stays on the native/default Dock menu path instead of replacing it with an app-defined window list.
- On macOS, Dock activation restores a meaningful editor window; when multiple editor windows are already frontmost, repeated Dock activation advances through them in a stable order.
- The custom title bar always shows the active window's current project name (or an empty-project label).
- Recent projects are shown in the sidebar and Project settings when no project is open.
- New windows start without a project context; use recent projects to switch.
- On relaunch without an explicit target repository, Agency restores the last open editor window set and each window's saved geometry.

## Packaging & Install (macOS)

From `apps/editor`:

```bash
pnpm run package
```

Artifacts are written to `apps/editor/dist/release` (DMG + ZIP). Install by opening the DMG or unzipping the app and dragging `Agency.app` to `/Applications`.
Unsigned builds may require Gatekeeper bypass (right-click → Open once, or run `xattr -dr com.apple.quarantine /Applications/Agency.app`).
Packaging uses `TMPDIR=/tmp` to avoid `hdiutil` failures on some macOS setups.
Packaging now runs a disk-space preflight before build/sign/DMG work. If free space is below the safe threshold, the preflight first deletes stale generated outputs under `apps/editor/dist/release` that would be overwritten by the current mode, then fails fast with cleanup guidance instead of spending minutes before `hdiutil` errors.

From repo root:

```bash
make editor-package
```

To remove all generated `apps/editor/dist` outputs before retrying packaging, run:

```bash
make editor-package-clean
```

For a lower-peak local DMG build (DMG only, no ZIP), run:

```bash
make editor-package-lite
```

For an unpacked build (no DMG), run:

```bash
pnpm run package:dir
```

Optional overrides:
- `AGENCY_PACKAGE_DMG_MIN_FREE_GIB=4` override the DMG packaging free-space threshold
- `AGENCY_PACKAGE_LITE_MIN_FREE_GIB=3` override the DMG-only packaging free-space threshold
- `AGENCY_PACKAGE_DIR_MIN_FREE_GIB=2` override the unpacked packaging free-space threshold

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

Governed repo-authored source under `apps/`, `pkg/`, and `scripts/` is TypeScript-only.
Validate that rule from the repo root with:

```bash
pnpm run check:governed-js
```

Validate the renderer boot bundle budget from `apps/editor` with:

```bash
pnpm run check:renderer-bundle-budget
```

`pnpm run build:renderer` now runs this budget check automatically after the Vite build.

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
- `AGENCY_CONTROL_BUS_SOCKET_PATH="/tmp/agency-control-bus.sock"` override the unified local control-bus socket path
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
- Open `Research Lane` from Explorer, inspect a public URL, and confirm the lane shows a reader preview instead of a tabbed browser.
- Save a research capture as Markdown and confirm the file stays inside the project, then use the lane's `Open Saved` / `Reveal` actions to land back in Workbench/Explorer.
- Create a memo citation from the same research capture and confirm it enters the existing HIL/Memo flow rather than a research-only dispatch path.
- Try a localhost/private URL and confirm reader inspect is rejected while the explicit system-browser escape hatch remains visible.
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
- Open a session row context menu and create both `Sub Terminal` and `Fork`; confirm each appears as a child node with the correct kind badge, confirm `Sub Terminal` uses the shell profile, and confirm `Fork` starts an `agent_backed` `Create Agent` run through Commander rather than calling session runtime directly from renderer.
- For a Codex-backed profile, confirm `Fork` produces a child-execution `Create Agent` run with timeline/capability records and either:
  - chooses a true `smart_fork` path that issues `/fork` and launches the rendered child command, or
  - chooses `create_child` + `dispatch_input` and starts a fresh child Codex session when true fork semantics are not available.
- Use the Harness CLI or IPC inspect surface on a live run and confirm you can inspect step timeline, cancel a still-running run, and resume a cancelled/failed run without guessing from raw logs.
- With Session Map closed, trigger `Fork` and confirm the docked Session Map opens automatically to expose the `Command Ops` area.
- Trigger `Smart Fork [by commander]` and confirm a `Commander Task` sheet opens immediately, shows live progress/timeline while the run is active, and ends with a created-session result instead of silently completing in the background.
- Trigger `Smart Name [by commander]` and confirm it uses the same `Commander Task` sheet family as `Smart Fork`, with rename suggestions as the task-specific result.
- In the Session Map dock, confirm the commander/backend avatar is visible, clicking it opens a separate `Briefing` panel, and the panel answers using current session/run evidence rather than generic chat filler.
- Close the `Briefing` panel and confirm the underlying `Ops` panel is unchanged; inspect the active Harness timeline there and confirm a running run can be cancelled or a failed/cancelled run can be retried from the panel.
- Trigger a session error and confirm it appears in `Command Ops`, does not auto-dismiss on a timer, and can be copied before explicit dismissal.
- Produce new output in a non-active session and confirm Agent Cells inline cell/session markers, Session Map `Ops`, and the status bar all surface `Unread` with consistent wording; click any of them and confirm Agency jumps back to that session.
- Switch away from a session and back without meaningful new output, and confirm it does not immediately become `Unread` just because of transient blur, attach replay, or silent refresh noise.
- Trigger `Smart Fork [by commander]` or another `Create Agent` run and confirm Agent Cells keeps the list primary while exposing inline `Running`, the status bar shows `Running`, and Session Map `Ops` owns the queue-style triage path.
- Trigger a failed child-execution run and confirm Agent Cells inline markers, Session Map `Priority Queue`, and the status bar all surface the same `Failed` attention without introducing a separate Agent Cells queue card.
- Finish a child-execution run that creates a child session, do not revisit that child, and confirm Agency surfaces `Review` / return-required attention until the child session is visited.
- Open a second Agency window, create a higher-priority failure there, and confirm the current window's switcher surfaces that other window's primary attention state before you focus it.
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
