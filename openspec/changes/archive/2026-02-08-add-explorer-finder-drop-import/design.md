# Design: Finder-to-Explorer External Drag Import

## Context
Explorer currently supports internal drag operations by exchanging `application/agency-paths` payloads between rows. Finder-origin drags provide file-list payloads instead, so the current path ignores them.

This change introduces external drag import without changing existing internal drag semantics.

## Goals
- Support Finder drag import for both files and directories.
- Keep internal Explorer drag-move behavior unchanged.
- Ensure imports are copy-only and conflict-safe.
- Keep target resolution predictable for row and blank-area drops.

## Non-Goals
- Drag out from Explorer to Finder.
- Move semantics for external drops.
- New modal flows for conflict handling.

## Decisions

### Decision: Payload branch priority
- Internal drag payload (`application/agency-paths`) is handled first.
- If internal payload does not exist and `dataTransfer.files` exists, treat as external import.

Rationale:
- Prevents regressions in existing internal move behavior.

### Decision: Target resolution
- Drop on directory row: use that directory.
- Drop on file row: use file parent directory.
- Drop on blank list area:
  - focused directory => that directory
  - focused file => parent directory
  - no focus => explorer root

Rationale:
- Matches user expectation with deterministic fallback.

### Decision: Conflict behavior
- Never overwrite.
- Auto-rename with ` (n)` suffix, preserving file extension.

Rationale:
- Safe default for external imports with minimal user friction.

### Decision: Service execution
- Import work is executed in Electron service layer via validated IPC call.
- Service returns structured summary (`imported`, `skipped`, `failures`, `resolvedConflicts`).

Rationale:
- Keeps filesystem operations out of renderer and keeps IPC boundary explicit.

## Data Flow
1. Renderer receives drop event.
2. Renderer resolves payload branch (internal move vs external import).
3. External path list + target dir are sent to `window.agency.importExplorerEntries`.
4. Preload routes to `explorer:import`.
5. IPC handler validates payload and calls service `importEntries`.
6. Service copies sources recursively with conflict-safe target naming.
7. Renderer refreshes Explorer tree/status and shows concise failure summary when needed.

## Edge Cases
- Mixed valid/invalid sources: continue valid imports and report invalid failures.
- Source path equals resolved target path: skip safely.
- Target escapes explorer root: reject.
- Directory imports can be large: keep UI responsive with async operation and post-refresh.

## Risks and Mitigations
- Risk: DnD branch ambiguity.
  - Mitigation: deterministic branch order and strict MIME checks.
- Risk: path safety mistakes.
  - Mitigation: root-boundary checks in service before copy.
- Risk: import feels slow for large folders.
  - Mitigation: async operation + minimal UI feedback + partial result summary.
