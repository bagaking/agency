# Manual Test Checklist

## Launch
- [ ] Start the renderer and main process with `npm run dev`.
- [ ] Verify the Agency window opens, renders the custom title bar, and shows the current project name or an empty-project label.
- [ ] Open a second window and confirm the title-bar app icon menu lists both windows and can switch focus between them.
- [ ] On macOS, confirm the Dock stays on the native/default menu path instead of an app-defined window list.
- [ ] On macOS, click the Dock icon while no editor window is focused and confirm an editor window is restored/focused.
- [ ] On macOS, with multiple editor windows already frontmost, repeatedly click the Dock icon and confirm focus advances through them in a stable order.
- [ ] Resize and move a window, relaunch the app, and confirm its geometry is restored.
- [ ] Quit the app with multiple project windows open, relaunch it normally, and confirm the previous window set restores.

## Cells
- [ ] Create a new Cell with a branch type + name and confirm the worktree directory is created.
- [ ] Reuse an existing worktree and confirm lifecycle file creation.
- [ ] Change lifecycle state and confirm the `.agency` file updates.

## Explorer
- [ ] Open Explorer, trigger `Open Research Lane`, and confirm the lane appears inline under the Explorer header instead of opening a separate browser surface.
- [ ] Inspect a public documentation URL and confirm the lane shows a bounded reader preview with source metadata and no tab/cookie/session UI.
- [ ] Save the inspected page as Markdown, confirm the chosen path stays inside the project, and verify `Open Saved` / `Reveal` route back through Workbench and Explorer.
- [ ] Create a memo citation from the same preview and confirm it enters the existing HIL/Memo flow; if a Markdown file was saved first, confirm the memo artifact carries that workspace reference.
- [ ] Enter a localhost/private URL and confirm reader inspect is rejected while the explicit system-browser escape hatch remains available for full browsing.

## Terminal
- [ ] Open a terminal session and verify output appears.
- [ ] Start CLI and confirm Codex (or stub) launches in the embedded terminal.
- [ ] Open Hierarchy -> Harness Providers, set `base_url`, `model`, and `OPENAI_API_KEY`, save, then restart the app process if needed and confirm the values persist.
- [ ] Reorder two session nodes in Agent Cells and confirm the new order persists after refresh.
- [ ] Drag a session onto another session and confirm it becomes a child node.
- [ ] Drag a child session out toward an ancestor level and confirm it is promoted to that higher level.
- [ ] Use the session row context menu to create `Sub Terminal` and `Fork` child sessions, confirm they appear under the selected parent, confirm `Sub Terminal` uses the shell profile, and confirm `Fork` starts an `agent_backed` `Create Agent` run through Commander instead of calling the session runtime gateway directly from renderer.
- [ ] With a Codex-backed profile, confirm `Fork` starts a child-execution `Create Agent` run and the bounded `session.tool-native-fork` specialization chooses one of the two valid outcomes:
  - true `smart_fork` via `session.runtime smart_fork`, or
  - `create_child` + `dispatch_input` to start a fresh child Codex session.
- [ ] With Session Map closed, trigger `Fork` and confirm the docked Session Map opens automatically into the right-side `Command Ops` zone.
- [ ] Trigger `Smart Fork [by commander]` and confirm a `Commander Task` sheet opens immediately, shows live timeline/activity while the run is in progress, and finishes with an explicit created-session result instead of silently succeeding in the background.
- [ ] Trigger `Smart Name [by commander]` and confirm it uses the same `Commander Task` sheet family as `Smart Fork`, with task-specific result content rather than a bespoke modal flow.
- [ ] In the Session Map dock, confirm the commander/backend avatar is visible at the far-right edge and clicking it opens a separate `Briefing` right-edge panel inside Session Map instead of replacing the right-side `Ops` panel.
- [ ] In `Briefing`, confirm the panel is bound to the current focus session/run, quick prompts work, typed questions return evidence-backed explanations, and `Cancel` / `Retry` / `Dismiss` actions route through the existing Harness/error flows.
- [ ] Close `Briefing` and confirm the underlying `Ops` panel is still readable, a running run can be cancelled, a failed/cancelled run can be retried, and run details can be copied.
- [ ] Produce output in a background session and confirm Agent Cells uses inline Cell / Session attention markers instead of a queue card above the list, while Session Map `Ops` still owns the `Priority Queue` and Status Bar `Next` remains clickable.
- [ ] Switch away from a session and back without meaningful new output, and confirm attach replay or silent refresh does not immediately mark it as `Unread`.
- [ ] Trigger a running child-execution attention state and confirm Agent Cells inline markers, Status Bar `Next`, and Session Map `Priority Queue` all use the same `Running` vocabulary without displacing the Agent Cells list.
- [ ] Trigger a failed attention state and confirm Agent Cells inline markers, Status Bar `Next`, and Session Map `Priority Queue` all use the same `Failed` vocabulary without introducing a second queue surface in Agent Cells.
- [ ] Create or load multiple Cells and confirm the `Cells` command-center area wraps them into multiple card columns instead of letting one Cell stretch across the full width.
- [ ] In the `Cells` area, confirm Cell title and state chip do not overlap, non-active tokens avoid noisy white borders, and the selected token is the clearest visual anchor in the group.
- [ ] Trigger a `Fork` failure case (for example source not running Codex or source still busy) and confirm the UI surfaces a structured error instead of silently creating a broken child session.
- [ ] Inspect the live or completed Harness run (CLI or IPC-driven debug surface) and confirm it exposes `runId`, step timeline, and capability-call records for the `Fork` specialization.
- [ ] Trigger a non-Harness session error and confirm the error stays visible in `Command Ops` until dismissed explicitly, and the full text can be copied.
- [ ] Cancel a long-running Harness run and confirm its status becomes `cancelled` without relying on raw logs.
- [ ] Resume a cancelled or failed Harness run and confirm completed steps stay recorded while the remaining work continues from the Harness state store.
- [ ] Close a session and confirm it moves to overflow; restore it and confirm topology metadata is preserved.

## Softlinks
- [ ] Open Softlinks view and confirm ignored/untracked candidates appear.
- [ ] Add a link for `.codex`, save, and link it into the selected Cell.
- [ ] Enable auto-link, create a new Cell, and verify links are created in the worktree.

## Gates
- [ ] Open Hierarchy -> Gates and add a failing Active gate.
- [ ] Attempt to switch a Cell to Active and confirm the transition is blocked until the gate passes.

## Validation
- [ ] Remove the spec folder and confirm warnings appear (temporary validation).
- [ ] Restore spec folder and confirm warnings clear after refresh.
- [ ] Run a pure Node smoke with `pnpm -C apps/editor run main-agent-harness:cli -- --action list --json '{"limit":5}'` and confirm the wrapper returns structured JSON without requiring an Electron renderer window.
