# Manual Test Checklist

## Launch
- [ ] Start the renderer and main process with `npm run dev`.
- [ ] Verify the Agency window opens and renders the header.

## Cells
- [ ] Create a new Cell with a branch type + name and confirm the worktree directory is created.
- [ ] Reuse an existing worktree and confirm lifecycle file creation.
- [ ] Change lifecycle state and confirm the `.agency` file updates.

## Terminal
- [ ] Open a terminal session and verify output appears.
- [ ] Start CLI and confirm Codex (or stub) launches in the embedded terminal.
- [ ] Reorder two session nodes in Agent Cells and confirm the new order persists after refresh.
- [ ] Drag a session onto another session and confirm it becomes a child node.
- [ ] Drag a child session out toward an ancestor level and confirm it is promoted to that higher level.
- [ ] Use the session row context menu to create `Sub Terminal` and `Fork` child sessions, confirm they appear under the selected parent, confirm `Sub Terminal` uses the shell profile, and confirm `Fork` starts a Harness run instead of calling the session runtime gateway directly from renderer.
- [ ] With the default `codex` Terminus profile, confirm `Fork` starts a Harness `Create Agent` run, waits for the source session to become idle, issues `/fork` in the source session, creates a child session, launches the child with the rendered `launchTemplate`, and selects the child when Codex is ready.
- [ ] Trigger a `Fork` failure case (for example source not running Codex or source still busy) and confirm the UI surfaces a structured error instead of silently creating a broken child session.
- [ ] Inspect the live or completed Harness run (CLI or IPC-driven debug surface) and confirm it exposes `runId`, step timeline, and capability-call records for the `Fork` specialization.
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
