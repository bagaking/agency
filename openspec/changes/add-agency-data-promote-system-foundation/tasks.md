## 1. Implementation
- [ ] 1.1 Add root workspace files and register `apps/*` + `pkg/*`.
- [ ] 1.2 Create `pkg/agency-data` TypeScript package and build scripts.
- [ ] 1.3 Add subpath export `@agency/agency-data/promote-system`.
- [ ] 1.4 Implement HIL repository with backward-compatible `.agency/hil` read/write.
- [ ] 1.5 Implement Action Sheet repository with backward-compatible `.agency/action-sheets` read/write.
- [ ] 1.6 Implement delivery audit repository under `.agency/delivery/events-<worktree>.jsonl`.
- [ ] 1.7 Implement promote-system use cases (`start`, `confirm`, `status`, `timeline`).
- [ ] 1.8 Refactor Electron `hil` and `actionSheets` services into thin facades calling package APIs.
- [ ] 1.9 Add main-process delivery facades and IPC handlers.
- [ ] 1.10 Expose delivery bridge methods in preload/renderer bridge.

## 2. Validation
- [ ] 2.1 Existing HIL index and draft files can be loaded without migration.
- [ ] 2.2 Existing action-sheet directories can be loaded and updated without data loss.
- [ ] 2.3 Delivery event log appends and timeline reads are stable.
- [ ] 2.4 Main-process facades stay thin (logic in package, not handler files).
- [ ] 2.5 Typecheck passes for renderer/electron/package.
