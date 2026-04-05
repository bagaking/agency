# Manual Test Checklist

## Launch
- [ ] Start the renderer and main process with `npm run dev`.
- [ ] Verify the Agency window opens, renders the custom title bar, and keeps one centered context card for the active repository/home state instead of mixing window controls into the same text line.
- [ ] Open a brand-new empty window and confirm no `Session Action Failed` notice appears before a project is selected.
- [ ] Open a second window and confirm the left title-bar window switcher lists both windows, exposes `Create New Window`, and can switch focus between them without disturbing the centered project/home context card.
- [ ] On macOS, confirm the Dock stays on the native/default menu path instead of an app-defined window list.
- [ ] On macOS, click the Dock icon while no editor window is focused and confirm an editor window is restored/focused.
- [ ] On macOS, with multiple editor windows already frontmost, repeatedly click the Dock icon and confirm focus advances through them in a stable order.
- [ ] Resize and move a window, relaunch the app, and confirm its geometry is restored.
- [ ] Quit the app with multiple project windows open, relaunch it normally, and confirm the previous window set restores.

## Cells
- [ ] Create a new Cell with a branch type + name and confirm the worktree directory is created.
- [ ] Reuse an existing worktree and confirm a repo-owned Cell record is created under `.agency/cells/<cell-id>/cell.yaml`.
- [ ] Open Agent Cells in a repo that already has an unmanaged live worktree and confirm it appears under `Unmanaged Worktrees` instead of being auto-converted into a tracked Cell.
- [ ] From `Unmanaged Worktrees`, choose `Create Cell` and confirm the worktree becomes a tracked workspace without renaming its branch.
- [ ] For an unmanaged worktree with a deterministic detached-cell suggestion, confirm the row offers `Reattach <Cell Name>` and opens a reattach flow instead of forcing duplicate Cell creation.
- [ ] Use `Ignore For Now` on an unmanaged worktree and confirm it leaves the visible unmanaged list; then use `Reset ignored` and confirm it becomes visible again.
- [ ] Remove or detach a tracked Cell worktree, reopen Agent Cells, and confirm that Cell moves into `Detached Cells` rather than a lifecycle cleanup rail.
- [ ] In `Detached Cells`, confirm `missing` and `detached` Cells use different attachment copy, keep session/evidence counts visible, and route the primary action to `View Details`.
- [ ] Open a legacy archived record and confirm it appears only under `Legacy Archived`, with low-emphasis compatibility treatment rather than re-taking ownership of the default workspace rail.
- [ ] Restart with an attached Cell whose session registry is empty and confirm the window does not auto-create a `Default` session.
- [ ] In the empty terminal state for such a Cell, click `Create Session` and confirm a session is created only at that explicit step.
- [ ] Open `Create Cell` and confirm `Create Branch Worktree`, `Track Existing Worktree`, and `Track Existing Branch` are separate modes.
- [ ] In `Create New Branch`, choose `main` as the base branch even when the current/default startup branch differs, create a Cell, and confirm the new branch is based on `main`.
- [ ] In `Track Existing Branch`, select a user-created branch that does not follow the Agency naming prefix rules and confirm the Cell binds to that branch without renaming it.

## Explorer
- [ ] Enter a public URL into Explorer search and confirm a compact `Open Web` affordance appears without forcing an immediate mode switch.
- [ ] In Explorer, copy a file with `Cmd/Ctrl+C`, switch to another Finder-like destination or app that accepts file references, and confirm the clipboard now carries the copied file as a file reference rather than only an internal Explorer state.
- [ ] In Explorer, copy a file with `Cmd/Ctrl+C`, keep an unrelated file/image in the OS clipboard from earlier, then paste back into the same Explorer root and confirm Explorer pastes the just-copied Explorer selection rather than importing the stale external clipboard.
- [ ] In Explorer, cut a file with `Cmd/Ctrl+X`, paste within the same root, and confirm the file moves; then copy a file from another app and paste into Explorer to confirm external clipboard import still behaves as copy/import instead of move.
- [ ] Switch Explorer search mode to `URL`, launch a public URL, and confirm Workbench opens a bounded web research tab instead of Explorer replacing its primary panel.
- [ ] Switch Explorer to the `Changed` working-set view, then use `URL` mode and confirm the working-set surface stays visible while Workbench owns the bounded web tab.
- [ ] In the bounded web tab, confirm `View` / `Reader` host modes, browser controls (`Back`, `Forward`, `Reload`), and research actions (`Open in Browser`, `Save Markdown`, `Cite`) are visible and the surface reads as the true bounded browser view for that URL rather than a sidebar preview.
- [ ] Confirm the toolbar stays compact and visually layered: basic browser controls belong to the primary row, research actions belong to a quieter secondary row, and the remote page stays visually dominant.
- [ ] Open the bounded web tab with Explorer sidebar, Attention rail, and Comments drawer visible, then resize/toggle those rails and confirm the browser stays aligned inside the same Workbench browser lane instead of drifting under sibling shell chrome.
- [ ] Open a site that rejects iframe embedding (for example GitHub) and confirm `View` still renders it inside Agency instead of failing with an embed error.
- [ ] While staying in `View`, click an in-page link or redirect to another public URL and confirm the bounded research tab updates its address/title instead of drifting away from Workbench state.
- [ ] Click `Open in Browser` from the bounded web tab and confirm the system browser opens the same URL, proving the explicit escape path works instead of adding general browser tabs inside Workbench.
- [ ] Save the inspected page as Markdown, confirm the chosen path stays inside the project, the saved file contains fixed `agency_source_*` frontmatter, and Workbench automatically focuses that Markdown file.
- [ ] Reopen a Markdown file carrying bounded-web source frontmatter and confirm Workbench enters markdown + preview mode, with the preview side showing `Overwrite Markdown`.
- [ ] Create a memo citation from the same preview and confirm it enters the existing HIL/Memo flow; if a Markdown file was saved first, confirm the memo artifact carries that workspace reference.
- [ ] Enter a localhost/private URL and confirm reader inspect is rejected while the explicit system-browser escape hatch remains available for full browsing.

## Workbench Highlighting
- [ ] Add `.agency/workbench.yaml` with a language rule such as `Tiltfile -> python`, open the matching file in Workbench, and confirm the editor language follows the project rule instead of builtin fallback.
- [ ] Use a root-level glob rule such as `**/*.env.local -> dotenv`, open both `.env.local` and `config/.env.local`, and confirm both resolve through the same project rule.
- [ ] Break `.agency/workbench.yaml` with invalid YAML, reopen or refresh the affected file, and confirm Workbench falls back safely instead of crashing or silently treating the broken policy as a valid rule set.
- [ ] Open a text-capable file, use the Workbench language control to set a local override, and confirm the control source changes to `Local Override` while the repo policy file stays untouched.
- [ ] Reset the same file override and confirm the control falls back to `Project Rule` or builtin detection as appropriate.
- [ ] Open the same repository in a second window and confirm the first window's local override does not leak into the second window automatically.
- [ ] Open an image, PDF, or unknown-file warning view and confirm Workbench does not show the language control there.

## Terminal
- [ ] With no project selected, confirm Explorer and Agent Cells both show the same `Project Home` state instead of a fake local Cell/session row.
- [ ] On no-project startup, confirm the right-side attention rail and HIL drawer do not auto-expand over `Project Home`.
- [ ] On no-project startup, confirm Status Bar does not surface `Next` attention or Session Map controls that imply Project/Session context.
- [ ] In the no-project state, confirm the main Project Home surface reads as one primary repository-selection surface plus one lower-noise window-scope summary rather than a generic dashboard split.
- [ ] In the no-project state, click `Start Home Shell` and confirm an interactive shell opens from the user home directory and the window-scope summary continues to describe it as window-owned rather than repo-backed.
- [ ] While the no-project home shell is open, confirm no repo-backed Cell/session records are created and no Cell/session affordances appear.
- [ ] Switch between Explorer and Agent Cells while still in the no-project state and confirm the shared `Project Home` surface stays coherent without reopening right-side shell chrome.

## Chrome Grammar
- [ ] In the title bar, confirm `Open/Switch Project` stays the single project action on the right while the left-side window cluster owns multi-window controls.
- [ ] In Explorer, confirm the header foregrounds the active root and low-noise summary chips (`View`, `Scope`, filter state) without reintroducing redundant subtitle text.
- [ ] In Settings, confirm the top area reads as a workspace summary first: repository identity, runtime status, and config scope are legible before the action-card grid.
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
- [ ] In the Session Map dock, confirm the right side behaves as one station: the default mode is `Ops`, the commander affordance is visible in that station, and clicking it switches the same station into `Briefing` mode.
- [ ] In `Briefing`, confirm the panel is bound to the current focus session/run, quick prompts work, typed questions return evidence-backed explanations, and `Cancel` / `Retry` / `Dismiss` actions route through the existing Harness/error flows.
- [ ] Close `Briefing` and confirm the same right-side station returns to `Ops` with its prior evidence state intact; a running run can still be cancelled, a failed/cancelled run can still be retried, and run details remain copyable.
- [ ] Produce output in a background session and confirm Agent Cells uses inline Cell / Session attention markers instead of a queue card above the list, while the shell right-side `Priority Queue` owns the window-level attention flow and Status Bar `Next` remains clickable.
- [ ] Switch away from a session and back without meaningful new output, and confirm attach replay or silent refresh does not immediately mark it as `Unread`.
- [ ] Trigger a running child-execution attention state and confirm Agent Cells inline markers, Status Bar `Next`, and the shell right-side `Priority Queue` all use the same `Running` vocabulary without displacing the Agent Cells list.
- [ ] Trigger a failed attention state and confirm Agent Cells inline markers, Status Bar `Next`, and the shell right-side `Priority Queue` all use the same `Failed` vocabulary without introducing a second queue surface in Agent Cells.
- [ ] Trigger `Unread`, `Running`, `Failed`, `Confirm`, `Review`, and cross-window attention cases, hover or focus Status Bar `Next`, and confirm the tooltip preserves the shared state vocabulary while also naming the real jump destination.
- [ ] Trigger a `Running` or `Failed` attention case that routes to evidence, hover `Next`, and confirm the tooltip explicitly says `Open evidence in Session Map`.
- [ ] In Agent Cells, open and close `Session Reply Relay` from the bottom entry on the shared right-edge launcher rail, and confirm the window still has one launcher spine while `Reply` remains a session-bound surface.
- [ ] Create or load multiple Cells and confirm the `Cells` command-center area wraps them into multiple card columns instead of letting one Cell stretch across the full width.
- [ ] In the `Cells` area, confirm Cell title and state chip do not overlap, non-active tokens avoid noisy white borders, and the selected token is the clearest visual anchor in the group.
- [ ] Trigger a `Fork` failure case (for example source not running Codex or source still busy) and confirm the UI surfaces a structured error instead of silently creating a broken child session.
- [ ] Inspect the live or completed Harness run (CLI or IPC-driven debug surface) and confirm it exposes `runId`, step timeline, and capability-call records for the `Fork` specialization.
- [ ] Trigger a non-Harness session error and confirm the error stays visible in `Command Ops` until dismissed explicitly, and the full text can be copied.
- [ ] Cancel a long-running Harness run and confirm its status becomes `cancelled` without relying on raw logs.
- [ ] Resume a cancelled or failed Harness run and confirm completed steps stay recorded while the remaining work continues from the Harness state store.
- [ ] Close a session and confirm it moves to overflow; restore it and confirm topology metadata is preserved.

## Hierarchy
- [ ] Open Hierarchy -> Actions and confirm the capability-first layout with a page-level scope selector (Global / Project / Agent); project scope remains editable without a selected Cell while Agent scope stays disabled until a Cell is selected.
- [ ] Open Hierarchy -> App Shortcuts and Session Naming and confirm both pages use the same page-level scope selector contract as Actions/Replies rather than falling back to a bespoke local layout.
- [ ] While in Project scope, update a Terminus profile/binding on Actions or a prompt on Reply Quick Prompts and save, then verify `.agency/terminus-settings.yaml` or `.agency/reply-quick-prompts.yaml` at the repo root reflects the change even though no Cell is selected.
- [ ] While in Project scope, update an app shortcut or session naming rule and save, then verify `.agency/app-shortcuts.yaml` or `.agency/session-naming.yaml` at the repo root reflects the change even though no Cell is selected.
- [ ] Select a Cell, switch to Agent scope on a capability page (e.g., Actions or Reply Quick Prompts), make an edit, save, and verify the change is persisted under `.agency/cells/<cell-id>/terminus-settings.yaml` or `.agency/cells/<cell-id>/reply-quick-prompts.yaml`.
- [ ] With a selected Cell, edit Agent-scoped App Shortcuts or Session Naming, save, then verify the change persists under `.agency/cells/<cell-id>/app-shortcuts.yaml` or `.agency/cells/<cell-id>/session-naming.yaml`.
- [ ] Select Project scope on Actions, switch away, then return to Actions and confirm that page restores Project scope; repeat with a different scope on App Shortcuts or Session Naming and confirm each capability remembers its own last scope independently.
- [ ] With no Cell selected, attempt to choose Agent scope on a capability page and confirm the UI keeps the scope disabled and prompts to select a Cell before edits are allowed.
- [ ] Remove or detach a Cell worktree after saving Agent-scoped Hierarchy settings, reopen Hierarchy for the same project/Cell context, and confirm Project scope still resolves from repo-root `.agency/` while Agent scope still targets `.agency/cells/<cell-id>/...` rather than disappearing with the old worktree.

## Softlinks
- [ ] Open Softlinks from Hierarchy and confirm it remains a repo-level page without the Global / Project / Agent scope selector.
- [ ] Open Softlinks view and confirm ignored/untracked candidates appear.
- [ ] Add a link for `.codex`, save, and link it into the selected Cell.
- [ ] Enable auto-link, create a new Cell, and verify links are created in the worktree.

## Validation
- [ ] Open a repository with no `openspec/` directory and confirm worktree discovery, Cell creation/binding, and session startup still work without core spec-missing warnings.
- [ ] Run a pure Node smoke with `pnpm -C apps/editor run main-agent-harness:cli -- --action list --json '{"limit":5}'` and confirm the wrapper returns structured JSON without requiring an Electron renderer window.
