# Change: Add project settings and recent projects

## Why
Project selection needs a dedicated home and a reliable open action. When no project is open, users also need a clear list of recent repositories to resume work quickly.

## What Changes
- Add a Project settings view with a working Open Project action.
- Persist recent projects with key metadata and surface them in the left sidebar when no project is open.
- Allow opening a recent project from the list.

## Impact
- Affected specs: agency-editor
- Affected code: electron/services/projectRoot.js, renderer settings/sidebars, ui state persistence
