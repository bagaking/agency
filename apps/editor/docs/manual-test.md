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

## Validation
- [ ] Remove the spec folder and confirm warnings appear (temporary validation).
- [ ] Restore spec folder and confirm warnings clear after refresh.
