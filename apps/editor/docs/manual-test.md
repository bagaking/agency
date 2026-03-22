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
- [ ] Use the session row context menu to create `Sub Terminal` and `Fork` child sessions and confirm they appear under the selected parent.
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
