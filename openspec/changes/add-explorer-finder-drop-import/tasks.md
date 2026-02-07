## 1. Implementation
- [x] 1.1 Add renderer drop routing for Finder payloads while preserving internal drag-move behavior
- [x] 1.2 Add drop target resolution for row drops and blank-area drops (focused-dir fallback rules)
- [x] 1.3 Add preload API: `importExplorerEntries`
- [x] 1.4 Add IPC handler: `explorer:import` with input validation
- [x] 1.5 Add explorer service import flow (copy files/folders recursively, conflict-safe naming, result summary)
- [x] 1.6 Wire hook-level API (`importExternalEntries`) and refresh/status update behavior
- [x] 1.7 Add concise user-facing error reporting for partial import failures
- [x] 1.8 Add/extend tests for naming conflict resolution and import edge cases
- [x] 1.9 Update OpenSpec deltas and validate

## 2. Verification
- [ ] 2.1 Manual: drag a Finder file onto a folder row and verify copied result
- [ ] 2.2 Manual: drag a Finder folder onto a folder row and verify recursive copy
- [ ] 2.3 Manual: drag onto blank Explorer area with focused file and verify target resolves to parent dir
- [ ] 2.4 Manual: drag onto blank Explorer area with no focus and verify target resolves to root
- [ ] 2.5 Manual: same-name import auto-renames without overwrite
- [ ] 2.6 Regression: internal Explorer drag-move still works as before
- [x] 2.7 Validation: `openspec validate add-explorer-finder-drop-import --strict`
