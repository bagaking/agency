## 1. Contract
- [ ] 1.1 Add OpenSpec delta for HIL/reply ownership, HIL kind bounds, and session-reply storage.
- [ ] 1.2 Update project-facing docs (`AGENTS.md`, `openspec/project.md`, promotion notes) so the boundary survives future reset.

## 2. Domain
- [ ] 2.1 Refactor `hilRepository` to typed HIL-only contracts and legacy reply migration escape hatches.
- [ ] 2.2 Add `sessionReplyRepository` with explicit owner metadata, tree-aligned artifact storage, and one-way legacy HIL reply import.
- [ ] 2.3 Update promote-system so `source=session` references reply artifacts without treating them as HIL records.

## 3. Host + Renderer
- [ ] 3.1 Add dedicated Electron/IPC/bridge seams for session replies.
- [ ] 3.2 Migrate Session Reply history/create/archive flows onto the new seam.
- [ ] 3.3 Remove reply artifacts from Memo/HIL inbox surfaces and keep HIL UI HIL-only.

## 4. Verification
- [ ] 4.1 Add focused tests for repository and renderer/session-reply integration seams.
- [ ] 4.2 Run typecheck/build/test coverage for changed areas.
- [ ] 4.3 Update manual/operator docs to reflect the final behavior.
