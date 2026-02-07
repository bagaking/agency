## 1. Implementation
- [ ] 1.1 Add renderer drop routing for Finder payloads while preserving internal drag-move behavior
- [ ] 1.2 Add drop target resolution for row drops and blank-area drops (focused-dir fallback rules)
- [ ] 1.3 Add preload API: `importExplorerEntries`
- [ ] 1.4 Add IPC handler: `explorer:import` with input validation
- [ ] 1.5 Add explorer service import flow (copy files/folders recursively, conflict-safe naming, result summary)
- [ ] 1.6 Wire hook-level API (`importExternalEntries`) and refresh/status update behavior
- [ ] 1.7 Add concise user-facing error reporting for partial import failures
- [ ] 1.8 Add/extend tests for naming conflict resolution and import edge cases
- [ ] 1.9 Update OpenSpec deltas and validate

## 2. Verification
- [ ] 2.1 Manual: drag a Finder file onto a folder row and verify copied result
- [ ] 2.2 Manual: drag a Finder folder onto a folder row and verify recursive copy
- [ ] 2.3 Manual: drag onto blank Explorer area with focused file and verify target resolves to parent dir
- [ ] 2.4 Manual: drag onto blank Explorer area with no focus and verify target resolves to root
- [ ] 2.5 Manual: same-name import auto-renames without overwrite
- [ ] 2.6 Regression: internal Explorer drag-move still works as before
- [ ] 2.7 Validation: `openspec validate add-explorer-finder-drop-import --strict`
