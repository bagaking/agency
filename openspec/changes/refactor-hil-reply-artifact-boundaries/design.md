## Context
Agency already has the right conceptual split in the top-level spec: HIL is an artifact surface for comments, memos, and drafts, while replies are session-bound artifacts and delivery is a dispatch artifact. The shipped code drifted from that model by reusing `hilRepository` as a convenient persistence seam for replies.

That shortcut produced three concrete problems:
- HIL kind space became open-ended, so spec-only constraints stopped being enforceable in code.
- Memo inbox started surfacing reply records even though reply history belongs to session context.
- Delivery metadata and source ownership are now partly modeled in `meta` blobs instead of explicit artifact contracts.

## Goals / Non-Goals
- Goals:
  - Re-establish HIL as a bounded repository with explicit kinds and validation.
  - Move reply persistence to a dedicated session-reply repository with explicit ownership.
  - Keep delivery unified across `promote`, `explorer`, and `session` sources without forcing all source artifacts into HIL storage.
  - Preserve existing user-facing quick-send behavior while making the underlying ownership model correct.
- Non-Goals:
  - Redesigning Session Reply UI information architecture from scratch.
  - Replacing HIL draft storage for delivery runs.
  - Building a new cross-project artifact index.

## Decisions
- Decision: HIL repository accepts only `comment`, `memo`, and `draft`.
  - Rationale: HIL is a bounded artifact family. Letting any caller mint arbitrary `kind` values defeats SSOT and makes the spec unenforceable.
- Decision: Session replies move to `.agency/session-replies/` with a worktree index plus session-owned artifact files.
  - Rationale: replies are owned by session context, so their storage tree should encode that ownership directly instead of hiding it inside `meta`.
- Decision: `source=session` deliveries reference reply artifacts with `system=reply`.
  - Rationale: delivery stays unified, but source artifact identity remains honest.
- Decision: Memo view removes reply inbox sections and returns to HIL-only content.
  - Rationale: Memo is the HIL surface; Session Reply history is already available in the owning session surface and should stay there.
- Decision: Repository APIs become typed and validation-heavy at the domain seam.
  - Rationale: renderer and IPC should not be allowed to invent storage schema ad hoc.

## Risks / Trade-offs
- Risk: introducing a second repository can look heavier than “just keep one YAML file”.
  - Mitigation: keep responsibilities crisp. HIL stores HIL. session-replies stores replies. Delivery still stays unified.
- Risk: existing reply records already persisted in HIL may become orphaned.
  - Mitigation: add one-way legacy import from HIL `reply` items into the session-reply repository and keep HIL readers from re-surfacing them afterward.
- Risk: multiple windows can still write to the same worktree-local artifact index.
  - Mitigation: tighten repository write paths now and add optimistic write-merge guards where practical instead of widening the generic bucket further.

## Migration Plan
1. Add OpenSpec delta and project-level docs clarifying HIL vs reply ownership.
2. Introduce session-reply repository and migrate renderer/electron reply flows onto it.
3. Restrict HIL repository kinds and move delivery session-source references to `system=reply`.
4. Remove reply rows from Memo/HIL surfaces and keep reply history in Session Reply only.
5. Import legacy HIL reply items into the new repository on read/write access and stop exposing them through HIL queries.
6. Run typecheck/unit coverage and update operator-facing docs/manual guidance.

## Alternatives Considered
- Alternative: keep replies inside HIL as `memo` with `meta.noteType=reply`.
  - Rejected because it still makes Memo/HIL the storage root for session-owned artifacts and weakens the meaning of HIL.
- Alternative: keep replies as `kind=reply` inside HIL but add validation.
  - Rejected because it preserves the same ownership error and only papers over it with better typing.
- Alternative: create one giant “artifact repository” for HIL, replies, and delivery.
  - Rejected because Agency’s object model is intentionally bounded; generic roots are cheaper short-term but make surfaces and storage drift together.
