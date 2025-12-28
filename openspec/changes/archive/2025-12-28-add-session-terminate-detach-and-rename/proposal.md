# Change: Add session detach and rename

## Why
Closing a session currently always terminates tmux, which is irreversible and unclear. Users also need human-readable session names to manage multiple sessions, a quick way to zoom terminal text to view more content per screen, and visibility into how long the terminal view has been idle.

## What Changes
- Add two distinct actions: Terminate (kill tmux) and Detach (close tab but keep tmux running).
- Make the tab close (X) default to Terminate; expose Detach in a context menu.
- Allow users to rename sessions and persist names in the registry.
- Add terminal zoom controls (zoom in/out/reset) to adjust session display density.
- Add an idle timer indicator that shows how long the terminal view has been unchanged.

## Impact
- Affected specs: `openspec/specs/agency-editor/spec.md`
- Affected code: session services, IPC handlers, session UI, terminal UI.
