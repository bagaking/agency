# Change: Add Finder drag import into Explorer

## Why
Users expect Finder-to-Explorer drag and drop to import files and folders directly into the active project tree. The current Explorer drag path only handles in-app drags (`application/agency-paths`) and ignores external Finder payloads.

## What Changes
- Add external drag-drop import from Finder into Explorer rows and empty tree area.
- Keep existing internal Explorer drag-move behavior unchanged.
- Import by copy (never move source) for both files and folders (recursive).
- Resolve name conflicts with auto-rename (`name (1).ext`) instead of overwrite.
- Add target resolution rules for blank-area drops using current focused path.
- Add IPC and service support for secure external import execution and result reporting.

## Impact
- Affected specs: `agency-editor`
- Affected code:
  - `apps/editor/renderer/src/components/explorer/ProjectExplorerSidebar.jsx`
  - `apps/editor/renderer/src/hooks/useProjectExplorer.js`
  - `apps/editor/electron/preload.js`
  - `apps/editor/electron/ipc/handlers/explorer.js`
  - `apps/editor/electron/services/explorer.js`
- Risk:
  - Drag branch conflicts between internal and external payloads.
  - Large folder imports may feel slow.
- Mitigation:
  - Strict payload branch priority: internal MIME first, external files second.
  - Async copy and concise partial-failure summary in Explorer error surface.
