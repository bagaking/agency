# Manual Test Checklist

## Launch
- [ ] Start the renderer and main process with `npm run dev`.
- [ ] Verify the Agency Editor window opens and renders the header.

## Cells
- [ ] Create a new Cell with a branch type + name and confirm the worktree directory is created.
- [ ] Reuse an existing worktree and confirm lifecycle file creation.
- [ ] Change lifecycle state and confirm the `.agency` file updates.

## Terminal
- [ ] Open a terminal session and verify output appears.
- [ ] Start CLI and confirm Codex (or stub) launches in the embedded terminal.

## Worktree Links
- [ ] Open Worktree Links view and confirm ignored/untracked candidates appear.
- [ ] Add a link for `.codex`, save, and link it into the selected Cell.
- [ ] Enable auto-link, create a new Cell, and verify links are created in the worktree.

## Validation
- [ ] Remove the spec folder and confirm warnings appear (temporary validation).
- [ ] Restore spec folder and confirm warnings clear after refresh.
