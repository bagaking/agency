## Context
Delivery orchestration already exists in `pkg/agency-data/promote-system`, but renderer workflows still retain duplicated creation/status/consumption logic. In addition, session quick-dialog sends are functionally related to promotion delivery but are not persisted as unified delivery runs.

## Goals / Non-Goals
- Goals:
  - One runtime contract for Promote, Explorer, and session quick-dialog sends.
  - One persistence contract for delivery run records and audit events.
  - Explicit per-record session ownership metadata.
- Non-Goals:
  - Redesigning HIL UI information architecture.
  - Changing Action Sheet domain behavior for unrelated flows.

## Decisions
- Decision: Delivery source enum is expanded from `{promote, explorer}` to `{promote, explorer, session}`.
  - Rationale: Session quick-dialog dispatch is a delivery source and should be first-class in audit/reporting.
- Decision: Promote/Explorer renderer code calls delivery APIs instead of hand-building draft lifecycle transitions.
  - Rationale: Avoid drift and keep behavior in one domain module.
- Decision: Session quick-dialog send path persists delivery runs while preserving existing payload semantics (no forced input-behavior change).
  - Rationale: Keep UX stable while improving traceability.
- Decision: Canonical storage stays as HIL drafts + delivery JSONL timeline.
  - Rationale: Reuse existing package contracts; avoid migration-heavy new stores.

## Risks / Trade-offs
- Risk: Switching to package API can alter edge-case status timing.
  - Mitigation: keep quick-mode immediate confirm behavior and retain polling for gated status.
- Risk: session send behavior may regress if dispatch enter semantics change.
  - Mitigation: allow source-specific dispatch flags from request.

## Migration Plan
1. Extend package delivery source/dispatch options and metadata normalization.
2. Refactor Promote and Explorer hooks to call delivery API.
3. Integrate Session Reply send path as `source=session` quick delivery.
4. Run typechecks/tests and verify draft/audit persistence outputs.

## Open Questions
- None; this change keeps existing UI patterns and only converges runtime/storage behavior.
